import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireProjectMember } from "../../middleware/project-membership.middleware";
import { follow, subscription, unfollow } from "../notifications/notifications.controller";
import { addComment, addReaction, addRelation, activity, comments, create, descriptionRevisions, getOne, list, patchComment, relations, remove, removeComment, removeReaction, removeRelation, restoreDescription, update } from "./issues.controller";

export const projectIssuesRouter = Router({ mergeParams: true });
projectIssuesRouter.use(requireProjectMember);
projectIssuesRouter.get("/", list);
projectIssuesRouter.post("/", create);

export const issuesRouter = Router();
issuesRouter.use(requireAuth);
issuesRouter.get("/:issueIdentifier", getOne);
issuesRouter.patch("/:issueIdentifier", update);
issuesRouter.delete("/:issueIdentifier", remove);
issuesRouter.get("/:issueIdentifier/comments", comments);
issuesRouter.post("/:issueIdentifier/comments", addComment);
issuesRouter.get("/:issueIdentifier/activity", activity);
issuesRouter.get("/:issueIdentifier/relations", relations);
issuesRouter.post("/:issueIdentifier/relations", addRelation);
issuesRouter.get("/:issueIdentifier/description-revisions", descriptionRevisions);
issuesRouter.post("/:issueIdentifier/description-revisions/:revisionId/restore", restoreDescription);
issuesRouter.get("/:issueIdentifier/subscription", subscription);
issuesRouter.put("/:issueIdentifier/subscription", follow);
issuesRouter.delete("/:issueIdentifier/subscription", unfollow);

export const issueCommentsRouter = Router();
issueCommentsRouter.use(requireAuth);
issueCommentsRouter.patch("/:commentId", patchComment);
issueCommentsRouter.delete("/:commentId", removeComment);
issueCommentsRouter.post("/:commentId/reactions", addReaction);
issueCommentsRouter.delete("/:commentId/reactions/:emoji", removeReaction);

export const issueRelationsRouter = Router();
issueRelationsRouter.use(requireAuth);
issueRelationsRouter.delete("/:relationId", removeRelation);
