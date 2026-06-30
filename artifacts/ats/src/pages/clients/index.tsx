import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListClients,
  useDeleteClient,
  useArchiveClient,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Building2, MoreHorizontal, Eye, Edit, Archive, Trash2 } from "lucide-react";
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
  "Signed Agreement": "bg-green-500/10 text-green-700 border-green-500/20",
  "Potential Client": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Will Work in Future": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Inactive": "bg-gray-500/10 text-gray-700 border-gray-500/20",
};

export function ClientsPage() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: clients, isLoading } = useListClients({ search });
  const deleteClient = useDeleteClient();
  const archiveClient = useArchiveClient();

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}" and all its positions and candidates? This cannot be undone.`)) return;
    deleteClient.mutate({ id }, {
      onSuccess: () => toast({ title: "Client deleted" }),
      onError: () => toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client relationships and accounts.</p>
        </div>
        <Link href="/clients/new">
          <Button><Plus className="w-4 h-4 mr-2" />Add Client</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading clients...</div>
          ) : !clients?.length ? (
            <div className="py-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No clients found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first client.</p>
              <Link href="/clients/new"><Button variant="outline">Create Client</Button></Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>POC</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setLocation(`/clients/${client.id}`)}>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell>{client.pocName}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[client.status] ?? "bg-gray-500/10 text-gray-600"}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(client.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setLocation(`/clients/${client.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => { setLocation(`/clients/${client.id}`); }}>
                              <Edit className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => archiveClient.mutate({ id: client.id, data: { archived: !client.archived } })}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              {client.archived ? "Unarchive" : "Archive"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={() => handleDelete(client.id, client.clientName)}
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
