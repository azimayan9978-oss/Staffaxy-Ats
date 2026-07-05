import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lte, sql } from "drizzle-orm";
import { z } from "zod/v4";
import * as XLSX from "xlsx";
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

// ---------------------------------------------------------------------------
// Bulk import from the legacy Excel/Google Sheets leads tracker
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, string[]> = {
  position: ["position", "role", "job title"],
  company: ["company name", "company"],
  pocName: ["poc name", "contact name"],
  pocEmail: ["poc email", "contact email"],
  status: ["status"],
  jd: ["jd", "job description", "jd link"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, " ");
}

function findHeaderRow(rows: (string | number | undefined)[][]): { headerIndex: number; colMap: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = (rows[i] ?? []).map((c) => (typeof c === "string" ? normalizeHeader(c) : ""));
    const hits = Object.values(HEADER_ALIASES).filter((aliases) => aliases.some((a) => row.includes(a)));
    if (hits.length >= 3) {
      const colMap: Record<string, number> = {};
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        const idx = row.findIndex((c) => aliases.includes(c));
        if (idx !== -1) colMap[field] = idx;
      }
      return { headerIndex: i, colMap };
    }
  }
  return null;
}

function cellStr(row: (string | number | undefined)[], idx: number | undefined): string {
  if (idx === undefined) return "";
  const v = row[idx];
  return v === undefined || v === null ? "" : String(v).trim();
}

// Old sheet had many pipeline statuses; the Client record only has 4.
function mapClientStatus(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s === "agreement signed") return "Signed Agreement";
  if (s === "inactive" || s === "not interested") return "Inactive";
  return "Potential Client"; // No Response, Active, 1st Response, Waiting for Agreement, blank, etc.
}

const ImportClientsBody = z.object({
  fileData: z.string().min(1), // base64, no data: prefix
  fileName: z.string().optional(),
  sheetName: z.string().optional(),
});

router.post("/clients/import", async (req, res): Promise<void> => {
  const parsed = ImportClientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = Buffer.from(parsed.data.fileData, "base64");
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    res.status(400).json({ error: "Couldn't read that file. Make sure it's a .xlsx or .csv export." });
    return;
  }

  const sheet = workbook.Sheets[parsed.data.sheetName || workbook.SheetNames[0]];
  if (!sheet) {
    res.status(400).json({ error: `Sheet not found. Available sheets: ${workbook.SheetNames.join(", ")}` });
    return;
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: undefined }) as (string | number | undefined)[][];
  const found = findHeaderRow(rows);
  if (!found) {
    res.status(400).json({ error: "Couldn't find a header row with columns like Position, Company Name, POC Email, Status in the first 6 rows." });
    return;
  }
  const { headerIndex, colMap } = found;

  const userId = (req.session as Record<string, unknown>).userId as number | undefined;

  // Load existing clients once so repeat companies in the sheet (or already
  // in the ATS) get their position attached instead of a duplicate client.
  const existingClients = await db.select().from(clientsTable);
  const clientByName = new Map(existingClients.map((c) => [c.clientName.toLowerCase().trim(), c]));

  let clientsCreated = 0;
  let clientsMatched = 0;
  let positionsCreated = 0;
  let skippedBlank = 0;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const companyRaw = cellStr(row, colMap.company);
    const positionRaw = cellStr(row, colMap.position);
    if (!companyRaw && !positionRaw) {
      skippedBlank++;
      continue;
    }

    const companyKey = companyRaw.toLowerCase().trim();
    const pocEmail = cellStr(row, colMap.pocEmail) || null;
    const pocName = cellStr(row, colMap.pocName) || null;
    const statusRaw = cellStr(row, colMap.status);
    const jdRaw = cellStr(row, colMap.jd) || null;

    let client = companyKey ? clientByName.get(companyKey) : undefined;
    if (!client) {
      const [newClient] = await db
        .insert(clientsTable)
        .values({
          clientName: companyRaw || "(unknown company)",
          pocName: pocName || "Unknown",
          email: pocEmail || "unknown@unknown.com",
          phone: "",
          source: "Direct",
          status: mapClientStatus(statusRaw),
          createdById: userId,
        })
        .returning();
      client = newClient;
      if (companyKey) clientByName.set(companyKey, client);
      clientsCreated++;
      if (userId) {
        await db.insert(auditLogsTable).values({ entityType: "client", entityId: client.id, action: "created_via_import", userId });
      }
    } else {
      clientsMatched++;
    }

    // A cell can list multiple titles ("Title A, Title B") — one position each.
    const titles = positionRaw.includes(",")
      ? positionRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [positionRaw || "(untitled position)"];

    for (const title of titles) {
      const isLink = jdRaw ? /^https?:\/\//i.test(jdRaw) : false;
      await db.insert(positionsTable).values({
        clientId: client.id,
        positionName: title,
        jobDescription: jdRaw && !isLink ? jdRaw : null,
        jobDescriptionLink: jdRaw && isLink ? jdRaw : null,
        location: "",
        status: "Open",
      });
      positionsCreated++;
    }
  }

  res.status(201).json({ clientsCreated, clientsMatched, positionsCreated, skippedBlank });
});


export default router;
