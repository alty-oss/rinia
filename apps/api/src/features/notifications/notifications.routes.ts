import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { list, myIssues, readAll, unreadCount, update } from "./notifications.controller";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);
notificationsRouter.get("/", list);
notificationsRouter.get("/unread-count", unreadCount);
notificationsRouter.post("/read-all", readAll);
notificationsRouter.patch("/:notificationId", update);

export const myIssuesRouter = Router();
myIssuesRouter.use(requireAuth);
myIssuesRouter.get("/", myIssues);
