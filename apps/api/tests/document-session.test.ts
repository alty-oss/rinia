import assert from "node:assert/strict";
import { test } from "bun:test";
import type { UpdateDocumentInput } from "@rinia/shared";
import type { DocumentPage } from "../../web/src/features/documents/api";
import { DocumentSession } from "../../web/src/features/documents/document-session";

const projectId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";
const page: DocumentPage = {
  id: documentId,
  projectId,
  title: "Notes",
  contentJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Saved" }] }] },
  iconAppearance: null,
  createdBy: "33333333-3333-4333-8333-333333333333",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  revision: 1,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function setup(options: { online?: () => boolean; save?: (input: UpdateDocumentInput) => Promise<DocumentPage> } = {}) {
  let saveCount = 0;
  const session = new DocumentSession(page, {
    save: async (input) => {
      saveCount++;
      return options.save ? options.save(input) : { ...page, title: input.title, iconAppearance: input.iconAppearance ?? null, revision: page.revision + saveCount };
    },
    online: options.online ?? (() => true),
    onSaved: () => undefined,
  });
  return { session, saveCount: () => saveCount };
}

test("a title change saves without a revision and settles as saved", async () => {
  const inputs: UpdateDocumentInput[] = [];
  const { session } = setup({
    save: async (input) => {
      inputs.push(input);
      return { ...page, title: input.title, revision: 2 };
    },
  });
  session.edit({ title: "Renamed" });
  assert.equal(session.getSnapshot().status, "pending");
  await session.flush();
  assert.deepEqual(inputs, [{ title: "Renamed", iconAppearance: null }]);
  assert.equal(session.getSnapshot().status, "saved");
  assert.equal(session.getSnapshot().revision, 2);
  assert.equal(session.getSnapshot().dirty, false);
});

test("edits made during an in-flight save are sent next", async () => {
  const first = deferred<DocumentPage>();
  const second = deferred<DocumentPage>();
  const inputs: UpdateDocumentInput[] = [];
  const { session } = setup({
    save: async (input) => {
      inputs.push(input);
      return inputs.length === 1 ? first.promise : second.promise;
    },
  });
  session.edit({ title: "First version" });
  const flushing = session.flush();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(inputs.length, 1);
  session.edit({ title: "Latest version" });
  const followup = session.flush();
  first.resolve({ ...page, title: "First version", revision: 2 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(inputs.length, 2);
  assert.equal(inputs[1].title, "Latest version");
  second.resolve({ ...page, title: "Latest version", revision: 3 });
  await Promise.all([flushing, followup]);
  assert.equal(session.getSnapshot().status, "saved");
  assert.equal(session.getSnapshot().title, "Latest version");
  assert.equal(session.getSnapshot().revision, 3);
  assert.equal(session.getSnapshot().dirty, false);
});

test("a failed save keeps the change and permits an immediate retry", async () => {
  let fail = true;
  const { session } = setup({
    save: async (input) => {
      if (fail) throw Object.assign(new Error("server error"), { status: 500 });
      return { ...page, title: input.title, revision: 2 };
    },
  });
  session.edit({ title: "To keep" });
  await session.flush();
  assert.equal(session.getSnapshot().status, "error");
  assert.equal(session.getSnapshot().title, "To keep");
  assert.equal(session.getSnapshot().dirty, true);
  fail = false;
  await session.flush();
  assert.equal(session.getSnapshot().status, "saved");
});

test("offline edits wait until a retry can reach the server", async () => {
  let online = false;
  const { session, saveCount } = setup({ online: () => online });
  session.edit({ title: "Offline" });
  await session.flush();
  assert.equal(session.getSnapshot().status, "offline");
  assert.equal(saveCount(), 0);
  online = true;
  await session.flush();
  assert.equal(saveCount(), 1);
  assert.equal(session.getSnapshot().status, "saved");
});

test("the icon is saved together with the title", async () => {
  const inputs: UpdateDocumentInput[] = [];
  const { session } = setup({
    save: async (input) => {
      inputs.push(input);
      return { ...page, title: input.title, iconAppearance: input.iconAppearance ?? null, revision: 2 };
    },
  });
  session.edit({ iconAppearance: { type: "icon", key: "rocket" } });
  await session.flush();
  assert.deepEqual(inputs[0].iconAppearance, { type: "icon", key: "rocket" });
  assert.deepEqual(session.getSnapshot().iconAppearance, { type: "icon", key: "rocket" });
});

test("a newer title from someone else replaces this one unless it is being edited here", () => {
  const { session } = setup();
  session.observe({ ...page, title: "Theirs", revision: 2 });
  assert.equal(session.getSnapshot().title, "Theirs");
  session.edit({ title: "Mine" });
  session.observe({ ...page, title: "Theirs again", revision: 3 });
  assert.equal(session.getSnapshot().title, "Mine", "a change being typed here is not overwritten");
  session.observe({ ...page, title: "Old", revision: 1 });
  assert.equal(session.getSnapshot().title, "Mine", "an older version is ignored");
});

test("a deleted page stops saving", async () => {
  const { session, saveCount } = setup({
    save: async () => {
      throw Object.assign(new Error("gone"), { status: 404 });
    },
  });
  session.edit({ title: "After delete" });
  await session.flush();
  assert.equal(session.getSnapshot().status, "deleted");
  session.edit({ title: "Ignored" });
  await session.flush();
  assert.equal(saveCount(), 1);
});
