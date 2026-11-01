const views = {
        title: "Views", newView: "New view", createNew: "Create new view", emptyDescription: "Save a set of filters, grouping, order, and layout as a view, and open the issues you care about in one click. Share a view with the project so everyone sees the same list.", emptyHint: "On the issue list, add filters and choose Save, or use the layers button next to the pills.", sharedLabel: "Shared", personal: "Personal", couldNotLoadList: "Could not load the views.", eyebrow: "Saved view", saveView: "Save view", saveAsView: "Save as view", saveAsNew: "Save as new view", saveChanges: "Save changes", reset: "Reset",
        actions: "View actions", sharedWithProject: "Shared with the project", unsavedChanges: "This screen differs from the saved view.",
        createTitle: "Save as view", createDescription: "Keep these filters, grouping, order, and layout so you can open them again in one click.",
        renameTitle: "Edit view", name: "Name", namePlaceholder: "Urgent bugs", nameRequired: "Give the view a name.",
        share: "Share with project", makePrivate: "Make private", shareHint: "Every project member can open it.",
        privateHint: "Only you can see it.", rename: "Rename", duplicate: "Duplicate", delete: "Delete view", copyName: "{{name}} (copy)",
        saved: "View saved", updated: "View updated", duplicated: "View duplicated", shared: "View shared with the project", madePrivate: "View is now private",
        deleted: "“{{name}}” deleted",
        deleteTitle: "Delete this view?", deleteDescription: "“{{name}}” will be removed. You can undo it right after.", deleteSharedDescription: "“{{name}}” will be removed for everyone it is shared with. You can undo it right after.",
        notFoundTitle: "View not found", notFoundDescription: "It may have been deleted, or it is private to someone else.", backToIssues: "Back to issues",
        couldNotLoad: "Could not load this view.",
    } as const;

export default views;
