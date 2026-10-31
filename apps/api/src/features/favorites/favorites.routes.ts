import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { create, list, remove } from "./favorites.controller";

export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);
favoritesRouter.get("/", list);
favoritesRouter.post("/", create);
favoritesRouter.delete("/:favoriteId", remove);
