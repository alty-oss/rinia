import { updateViewPreferenceSchema } from "@rinia/shared";
import { asyncHandler } from "../../middleware/async-handler";
import { getViewPreference, saveViewPreference } from "./view-preferences.service";

export const get = asyncHandler<{ projectId: string }>(async (req, res) => {
    res.json({ preference: await getViewPreference(req.user!.sub, req.params.projectId) });
});

export const update = asyncHandler<{ projectId: string }>(async (req, res) => {
    const { issueView } = updateViewPreferenceSchema.parse(req.body);
    res.json({ preference: await saveViewPreference(req.user!.sub, req.params.projectId, issueView) });
});
