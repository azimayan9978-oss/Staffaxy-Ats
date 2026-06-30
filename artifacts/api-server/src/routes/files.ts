import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, filesTable, usersTable } from "@workspace/db";
import {
  ListFilesQueryParams,
  UploadFileBody,
  DeleteFileParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/files", async (req, res): Promise<void> => {
  const params = ListFilesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const files = await db
    .select()
    .from(filesTable)
    .where(and(eq(filesTable.entityType, params.data.entityType), eq(filesTable.entityId, Number(params.data.entityId))))
    .orderBy(filesTable.createdAt);

  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  res.json(files.map((f) => ({
    id: f.id,
    entityType: f.entityType,
    entityId: f.entityId,
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize ?? null,
    createdAt: f.createdAt.toISOString(),
    userId: f.userId ?? null,
    userName: f.userId ? (userMap.get(f.userId) ?? null) : null,
  })));
});

router.post("/files", async (req, res): Promise<void> => {
  const parsed = UploadFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;

  const [file] = await db.insert(filesTable).values({
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    fileName: parsed.data.fileName,
    fileType: parsed.data.fileType,
    fileSize: parsed.data.fileSize ?? null,
    fileData: parsed.data.fileData,
    userId: userId,
  }).returning();

  const [user] = userId ? await db.select().from(usersTable).where(eq(usersTable.id, userId)) : [];

  res.status(201).json({
    id: file.id,
    entityType: file.entityType,
    entityId: file.entityId,
    fileName: file.fileName,
    fileType: file.fileType,
    fileSize: file.fileSize ?? null,
    createdAt: file.createdAt.toISOString(),
    userId: file.userId ?? null,
    userName: user?.name ?? null,
  });
});

router.delete("/files/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteFileParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(filesTable).where(eq(filesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
