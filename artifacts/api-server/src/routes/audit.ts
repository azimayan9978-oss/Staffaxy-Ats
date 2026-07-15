import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  const params = ListAuditLogsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  const conditions = [];
  if (params.success) {
    if (params.data.entityType) conditions.push(eq(auditLogsTable.entityType, params.data.entityType));
    if (params.data.entityId) conditions.push(eq(auditLogsTable.entityId, Number(params.data.entityId)));
    if (params.data.userId) conditions.push(eq(auditLogsTable.userId, Number(params.data.userId)));
  }

  // Filter first, then take the most recent N — previously this took the
  // oldest N rows overall and filtered afterwards, which could return an
  // empty (or incomplete) page even when plenty of matching rows existed.
  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit);

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
