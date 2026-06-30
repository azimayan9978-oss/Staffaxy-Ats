import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListPositions, useDeletePosition } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Briefcase, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
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
  "Open": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Filled": "bg-green-500/10 text-green-700 border-green-500/20",
  "On Hold": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Cancelled": "bg-red-500/10 text-red-700 border-red-500/20",
};

const priorityColors: Record<string, string> = {
  "High": "bg-red-500/10 text-red-700 border-red-500/20",
  "Medium": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Low": "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

export function PositionsPage() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: positions, isLoading } = useListPositions({ search });
  const deletePosition = useDeletePosition();

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}" and all its candidates? This cannot be undone.`)) return;
    deletePosition.mutate({ id }, {
      onSuccess: () => toast({ title: "Position deleted" }),
      onError: () => toast({ title: "Error", description: "Failed to delete position.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Positions</h1>
          <p className="text-muted-foreground">Manage active job openings and requirements.</p>
        </div>
        <Link href="/positions/new">
          <Button><Plus className="w-4 h-4 mr-2" />Add Position</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search positions..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading positions...</div>
          ) : !positions?.length ? (
            <div className="py-12 text-center">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No positions found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating a new job position.</p>
              <Link href="/positions/new"><Button variant="outline">Create Position</Button></Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setLocation(`/positions/${position.id}`)}>
                      <TableCell className="font-medium">{position.positionName}</TableCell>
                      <TableCell>{position.clientName}</TableCell>
                      <TableCell>{position.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[position.priority] ?? "bg-gray-500/10 text-gray-600"}>
                          {position.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[position.status] ?? "bg-gray-500/10 text-gray-600"}>
                          {position.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{position.openings}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation(`/positions/${position.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation(`/positions/${position.id}`)}>
                              <Edit className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleDelete(position.id, position.positionName)}
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
