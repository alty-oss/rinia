import { Router } from "express";
import { requireProjectMember } from "../../middleware/project-membership.middleware";
import { get, update } from "./view-preferences.controller";

export const viewPreferencesRouter = Router({ mergeParams: true });

viewPreferencesRouter.use(requireProjectMember);

viewPreferencesRouter.get("/", get);
viewPreferencesRouter.patch("/", update);
