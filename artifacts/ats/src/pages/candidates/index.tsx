import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListCandidates, useDeleteCandidate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  "Submitted": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Shortlisted": "bg-purple-500/10 text-purple-700 border-purple-500/20",
  "Interview Scheduled": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Offer Released": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Offer Accepted": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "Placed": "bg-green-500/10 text-green-700 border-green-500/20",
  "Rejected": "bg-red-500/10 text-red-700 border-red-500/20",
  "Offer Declined": "bg-red-500/10 text-red-700 border-red-500/20",
};

export function CandidatesPage() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: candidates, isLoading } = useListCandidates({ search });
  const deleteCandidate = useDeleteCandidate();

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteCandidate.mutate({ id }, {
      onSuccess: () => toast({ title: "Candidate deleted" }),
      onError: () => toast({ title: "Error", description: "Failed to delete candidate.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground">Manage candidate pipeline and submissions.</p>
        </div>
        <Link href="/candidates/new">
          <Button><Plus className="w-4 h-4 mr-2" />Submit Candidate</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading candidates...</div>
          ) : !candidates?.length ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No candidates found</h3>
              <p className="text-muted-foreground mb-4">Start by submitting a candidate to a position.</p>
              <Link href="/candidates/new"><Button variant="outline">Submit Candidate</Button></Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setLocation(`/candidates/${candidate.id}`)}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{candidate.candidateName}</span>
                          <span className="text-xs text-muted-foreground">{candidate.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.positionName}</TableCell>
                      <TableCell>{candidate.clientName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[candidate.status] ?? "bg-gray-500/10 text-gray-600"}>
                          {candidate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(candidate.submissionDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation(`/candidates/${candidate.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation(`/candidates/${candidate.id}`)}>
                              <Edit className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleDelete(candidate.id, candidate.candidateName)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
