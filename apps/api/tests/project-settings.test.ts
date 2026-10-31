import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import type { Request, Response, NextFunction } from "express";
import { createProjectSchema } from "@rinia/shared";
import { db } from "../src/db";
import { projectKeyAliases, projects } from "../src/db/schema";
import { createProject, updateProject } from "../src/features/projects/projects.service";
import { isProjectKeyConflict } from "../src/features/projects/project-key";
import { HttpError } from "../src/lib/http-error";
import { requireProjectOwner } from "../src/middleware/project-membership.middleware";

// Stub the database boundary: these tests never connect to or mutate a development database.
afterEach(() => mock.restoreAll());
const collision = { code: "23505", constraint: "projects_issue_key_unique" };
const creatorId = "creator";
const mockReservedKeys = (aliases: Array<{ key: string; projectId: string }> = []) => {
    mock.method(db.query.projectKeyAliases, "findMany", async () => aliases as never);
    mock.method(db.query.projectKeyAliases, "findFirst", async () => aliases[0] as never);
};
const mockProjectCreator = () => {
    mockReservedKeys();
    return mock.method(db.query.users, "findFirst", async () => ({ locale: "en" }) as never);
};

test("creation accepts a custom key, normalizes it, and keeps old clients compatible", () => {
    assert.equal(createProjectSchema.parse({ name: "My project", issueKey: " api2 " }).issueKey, "API2");
    assert.equal(createProjectSchema.parse({ name: "My project" }).issueKey, undefined);
    assert.equal(createProjectSchema.parse({ name: "My project", issueKey: "" }).issueKey, undefined);
    for (const issueKey of ["A", "ABCDEFGHI", "API-X", "API X", "💙"]) {
        assert.equal(createProjectSchema.safeParse({ name: "My project", issueKey }).success, false, issueKey);
    }
});

test("project appearance validates custom icons and remote covers while keeping legacy icon clients", () => {
    assert.deepEqual(createProjectSchema.parse({ name: "My project", icon: "rocket" }).icon, "rocket");
    assert.equal(createProjectSchema.safeParse({ name: "My project", iconAppearance: { type: "emoji", value: "🧠" } }).success, true);
    assert.equal(createProjectSchema.safeParse({ name: "My project", iconAppearance: { type: "image", url: "https://images.example.test/logo.svg" }, cover: { type: "gradient", key: "aurora" } }).success, true);
    assert.equal(createProjectSchema.safeParse({ name: "My project", iconAppearance: { type: "icon", key: "rocket", color: "#0097ff" } }).success, true);
    assert.equal(createProjectSchema.safeParse({ name: "My project", iconAppearance: { type: "icon", key: "rocket", color: "blue" } }).success, false);
    assert.equal(createProjectSchema.safeParse({ name: "My project", iconAppearance: { type: "icon", key: "unknown" } }).success, false);
    assert.equal(createProjectSchema.safeParse({ name: "My project", cover: { url: "https://images.example.test/banner.jpg", position: { x: 50, y: 50 } } }).success, false);
    assert.equal(createProjectSchema.safeParse({ name: "My project", cover: { type: "gradient", key: "unknown" } }).success, false);
});

test("custom key is persisted verbatim without querying automatic suggestions", async () => {
    mockProjectCreator();
    const inserts: Array<{ table: unknown; values: Record<string, unknown> | unknown[] }> = [];
    mock.method(db.query.projects, "findMany", async () => { throw new Error("Automatic allocation must not run"); });
    mock.method(db, "transaction", async (work: (tx: unknown) => Promise<unknown>) => work({
        insert: (table: unknown) => ({ values: (values: Record<string, unknown>) => {
            inserts.push({ table, values });
            return { returning: async () => [{ id: "new-project", ...values }] };
        } }),
    }));
    const result = await createProject(createProjectSchema.parse({ name: "My project", issueKey: "CUSTOM" }), creatorId);
    assert.equal(result.issueKey, "CUSTOM");
    assert.equal(inserts[0].table, projects);
    assert.deepEqual(inserts[1].values, { projectId: "new-project", userId: creatorId, role: "owner" });
    assert.equal((inserts[2].values as unknown[]).length, 3);
});

test("an explicit duplicate key returns 409 instead of silently suffixing it", async () => {
    mockProjectCreator();
    const transaction = mock.method(db, "transaction", async () => { throw new Error("Query failed", { cause: collision }); });
    await assert.rejects(createProject({ name: "My project", issueKey: "CUSTOM" }, creatorId), (error: unknown) =>
        error instanceof HttpError && error.statusCode === 409 && error.message === "Project key is already in use");
    assert.equal(transaction.mock.callCount(), 1);
});

test("automatic keys retry with a fresh suggestion after a concurrent collision", async () => {
    mockProjectCreator();
    let attempts = 0;
    mock.method(db.query.projects, "findMany", async () => attempts === 0 ? [{ issueKey: "MP" }] : [{ issueKey: "MP" }, { issueKey: "MP1" }]);
    mock.method(db, "transaction", async (work: (tx: unknown) => Promise<unknown>) => {
        attempts++;
        if (attempts === 1) throw collision;
        return work({ insert: () => ({ values: (values: Record<string, unknown>) => ({ returning: async () => [{ id: "new-project", ...values }] }) }) });
    });
    assert.equal((await createProject({ name: "My project" }, creatorId)).issueKey, "MP2");
    assert.equal(attempts, 2);
});

