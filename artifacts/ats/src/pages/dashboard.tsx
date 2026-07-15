import { useMemo } from "react";
import { useLocation, Link } from "wouter";
import {
  useGetDashboardStats, useGetMonthlyTrends, useGetCandidatePipeline,
  useListPositions, useListAuditLogs,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Briefcase, Users, CheckCircle2, Calendar, Target, TrendingUp, CheckSquare,
  AlertTriangle, Activity, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

const PIPELINE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#f97316", "#22c55e", "#ef4444"];

// A position sitting open this long without being filled is worth a
// recruiter's attention, independent of how many candidates it has.
const STALE_POSITION_DAYS = 21;

const actionColors: Record<string, string> = {
  created: "bg-green-500/10 text-green-700 border-green-500/20",
  updated: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  deleted: "bg-red-500/10 text-red-700 border-red-500/20",
  archived: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  login: "bg-purple-500/10 text-purple-700 border-purple-500/20",
};

export function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: trends } = useGetMonthlyTrends();
  const { data: pipeline } = useGetCandidatePipeline();
  const { data: openPositions } = useListPositions({ status: "Open" });
  const { data: recentActivity } = useListAuditLogs({ limit: 8 });

  // Flag positions that are open a long time and/or have no candidates yet —
  // these are the ones likely to slip through the cracks.
  const needsAttention = useMemo(() => {
    if (!openPositions) return [];
    const now = Date.now();
    return openPositions
      .map((p) => ({
        ...p,
        daysOpen: Math.floor((now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .filter((p) => p.daysOpen >= STALE_POSITION_DAYS || !p.candidateCount)
      .sort((a, b) => b.daysOpen - a.daysOpen)
      .slice(0, 5);
  }, [openPositions]);

  // Each card links to the filtered list that explains its number.
  // "closed" is a special value the Positions page expands into
  // Filled / Cancelled / Closed, since those are 3 separate statuses.
  const statCards = [
    { title: "Total Clients", value: stats?.totalClients ?? 0, icon: Building2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", href: "/clients" },
    { title: "Active Clients", value: stats?.activeClients ?? 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", href: "/clients?status=" + encodeURIComponent("Signed Agreement") },
    { title: "Open Positions", value: stats?.openPositions ?? 0, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", href: "/positions?status=Open" },
    { title: "Closed Positions", value: stats?.closedPositions ?? 0, icon: CheckSquare, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-900/30", href: "/positions?status=closed" },
    { title: "Submissions", value: stats?.candidatesSubmitted ?? 0, icon: Users, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", href: "/candidates" },
    { title: "Interviews", value: stats?.interviewScheduled ?? 0, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30", href: "/candidates?status=" + encodeURIComponent("Interview Scheduled") },
    { title: "Offers Pending", value: stats?.offerPending ?? 0, icon: Target, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30", href: "/candidates?status=" + encodeURIComponent("Offer Released") },
    { title: "Placements", value: stats?.placements ?? 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", href: "/candidates?status=Placed" },
  ];

  if (statsLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your recruitment pipeline.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => setLocation(stat.href)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setLocation(stat.href);
            }}
            className="shadow-sm hover:shadow-md hover:border-primary/40 transition-shadow cursor-pointer"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-md ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Submissions & Placements</CardTitle>
          </CardHeader>
          <CardContent>
            {!trends?.length ? (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="submissions" name="Submissions" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="placements" name="Placements" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {!pipeline?.length ? (
              <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pipeline}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="count"
                    nameKey="status"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pipeline.map((_: any, index: number) => (
                      <Cell key={index} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardTitle>
            {needsAttention.length > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30">
                {needsAttention.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {!needsAttention.length ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
                <CheckCircle2 className="h-5 w-5 opacity-50" />
                Nothing stale right now — good shape.
              </div>
            ) : (
              <div className="space-y-2">
                {needsAttention.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setLocation(`/positions/${p.id}`)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-md border hover:bg-accent/30 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.positionName}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.clientName}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!p.candidateCount && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30">
                          No candidates
                        </Badge>
                      )}
                      {p.daysOpen >= STALE_POSITION_DAYS && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30">
                          {p.daysOpen}d open
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
            <Link href="/audit-log" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!recentActivity?.length ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No activity yet</div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-md text-sm">
                    <Badge variant="outline" className={`shrink-0 text-xs ${actionColors[log.action] ?? "bg-gray-500/10 text-gray-700"}`}>
                      {log.action}
                    </Badge>
                    <span className="capitalize text-muted-foreground shrink-0">{log.entityType}</span>
                    {log.userName && (
                      <span className="text-muted-foreground truncate">by <span className="text-foreground font-medium">{log.userName}</span></span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
