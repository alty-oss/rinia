import { Router } from "express";
import { requireProjectMember } from "../../middleware/project-membership.middleware";
import { create, duplicate, list, remove, restore, update } from "./views.controller";

export const viewsRouter = Router({ mergeParams: true });

viewsRouter.use(requireProjectMember);

viewsRouter.get("/", list);
viewsRouter.post("/", create);
viewsRouter.patch("/:viewId", update);
viewsRouter.delete("/:viewId", remove);
viewsRouter.post("/:viewId/restore", restore);
viewsRouter.post("/:viewId/duplicate", duplicate);
