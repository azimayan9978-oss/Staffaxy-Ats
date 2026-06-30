import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, clientsTable, positionsTable, candidatesTable } from "@workspace/db";
import { GetMonthlyTrendsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [clientStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      potential: sql<number>`count(*) filter (where status = 'Potential Client')::int`,
      active: sql<number>`count(*) filter (where status = 'Signed Agreement')::int`,
    })
    .from(clientsTable)
    .where(sql`archived = false`);

  const [positionStats] = await db
    .select({
      open: sql<number>`count(*) filter (where status = 'Open')::int`,
      closed: sql<number>`count(*) filter (where status = 'Closed' or status = 'Filled' or status = 'Cancelled')::int`,
    })
    .from(positionsTable);

  const [candidateStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      interviewScheduled: sql<number>`count(*) filter (where status = 'Interview Scheduled')::int`,
      placed: sql<number>`count(*) filter (where status = 'Placed')::int`,
      offerPending: sql<number>`count(*) filter (where status = 'Offer Released')::int`,
    })
    .from(candidatesTable);

  res.json({
    totalClients: clientStats.total,
    potentialClients: clientStats.potential,
    activeClients: clientStats.active,
    openPositions: positionStats.open,
    closedPositions: positionStats.closed,
    candidatesSubmitted: candidateStats.total,
    interviewScheduled: candidateStats.interviewScheduled,
    placements: candidateStats.placed,
    offerPending: candidateStats.offerPending,
  });
});

router.get("/dashboard/monthly", async (req, res): Promise<void> => {
  const params = GetMonthlyTrendsQueryParams.safeParse(req.query);
  const months = params.success ? (params.data.months ?? 6) : 6;

  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthStr = date.toLocaleString("default", { month: "short" }) + " " + year;

    const [clientCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clientsTable)
      .where(sql`extract(year from created_at) = ${year} and extract(month from created_at) = ${month}`);

    const [positionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(positionsTable)
      .where(sql`extract(year from created_at) = ${year} and extract(month from created_at) = ${month}`);

    const [submissionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(candidatesTable)
      .where(sql`extract(year from submission_date) = ${year} and extract(month from submission_date) = ${month}`);

    const [placementCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(candidatesTable)
      .where(sql`extract(year from submission_date) = ${year} and extract(month from submission_date) = ${month} and status = 'Placed'`);

    result.push({
      month: monthStr,
      clients: clientCount.count,
      positions: positionCount.count,
      submissions: submissionCount.count,
      placements: placementCount.count,
    });
  }

  res.json(result);
});

router.get("/dashboard/pipeline", async (_req, res): Promise<void> => {
  const stages = await db
    .select({
      status: candidatesTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(candidatesTable)
    .groupBy(candidatesTable.status)
    .orderBy(sql`count(*) desc`);

  res.json(stages.map((s) => ({ status: s.status, count: s.count })));
});

export default router;
