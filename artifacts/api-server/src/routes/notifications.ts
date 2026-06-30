import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";

const router: IRouter = Router();

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    message: n.message,
    type: n.type,
    read: n.read,
    entityType: n.entityType ?? null,
    entityId: n.entityId ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/notifications", async (_req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(notificationsTable.createdAt)
    .limit(50);

  res.json(notifications.map(formatNotification));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [notification] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.id, id))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(formatNotification(notification));
});

router.patch("/notifications/read-all", async (_req, res): Promise<void> => {
  await db.update(notificationsTable).set({ read: true });
  res.json({ ok: true });
});

export default router;
