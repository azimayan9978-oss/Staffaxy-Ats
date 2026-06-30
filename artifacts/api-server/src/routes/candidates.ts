import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lte } from "drizzle-orm";
import { db, candidatesTable, positionsTable, clientsTable, usersTable, auditLogsTable, notificationsTable, notesTable, filesTable } from "@workspace/db";
import {
  ListCandidatesQueryParams,
  CreateCandidateBody,
  GetCandidateParams,
  UpdateCandidateParams,
  UpdateCandidateBody,
  DeleteCandidateParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function formatCandidate(c: typeof candidatesTable.$inferSelect) {
  const [position] = await db.select().from(positionsTable).where(eq(positionsTable.id, c.positionId));
  const [client] = position ? await db.select().from(clientsTable).where(eq(clientsTable.id, position.clientId)) : [];
  const [recruiter] = c.recruiterId ? await db.select().from(usersTable).where(eq(usersTable.id, c.recruiterId)) : [];

  return {
    id: c.id,
    positionId: c.positionId,
    positionName: position?.positionName ?? "",
    clientId: position?.clientId ?? 0,
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
    recruiterName: recruiter?.name ?? null,
    resumeFileName: c.resumeFileName ?? null,
  };
}

router.get("/candidates", async (req, res): Promise<void> => {
  const params = ListCandidatesQueryParams.safeParse(req.query);

  let candidates = await db.select().from(candidatesTable).orderBy(candidatesTable.createdAt);

  if (params.success) {
    const p = params.data;
    if (p.status) candidates = candidates.filter((c) => c.status === p.status);
    if (p.source) candidates = candidates.filter((c) => c.source === p.source);
    if (p.positionId) candidates = candidates.filter((c) => c.positionId === Number(p.positionId));
    if (p.recruiterId) candidates = candidates.filter((c) => c.recruiterId === Number(p.recruiterId));
    if (p.search) candidates = candidates.filter((c) => c.candidateName.toLowerCase().includes(String(p.search).toLowerCase()));
    if (p.dateFrom) candidates = candidates.filter((c) => c.submissionDate >= new Date(p.dateFrom!));
    if (p.dateTo) candidates = candidates.filter((c) => c.submissionDate <= new Date(p.dateTo!));

    if (p.clientId) {
      const positions = await db.select().from(positionsTable).where(eq(positionsTable.clientId, Number(p.clientId)));
      const positionIds = new Set(positions.map((pos) => pos.id));
      candidates = candidates.filter((c) => positionIds.has(c.positionId));
    }
  }

  const formatted = await Promise.all(candidates.map(formatCandidate));
  res.json(formatted);
});

router.post("/candidates", async (req, res): Promise<void> => {
  const parsed = CreateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;

  const { resumeData, ...rest } = parsed.data;
  const [candidate] = await db.insert(candidatesTable).values({
    ...rest,
    submissionDate: rest.submissionDate ? new Date(rest.submissionDate) : new Date(),
    recruiterId: userId,
  }).returning();

  if (userId) {
    await db.insert(auditLogsTable).values({
      entityType: "candidate",
      entityId: candidate.id,
      action: "submitted",
      userId,
    });

    await db.insert(notificationsTable).values({
      message: `New candidate "${candidate.candidateName}" submitted`,
      type: "candidate_submitted",
      entityType: "candidate",
      entityId: candidate.id,
    });
  }

  res.status(201).json(await formatCandidate(candidate));
});

router.get("/candidates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetCandidateParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [candidate] = await db.select().from(candidatesTable).where(eq(candidatesTable.id, params.data.id));
  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  res.json(await formatCandidate(candidate));
});

router.patch("/candidates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateCandidateParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCandidateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;
  const { resumeData, ...rest } = parsed.data;

  const [candidate] = await db.update(candidatesTable).set(rest).where(eq(candidatesTable.id, params.data.id)).returning();
  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  if (userId) {
    await db.insert(auditLogsTable).values({
      entityType: "candidate",
      entityId: candidate.id,
      action: "updated",
      changes: JSON.stringify(rest),
      userId,
    });

    if (rest.status === "Placed") {
      await db.insert(notificationsTable).values({
        message: `Candidate "${candidate.candidateName}" has been placed!`,
        type: "placement",
        entityType: "candidate",
        entityId: candidate.id,
      });
    } else if (rest.status === "Interview Scheduled") {
      await db.insert(notificationsTable).values({
        message: `Interview scheduled for "${candidate.candidateName}"`,
        type: "interview_scheduled",
        entityType: "candidate",
        entityId: candidate.id,
      });
    }
  }

  res.json(await formatCandidate(candidate));
});

router.delete("/candidates/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteCandidateParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cid = params.data.id;
  await db.delete(notesTable).where(and(eq(notesTable.entityType, "candidate"), eq(notesTable.entityId, cid)));
  await db.delete(filesTable).where(and(eq(filesTable.entityType, "candidate"), eq(filesTable.entityId, cid)));
  await db.delete(candidatesTable).where(eq(candidatesTable.id, cid));
  res.sendStatus(204);
});

export default router;
