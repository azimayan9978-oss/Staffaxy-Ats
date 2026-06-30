import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, clientsTable, positionsTable, candidatesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/reports/clients", async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable);

  const positionCounts = await db
    .select({ clientId: positionsTable.clientId, count: sql<number>`count(*)::int` })
    .from(positionsTable)
    .groupBy(positionsTable.clientId);

  const candidateCounts = await db
    .select({
      clientId: positionsTable.clientId,
      count: sql<number>`count(*)::int`,
    })
    .from(candidatesTable)
    .innerJoin(positionsTable, eq(candidatesTable.positionId, positionsTable.id))
    .groupBy(positionsTable.clientId);

  const placementCounts = await db
    .select({
      clientId: positionsTable.clientId,
      count: sql<number>`count(*)::int`,
    })
    .from(candidatesTable)
    .innerJoin(positionsTable, eq(candidatesTable.positionId, positionsTable.id))
    .where(sql`${candidatesTable.status} = 'Placed'`)
    .groupBy(positionsTable.clientId);

  const posMap = new Map(positionCounts.map((p) => [p.clientId, p.count]));
  const canMap = new Map(candidateCounts.map((c) => [c.clientId, c.count]));
  const plcMap = new Map(placementCounts.map((p) => [p.clientId, p.count]));

  res.json(clients.map((c) => ({
    id: c.id,
    clientName: c.clientName,
    status: c.status,
    source: c.source,
    positionCount: posMap.get(c.id) ?? 0,
    candidateCount: canMap.get(c.id) ?? 0,
    placementCount: plcMap.get(c.id) ?? 0,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.get("/reports/positions", async (_req, res): Promise<void> => {
  const positions = await db.select().from(positionsTable);
  const clients = await db.select().from(clientsTable);
  const clientMap = new Map(clients.map((c) => [c.id, c.clientName]));

  const candidateCounts = await db
    .select({ positionId: candidatesTable.positionId, count: sql<number>`count(*)::int` })
    .from(candidatesTable)
    .groupBy(candidatesTable.positionId);

  const placementCounts = await db
    .select({ positionId: candidatesTable.positionId, count: sql<number>`count(*)::int` })
    .from(candidatesTable)
    .where(sql`status = 'Placed'`)
    .groupBy(candidatesTable.positionId);

  const canMap = new Map(candidateCounts.map((c) => [c.positionId, c.count]));
  const plcMap = new Map(placementCounts.map((p) => [p.positionId, p.count]));

  res.json(positions.map((p) => ({
    id: p.id,
    positionName: p.positionName,
    clientName: clientMap.get(p.clientId) ?? "",
    status: p.status,
    priority: p.priority,
    openings: p.openings,
    candidateCount: canMap.get(p.id) ?? 0,
    placementCount: plcMap.get(p.id) ?? 0,
    createdAt: p.createdAt.toISOString(),
  })));
});

router.get("/reports/candidates", async (_req, res): Promise<void> => {
  const candidates = await db.select().from(candidatesTable);
  const positions = await db.select().from(positionsTable);
  const clients = await db.select().from(clientsTable);

  const posMap = new Map(positions.map((p) => [p.id, p]));
  const clientMap = new Map(clients.map((c) => [c.id, c.clientName]));

  res.json(candidates.map((c) => {
    const pos = posMap.get(c.positionId);
    return {
      id: c.id,
      candidateName: c.candidateName,
      positionName: pos?.positionName ?? "",
      clientName: pos ? (clientMap.get(pos.clientId) ?? "") : "",
      status: c.status,
      source: c.source,
      experience: c.experience ?? null,
      currentCtc: c.currentCtc ?? null,
      expectedCtc: c.expectedCtc ?? null,
      noticePeriod: c.noticePeriod ?? null,
      submissionDate: c.submissionDate.toISOString(),
    };
  }));
});

router.get("/reports/placements", async (_req, res): Promise<void> => {
  const placements = await db
    .select()
    .from(candidatesTable)
    .where(sql`status = 'Placed'`);

  const positions = await db.select().from(positionsTable);
  const clients = await db.select().from(clientsTable);
  const users = await db.select().from(usersTable);

  const posMap = new Map(positions.map((p) => [p.id, p]));
  const clientMap = new Map(clients.map((c) => [c.id, c.clientName]));
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  res.json(placements.map((c) => {
    const pos = posMap.get(c.positionId);
    return {
      id: c.id,
      candidateName: c.candidateName,
      positionName: pos?.positionName ?? "",
      clientName: pos ? (clientMap.get(pos.clientId) ?? "") : "",
      placedDate: c.submissionDate.toISOString(),
      experience: c.experience ?? null,
      currentCtc: c.currentCtc ?? null,
      expectedCtc: c.expectedCtc ?? null,
      recruiterName: c.recruiterId ? (userMap.get(c.recruiterId) ?? null) : null,
    };
  }));
});

router.get("/reports/recruiter-performance", async (_req, res): Promise<void> => {
  const recruiters = await db.select().from(usersTable).where(sql`role = 'Recruiter' or role = 'Manager'`);
  const candidates = await db.select().from(candidatesTable);

  const result = recruiters.map((r) => {
    const myCandidates = candidates.filter((c) => c.recruiterId === r.id);
    return {
      recruiterId: r.id,
      recruiterName: r.name,
      submissionsCount: myCandidates.length,
      placementsCount: myCandidates.filter((c) => c.status === "Placed").length,
      interviewsCount: myCandidates.filter((c) =>
        ["Interview Scheduled", "Interview on Call", "Interview & Feedback Pending"].includes(c.status)
      ).length,
      activePositionsCount: 0,
    };
  });

  res.json(result);
});

export default router;
