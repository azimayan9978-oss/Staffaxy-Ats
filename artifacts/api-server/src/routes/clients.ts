import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lte, sql } from "drizzle-orm";
import { db, clientsTable, positionsTable, candidatesTable, auditLogsTable, notesTable, filesTable } from "@workspace/db";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
  ArchiveClientParams,
  ArchiveClientBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatClient(client: typeof clientsTable.$inferSelect, positionCount?: number) {
  return {
    id: client.id,
    clientName: client.clientName,
    pocName: client.pocName,
    email: client.email,
    phone: client.phone,
    website: client.website ?? null,
    source: client.source,
    status: client.status,
    notes: client.notes ?? null,
    archived: client.archived,
    createdAt: client.createdAt.toISOString(),
    createdById: client.createdById ?? null,
    positionCount: positionCount ?? null,
  };
}

router.get("/clients", async (req, res): Promise<void> => {
  const params = ListClientsQueryParams.safeParse(req.query);

  const conditions = [];
  if (params.success) {
    const p = params.data;
    if (p.status) conditions.push(eq(clientsTable.status, p.status));
    if (p.source) conditions.push(eq(clientsTable.source, p.source));
    if (p.search) conditions.push(ilike(clientsTable.clientName, `%${p.search}%`));
    if (p.dateFrom) conditions.push(gte(clientsTable.createdAt, new Date(p.dateFrom)));
    if (p.dateTo) conditions.push(lte(clientsTable.createdAt, new Date(p.dateTo)));
    if (typeof p.archived === "boolean") {
      conditions.push(eq(clientsTable.archived, p.archived));
    } else {
      conditions.push(eq(clientsTable.archived, false));
    }
  } else {
    conditions.push(eq(clientsTable.archived, false));
  }

  const clients = await db.select().from(clientsTable).where(and(...conditions)).orderBy(clientsTable.createdAt);

  const counts = await db
    .select({ clientId: positionsTable.clientId, count: sql<number>`count(*)::int` })
    .from(positionsTable)
    .groupBy(positionsTable.clientId);

  const countMap = new Map(counts.map((c) => [c.clientId, c.count]));
  res.json(clients.map((c) => formatClient(c, countMap.get(c.id) ?? 0)));
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;

  const [client] = await db.insert(clientsTable).values({
    ...parsed.data,
    status: parsed.data.status || "Potential Client",
    source: parsed.data.source || "Direct",
    createdById: userId,
  }).returning();

  if (userId) {
    await db.insert(auditLogsTable).values({
      entityType: "client",
      entityId: client.id,
      action: "created",
      userId,
    });
  }

  res.status(201).json(formatClient(client));
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetClientParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const positions = await db.select().from(positionsTable).where(eq(positionsTable.clientId, params.data.id));

  res.json({
    ...formatClient(client),
    positions: positions.map((p) => ({
      id: p.id,
      clientId: p.clientId,
      clientName: client.clientName,
      positionName: p.positionName,
      jobDescription: p.jobDescription ?? null,
      jobDescriptionLink: p.jobDescriptionLink ?? null,
      location: p.location,
      employmentType: p.employmentType,
      priority: p.priority,
      openings: p.openings,
      hiringManager: p.hiringManager ?? null,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      candidateCount: null,
    })),
  });
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateClientParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;

  const [client] = await db.update(clientsTable).set(parsed.data).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  if (userId) {
    await db.insert(auditLogsTable).values({
      entityType: "client",
      entityId: client.id,
      action: "updated",
      changes: JSON.stringify(parsed.data),
      userId,
    });
  }

  res.json(formatClient(client));
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteClientParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cid = params.data.id;
  const posRows = await db.select({ id: positionsTable.id }).from(positionsTable).where(eq(positionsTable.clientId, cid));
  for (const pos of posRows) {
    const candRows = await db.select({ id: candidatesTable.id }).from(candidatesTable).where(eq(candidatesTable.positionId, pos.id));
    for (const c of candRows) {
      await db.delete(notesTable).where(and(eq(notesTable.entityType, "candidate"), eq(notesTable.entityId, c.id)));
      await db.delete(filesTable).where(and(eq(filesTable.entityType, "candidate"), eq(filesTable.entityId, c.id)));
    }
    await db.delete(candidatesTable).where(eq(candidatesTable.positionId, pos.id));
    await db.delete(notesTable).where(and(eq(notesTable.entityType, "position"), eq(notesTable.entityId, pos.id)));
    await db.delete(filesTable).where(and(eq(filesTable.entityType, "position"), eq(filesTable.entityId, pos.id)));
  }
  await db.delete(positionsTable).where(eq(positionsTable.clientId, cid));
  await db.delete(notesTable).where(and(eq(notesTable.entityType, "client"), eq(notesTable.entityId, cid)));
  await db.delete(filesTable).where(and(eq(filesTable.entityType, "client"), eq(filesTable.entityId, cid)));
  await db.delete(clientsTable).where(eq(clientsTable.id, cid));
  res.sendStatus(204);
});

router.patch("/clients/:id/archive", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ArchiveClientParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ArchiveClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db.update(clientsTable).set({ archived: parsed.data.archived }).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(formatClient(client));
});

export default router;
