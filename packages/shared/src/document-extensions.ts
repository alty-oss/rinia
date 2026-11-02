import { getSchema } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";

/**
 * The page editor's document model, without any view code. The browser extends these with its own behaviour and the API
 * builds the same ProseMirror schema from them, so a page converts between Tiptap JSON and a Yjs document on both sides.
 * It lives apart from the main entry so only the editor and the collaboration server load Tiptap.
 */
export const DocumentImageNode = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            widthPercent: {
                default: 100,
                parseHTML: (element) => Number(element.getAttribute("data-width-percent")) || 100,
                renderHTML: (attrs) => ({ "data-width-percent": attrs.widthPercent }),
            },
        };
    },
}).configure({ allowBase64: false });

export const documentExtensions = {
    // Undo and redo come from the collaboration extension, which only undoes what this person typed.
    starterKit: StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, undoRedo: false }),
    link: Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
    taskList: TaskList,
    taskItem: TaskItem.configure({ nested: true }),
    image: DocumentImageNode,
    table: TableKit.configure({ table: { resizable: true, allowTableNodeSelection: true } }),
    mention: Mention.configure({ HTMLAttributes: { class: "mention" } }),
};

/** The Yjs fragment that holds the page content. `@tiptap/extension-collaboration` uses the same name by default. */
export const DOCUMENT_FRAGMENT = "default";

export const documentSchema = getSchema(Object.values(documentExtensions));
