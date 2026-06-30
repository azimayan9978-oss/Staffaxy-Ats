import { useState } from "react";
import {
  useGetClientReport,
  useGetPositionReport,
  useGetCandidateReport,
  useGetPlacementReport,
  useGetRecruiterPerformanceReport,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart2, Building2, Briefcase, Users, Trophy, UserCheck } from "lucide-react";
import { format } from "date-fns";

function exportCsv(filename: string, rows: any[]) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = r[h] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function ClientReport() {
  const { data, isLoading } = useGetClientReport();
  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCsv("client-report.csv", data ?? [])}>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Open Positions</TableHead>
              <TableHead>Total Candidates</TableHead>
              <TableHead>Placements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((row: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                <TableCell>{row.openPositions ?? 0}</TableCell>
                <TableCell>{row.totalCandidates ?? 0}</TableCell>
                <TableCell className="font-semibold text-green-700">{row.placements ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PositionReport() {
  const { data, isLoading } = useGetPositionReport();
  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCsv("position-report.csv", data ?? [])}>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Candidates</TableHead>
              <TableHead>Placements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((row: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.positionName}</TableCell>
                <TableCell>{row.clientName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    row.priority === "High" ? "bg-red-500/10 text-red-700 border-red-500/20" :
                    row.priority === "Medium" ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" :
                    "bg-blue-500/10 text-blue-700 border-blue-500/20"
                  }>{row.priority}</Badge>
                </TableCell>
                <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                <TableCell>{row.totalCandidates ?? 0}</TableCell>
                <TableCell className="font-semibold text-green-700">{row.placements ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CandidateReport() {
  const { data, isLoading } = useGetCandidateReport();
  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCsv("candidate-report.csv", data ?? [])}>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((row: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.candidateName}</TableCell>
                <TableCell>{row.positionName}</TableCell>
                <TableCell>{row.currentCompany}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    ["Placed", "Offer Accepted"].includes(row.status) ? "bg-green-500/10 text-green-700 border-green-500/20" :
                    row.status === "Rejected" ? "bg-red-500/10 text-red-700 border-red-500/20" :
                    "bg-blue-500/10 text-blue-700 border-blue-500/20"
                  }>{row.status}</Badge>
                </TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.submissionDate ? format(new Date(row.submissionDate), "MMM d, yyyy") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PlacementReport() {
  const { data, isLoading } = useGetPlacementReport();
  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCsv("placement-report.csv", data ?? [])}>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Expected CTC</TableHead>
              <TableHead>Placed On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((row: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.candidateName}</TableCell>
                <TableCell>{row.positionName}</TableCell>
                <TableCell>{row.clientName}</TableCell>
                <TableCell className="font-semibold">{row.expectedCtc ?? "—"}</TableCell>
                <TableCell>{row.placedOn ? format(new Date(row.placedOn), "MMM d, yyyy") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RecruiterReport() {
  const { data, isLoading } = useGetRecruiterPerformanceReport();
  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportCsv("recruiter-report.csv", data ?? [])}>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recruiter</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Shortlisted</TableHead>
              <TableHead>Interviews</TableHead>
              <TableHead>Offers</TableHead>
              <TableHead>Placements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((row: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{row.recruiterName}</TableCell>
                <TableCell>{row.submissions ?? 0}</TableCell>
                <TableCell>{row.shortlisted ?? 0}</TableCell>
                <TableCell>{row.interviews ?? 0}</TableCell>
                <TableCell>{row.offers ?? 0}</TableCell>
                <TableCell className="font-semibold text-green-700">{row.placements ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Recruitment analytics and performance metrics.</p>
      </div>

      <Tabs defaultValue="clients">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="w-4 h-4" />Clients
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Briefcase className="w-4 h-4" />Positions
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-2">
            <Users className="w-4 h-4" />Candidates
          </TabsTrigger>
          <TabsTrigger value="placements" className="gap-2">
            <Trophy className="w-4 h-4" />Placements
          </TabsTrigger>
          <TabsTrigger value="recruiters" className="gap-2">
            <UserCheck className="w-4 h-4" />Recruiters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Client Report</CardTitle></CardHeader>
            <CardContent><ClientReport /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="positions" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Position Report</CardTitle></CardHeader>
            <CardContent><PositionReport /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="candidates" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Candidate Report</CardTitle></CardHeader>
            <CardContent><CandidateReport /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="placements" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Placement Report</CardTitle></CardHeader>
            <CardContent><PlacementReport /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recruiters" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Recruiter Performance Report</CardTitle></CardHeader>
            <CardContent><RecruiterReport /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
