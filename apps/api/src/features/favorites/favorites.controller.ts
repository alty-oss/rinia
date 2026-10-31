import { createFavoriteSchema } from "@rinia/shared";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler";
import { addFavorite, listFavorites, removeFavorite } from "./favorites.service";

export const list = asyncHandler(async (req, res) => {
    res.json({ favorites: await listFavorites(req.user!.sub, req.user!.isAdmin) });
});

export const create = asyncHandler(async (req, res) => {
    const input = createFavoriteSchema.parse(req.body);
    res.status(201).json({ favorite: await addFavorite(req.user!.sub, req.user!.isAdmin, input) });
});

export const remove = asyncHandler<{ favoriteId: string }>(async (req, res) => {
    await removeFavorite(req.user!.sub, z.string().uuid().parse(req.params.favoriteId));
    res.status(204).end();
});
