import { useGetDashboardStats, useGetMonthlyTrends, useGetCandidatePipeline } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Briefcase, Users, CheckCircle2, Calendar, Target, TrendingUp, CheckSquare } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PIPELINE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#f97316", "#22c55e", "#ef4444"];

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: trends } = useGetMonthlyTrends();
  const { data: pipeline } = useGetCandidatePipeline();

  const statCards = [
    { title: "Total Clients", value: stats?.totalClients ?? 0, icon: Building2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { title: "Active Clients", value: stats?.activeClients ?? 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { title: "Open Positions", value: stats?.openPositions ?? 0, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    { title: "Closed Positions", value: stats?.closedPositions ?? 0, icon: CheckSquare, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-900/30" },
    { title: "Submissions", value: stats?.candidatesSubmitted ?? 0, icon: Users, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { title: "Interviews", value: stats?.interviewScheduled ?? 0, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
    { title: "Offers Pending", value: stats?.offerPending ?? 0, icon: Target, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
    { title: "Placements", value: stats?.placements ?? 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
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
          <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
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
    </div>
  );
}
