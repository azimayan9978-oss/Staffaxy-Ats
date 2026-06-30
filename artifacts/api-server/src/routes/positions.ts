import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, positionsTable, clientsTable, candidatesTable, auditLogsTable, notesTable, filesTable } from "@workspace/db";
import {
  ListPositionsQueryParams,
  CreatePositionBody,
  GetPositionParams,
  UpdatePositionParams,
  UpdatePositionBody,
  DeletePositionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatPosition(position: typeof positionsTable.$inferSelect, clientName: string, candidateCount?: number) {
  return {
    id: position.id,
    clientId: position.clientId,
    clientName,
    positionName: position.positionName,
    jobDescription: position.jobDescription ?? null,
    jobDescriptionLink: position.jobDescriptionLink ?? null,
    location: position.location,
    employmentType: position.employmentType,
    priority: position.priority,
    openings: position.openings,
    hiringManager: position.hiringManager ?? null,
    status: position.status,
    createdAt: position.createdAt.toISOString(),
    candidateCount: candidateCount ?? null,
  };
}

router.get("/positions", async (req, res): Promise<void> => {
  const params = ListPositionsQueryParams.safeParse(req.query);

  const conditions = [];
  if (params.success) {
    const p = params.data;
    if (p.status) conditions.push(eq(positionsTable.status, p.status));
    if (p.clientId) conditions.push(eq(positionsTable.clientId, Number(p.clientId)));
    if (p.location) conditions.push(ilike(positionsTable.location, `%${p.location}%`));
    if (p.priority) conditions.push(eq(positionsTable.priority, p.priority));
    if (p.employmentType) conditions.push(eq(positionsTable.employmentType, p.employmentType));
    if (p.search) conditions.push(ilike(positionsTable.positionName, `%${p.search}%`));
  }

  const positions = conditions.length > 0
    ? await db.select().from(positionsTable).where(and(...conditions)).orderBy(positionsTable.createdAt)
    : await db.select().from(positionsTable).orderBy(positionsTable.createdAt);

  const clients = await db.select().from(clientsTable);
  const clientMap = new Map(clients.map((c) => [c.id, c.clientName]));

  const counts = await db
    .select({ positionId: candidatesTable.positionId, count: sql<number>`count(*)::int` })
    .from(candidatesTable)
    .groupBy(candidatesTable.positionId);
  const countMap = new Map(counts.map((c) => [c.positionId, c.count]));

  res.json(positions.map((p) => formatPosition(p, clientMap.get(p.clientId) ?? "", countMap.get(p.id) ?? 0)));
});

router.post("/positions", async (req, res): Promise<void> => {
  const parsed = CreatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, parsed.data.clientId));

  const [position] = await db.insert(positionsTable).values({
    ...parsed.data,
    status: "Open",
  }).returning();

  if (userId) {
    await db.insert(auditLogsTable).values({
      entityType: "position",
      entityId: position.id,
      action: "created",
      userId,
    });
  }

  res.status(201).json(formatPosition(position, client?.clientName ?? ""));
});

router.get("/positions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPositionParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [position] = await db.select().from(positionsTable).where(eq(positionsTable.id, params.data.id));
  if (!position) {
    res.status(404).json({ error: "Position not found" });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, position.clientId));
  const candidates = await db.select().from(candidatesTable).where(eq(candidatesTable.positionId, params.data.id));

  res.json({
    ...formatPosition(position, client?.clientName ?? ""),
    candidates: candidates.map((c) => ({
      id: c.id,
      positionId: c.positionId,
      positionName: position.positionName,
      clientId: position.clientId,
      clientName: client?.clientName ?? "",
      candidateName: c.candidateName,
      email: c.email,
      phone: c.phone,
      currentCompany: c.currentCompany ?? null,
      experience: c.experience ?? null,
      currentCtc: c.currentCtc ?? null,
      expectedCtc: c.expectedCtc ?? null,
      noticePeriod: c.noticePeriod ?? null,
      source: c.source,
      status: c.status,
      submissionDate: c.submissionDate.toISOString(),
      createdAt: c.createdAt.toISOString(),
      recruiterId: c.recruiterId ?? null,
      recruiterName: null,
      resumeFileName: c.resumeFileName ?? null,
    })),
  });
});

router.patch("/positions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePositionParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePositionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;

  const [position] = await db.update(positionsTable).set(parsed.data).where(eq(positionsTable.id, params.data.id)).returning();
  if (!position) {
    res.status(404).json({ error: "Position not found" });
    return;
  }

  if (userId) {
    await db.insert(auditLogsTable).values({
      entityType: "position",
      entityId: position.id,
      action: "updated",
      changes: JSON.stringify(parsed.data),
      userId,
    });
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, position.clientId));
  res.json(formatPosition(position, client?.clientName ?? ""));
});

router.delete("/positions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePositionParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const pid = params.data.id;
  const candidateRows = await db.select({ id: candidatesTable.id }).from(candidatesTable).where(eq(candidatesTable.positionId, pid));
  for (const c of candidateRows) {
    await db.delete(notesTable).where(and(eq(notesTable.entityType, "candidate"), eq(notesTable.entityId, c.id)));
    await db.delete(filesTable).where(and(eq(filesTable.entityType, "candidate"), eq(filesTable.entityId, c.id)));
  }
  await db.delete(candidatesTable).where(eq(candidatesTable.positionId, pid));
  await db.delete(notesTable).where(and(eq(notesTable.entityType, "position"), eq(notesTable.entityId, pid)));
  await db.delete(filesTable).where(and(eq(filesTable.entityType, "position"), eq(filesTable.entityId, pid)));
  await db.delete(positionsTable).where(eq(positionsTable.id, pid));
  res.sendStatus(204);
});

export default router;
