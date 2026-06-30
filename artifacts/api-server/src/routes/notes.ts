import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, notesTable, usersTable } from "@workspace/db";
import {
  ListNotesQueryParams,
  CreateNoteBody,
  DeleteNoteParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notes", async (req, res): Promise<void> => {
  const params = ListNotesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const notes = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.entityType, params.data.entityType), eq(notesTable.entityId, Number(params.data.entityId))))
    .orderBy(notesTable.createdAt);

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  res.json(notes.map((n) => ({
    id: n.id,
    entityType: n.entityType,
    entityId: n.entityId,
    comment: n.comment,
    createdAt: n.createdAt.toISOString(),
    userId: n.userId ?? null,
    userName: n.userId ? (userMap.get(n.userId) ?? null) : null,
  })));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;

  const [note] = await db.insert(notesTable).values({
    ...parsed.data,
    userId: userId,
  }).returning();

  const [user] = userId ? await db.select().from(usersTable).where(eq(usersTable.id, userId)) : [];

  res.status(201).json({
    id: note.id,
    entityType: note.entityType,
    entityId: note.entityId,
    comment: note.comment,
    createdAt: note.createdAt.toISOString(),
    userId: note.userId ?? null,
    userName: user?.name ?? null,
  });
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteNoteParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(notesTable).where(eq(notesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
