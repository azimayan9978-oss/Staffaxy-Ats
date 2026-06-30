import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  const params = ListAuditLogsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  let logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(auditLogsTable.createdAt)
    .limit(limit);

  if (params.success) {
    if (params.data.entityType) logs = logs.filter((l) => l.entityType === params.data.entityType);
    if (params.data.entityId) logs = logs.filter((l) => l.entityId === Number(params.data.entityId));
    if (params.data.userId) logs = logs.filter((l) => l.userId === Number(params.data.userId));
  }

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  res.json(logs.map((l) => ({
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    changes: l.changes ?? null,
    createdAt: l.createdAt.toISOString(),
    userId: l.userId ?? null,
    userName: l.userId ? (userMap.get(l.userId) ?? null) : null,
  })));
});

export default router;
