import assert from "node:assert/strict";
import { afterEach, mock, spyOn, test } from "bun:test";
import { updateViewPreferenceSchema } from "@rinia/shared";
import { db } from "../src/db";
import { getViewPreference, saveViewPreference } from "../src/features/view-preferences/view-preferences.service";

// Stub the database boundary: these tests never connect to or mutate a development database.
afterEach(() => mock.restore());

const userId = "7a2e4d1c-0000-4000-8000-000000000001";
const projectId = "7a2e4d1c-0000-4000-8000-000000000002";

test("only known issue views can be saved", () => {
    assert.equal(updateViewPreferenceSchema.safeParse({ issueView: "board" }).success, true);
    assert.equal(updateViewPreferenceSchema.safeParse({ issueView: "calendar" }).success, false);
    assert.equal(updateViewPreferenceSchema.safeParse({ issueView: "list", extra: true }).success, false);
});

test("a project without a saved view opens as a list", async () => {
    spyOn(db.query.projectViewPreferences, "findFirst").mockImplementation(async () => undefined);
    assert.deepEqual(await getViewPreference(userId, projectId), { issueView: "list" });
});

test("a saved view is returned, and one the app no longer knows falls back to the list", async () => {
    const find = spyOn(db.query.projectViewPreferences, "findFirst").mockImplementation(async () => ({ issueView: "board" }) as never);
    assert.deepEqual(await getViewPreference(userId, projectId), { issueView: "board" });
    find.mockImplementation(async () => ({ issueView: "timeline" }) as never);
    assert.deepEqual(await getViewPreference(userId, projectId), { issueView: "list" });
});

test("saving a view replaces the previous one for the same user and project", async () => {
    const writes: Array<{ values: unknown; conflict: { set: unknown } }> = [];
    spyOn(db, "insert").mockImplementation(
        () =>
            ({
                values: (values: unknown) => ({
                    onConflictDoUpdate: async (conflict: { set: unknown }) => {
                        writes.push({ values, conflict });
                    },
                }),
            }) as never,
    );
    assert.deepEqual(await saveViewPreference(userId, projectId, "board"), { issueView: "board" });
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].values, { userId, projectId, issueView: "board" });
    assert.equal((writes[0].conflict.set as { issueView: string }).issueView, "board");
});