test("automatic allocation reports exhausted collisions as 409", async () => {
    mockProjectCreator();
    mock.method(db.query.projects, "findMany", async () => []);
    const transaction = mock.method(db, "transaction", async () => { throw collision; });
    await assert.rejects(createProject({ name: "My project" }, creatorId), (error: unknown) => error instanceof HttpError && error.statusCode === 409);
    assert.equal(transaction.mock.callCount(), 5);
});

test("unrelated database errors propagate without being retried as key conflicts", async () => {
    mockProjectCreator();
    const unavailable = new Error("Database unavailable");
    const transaction = mock.method(db, "transaction", async () => { throw unavailable; });
    await assert.rejects(createProject({ name: "My project", issueKey: "CUSTOM" }, creatorId), (error) => error === unavailable);
    assert.equal(transaction.mock.callCount(), 1);
    assert.equal(isProjectKeyConflict({ code: "23505", constraint: "other_unique_constraint" }), false);
    const cyclic: { cause?: unknown } = {}; cyclic.cause = cyclic;
    assert.equal(isProjectKeyConflict(cyclic), false);
});

test("a key another project used before is reserved for its old links", async () => {
    mockProjectCreator();
    mockReservedKeys([{ key: "OLD", projectId: "other-project" }]);
    const transaction = mock.method(db, "transaction", async () => { throw new Error("Must not insert"); });
    await assert.rejects(createProject({ name: "My project", issueKey: "OLD" }, creatorId), (error: unknown) =>
        error instanceof HttpError && error.statusCode === 409);
    assert.equal(transaction.mock.callCount(), 0);
});

test("automatic keys skip former keys of other projects", async () => {
    mockProjectCreator();
    mockReservedKeys([{ key: "MP", projectId: "other-project" }]);
    mock.method(db.query.projects, "findMany", async () => []);
    mock.method(db, "transaction", async (work: (tx: unknown) => Promise<unknown>) =>
        work({ insert: () => ({ values: (values: Record<string, unknown>) => ({ returning: async () => [{ id: "new-project", ...values }] }) }) }));
    assert.equal((await createProject({ name: "My project" }, creatorId)).issueKey, "MP1");
});

function mockRename(current: { issueKey: string; nextIssueNumber: number }) {
    const calls: Array<{ op: string; table: unknown; values?: unknown }> = [];
    let lookups = 0;
    // The first lookup loads the project being renamed; the second checks the new key against other projects.
    mock.method(db.query.projects, "findFirst", async () => (lookups++ === 0 ? { id: "project", cover: null, ...current } : undefined) as never);
    mockReservedKeys();
    mock.method(db, "transaction", async (work: (tx: unknown) => Promise<unknown>) => work({
        delete: (table: unknown) => ({ where: async () => { calls.push({ op: "delete", table }); } }),
        insert: (table: unknown) => ({ values: (values: unknown) => ({ onConflictDoNothing: async () => { calls.push({ op: "insert", table, values }); } }) }),
        update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: () => ({ returning: async () => {
            calls.push({ op: "update", table, values });
            return [{ id: "project", cover: null, ...current, ...values }];
        } }) }) }),
    }));
    return calls;
}

test("renaming the key of a project with issues keeps the old key as an alias", async () => {
    const calls = mockRename({ issueKey: "OLD", nextIssueNumber: 13 });
    const project = await updateProject("project", { issueKey: "NEW" });
    assert.equal(project.issueKey, "NEW");
    assert.deepEqual(calls.find((call) => call.op === "insert"), { op: "insert", table: projectKeyAliases, values: { key: "OLD", projectId: "project" } });
});

test("renaming the key of a project without issues frees the old key", async () => {
    const calls = mockRename({ issueKey: "OLD", nextIssueNumber: 1 });
    await updateProject("project", { issueKey: "NEW" });
    assert.equal(calls.some((call) => call.op === "insert"), false);
});

test("renaming to a key another project reserved returns 409", async () => {
    mockRename({ issueKey: "OLD", nextIssueNumber: 13 });
    mockReservedKeys([{ key: "TAKEN", projectId: "other-project" }]);
    await assert.rejects(updateProject("project", { issueKey: "TAKEN" }), (error: unknown) => error instanceof HttpError && error.statusCode === 409);
});

function authorize(isAdmin: boolean): Promise<number> {
    return new Promise((resolve, reject) => {
        let status = 200;
        const response = { status(code: number) { status = code; return this; }, json() { resolve(status); } };
        const next: NextFunction = (error?: unknown) => error ? reject(error) : resolve(200);
        requireProjectOwner({ params: { projectId: "project" }, user: { sub: "user", isAdmin } } as unknown as Request<{ projectId: string }>, response as Response, next);
    });
}

test("project deletion/settings guard rejects members and nonmembers", async () => {
    mock.method(db.query.projects, "findFirst", async () => ({ id: "project" }));
    const membership = mock.method(db.query.projectMembers, "findFirst", async () => ({ role: "member" }));
    assert.equal(await authorize(false), 403);
    membership.mock.mockImplementation(async () => undefined);
    assert.equal(await authorize(false), 403);
});

test("project deletion/settings guard permits owner and admin, but not a missing project", async () => {
    const project = mock.method(db.query.projects, "findFirst", async () => ({ id: "project" }));
    mock.method(db.query.projectMembers, "findFirst", async () => ({ role: "owner" }));
    assert.equal(await authorize(false), 200);
    assert.equal(await authorize(true), 200);
    project.mock.mockImplementation(async () => undefined);
    await assert.rejects(authorize(true), (error: unknown) => error instanceof HttpError && error.statusCode === 404);
});
