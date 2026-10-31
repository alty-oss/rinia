import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { createFavoriteSchema } from "@rinia/shared";
import { db } from "../src/db";
import { addFavorite, listFavorites, removeFavorite } from "../src/features/favorites/favorites.service";
import { HttpError } from "../src/lib/http-error";

// Stub the database boundary: these tests never connect to or mutate a development database.
afterEach(() => mock.restoreAll());

const projectId = "6f1d2c3b-0000-4000-8000-000000000001";
const otherProjectId = "6f1d2c3b-0000-4000-8000-000000000002";
const documentId = "6f1d2c3b-0000-4000-8000-000000000003";
const isHttp = (status: number) => (error: unknown) => error instanceof HttpError && error.statusCode === status;

function row(id: string, project: string) {
    return { id, kind: "project", projectId: project, documentId: null, issueId: null, createdAt: new Date(), project: { id: project, name: id, issueKey: "KEY", icon: null, iconAppearance: null }, document: null, issue: null };
}

test("favorite targets must name the document or issue they point at", () => {
    assert.equal(createFavoriteSchema.safeParse({ kind: "project", projectId }).success, true);
    assert.equal(createFavoriteSchema.safeParse({ kind: "document", projectId }).success, false);
    assert.equal(createFavoriteSchema.safeParse({ kind: "issue", projectId, issueId: "not-a-uuid" }).success, false);
    assert.equal(createFavoriteSchema.safeParse({ kind: "view", projectId }).success, false);
});

test("non-members cannot favorite something in a project", async () => {
    mock.method(db.query.projectMembers, "findFirst", async () => undefined);
    const insert = mock.method(db, "insert", () => { throw new Error("Must not insert"); });
    await assert.rejects(addFavorite("user", false, { kind: "project", projectId }), isHttp(403));
    assert.equal(insert.mock.callCount(), 0);
});

test("a document from another project cannot be favorited under this one", async () => {
    mock.method(db.query.projectMembers, "findFirst", async () => ({ role: "member" }) as never);
    mock.method(db.query.projectDocuments, "findFirst", async () => undefined);
    const insert = mock.method(db, "insert", () => { throw new Error("Must not insert"); });
    await assert.rejects(addFavorite("user", false, { kind: "document", projectId, documentId }), isHttp(404));
    assert.equal(insert.mock.callCount(), 0);
});

test("favorites in projects the user has left are hidden, but admins see all", async () => {
    mock.method(db.query.favorites, "findMany", async () => [row("kept", projectId), row("left", otherProjectId)] as never);
    mock.method(db.query.projectMembers, "findMany", async () => [{ projectId }] as never);
    assert.deepEqual((await listFavorites("user", false)).map((favorite) => favorite.id), ["kept"]);
    assert.deepEqual((await listFavorites("admin", true)).map((favorite) => favorite.id), ["kept", "left"]);
});

test("removing someone else's favorite reports it as missing", async () => {
    mock.method(db, "delete", () => ({ where: () => ({ returning: async () => [] }) }) as never);
    await assert.rejects(removeFavorite("user", "favorite"), isHttp(404));
});
