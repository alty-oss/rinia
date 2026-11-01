import { createApiTokenSchema } from "@rinia/shared";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, requireSession } from "../../middleware/auth.middleware";
import { createApiToken, listApiTokens, revokeApiToken } from "./api-tokens.service";

// Managed from a signed-in browser only: a leaked token cannot mint more tokens or hide its tracks.
export const apiTokensRouter = Router();
apiTokensRouter.use(requireAuth, requireSession);

apiTokensRouter.get(
    "/",
    asyncHandler(async (req, res) => {
        res.json({ tokens: await listApiTokens(req.user!.sub) });
    }),
);

apiTokensRouter.post(
    "/",
    asyncHandler(async (req, res) => {
        res.status(201).json(await createApiToken(req.user!.sub, createApiTokenSchema.parse(req.body)));
    }),
);

apiTokensRouter.delete(
    "/:tokenId",
    asyncHandler<{ tokenId: string }>(async (req, res) => {
        await revokeApiToken(req.user!.sub, z.string().uuid().parse(req.params.tokenId));
        res.status(204).send();
    }),
);
