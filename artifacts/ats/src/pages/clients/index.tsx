import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
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
import { Search, Plus, Upload, Building2, MoreHorizontal, Eye, Edit, Archive, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";

const statusColors: Record<string, string> = {
  "Signed Agreement": "bg-green-500/10 text-green-700 border-green-500/20",
  "Potential Client": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Will Work in Future": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Inactive": "bg-gray-500/10 text-gray-700 border-gray-500/20",
};

const CLIENT_STATUSES = ["Signed Agreement", "Potential Client", "Will Work in Future", "Inactive"];

export function ClientsPage() {
  const queryParams = useQueryParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(queryParams.get("status") ?? "");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Keep the filter in sync if the URL changes (e.g. clicking a dashboard card
  // while already on this page, or using browser back/forward).
  useEffect(() => {
    setStatus(queryParams.get("status") ?? "");
  }, [queryParams]);

  const clientsQuery = useListClients({ search: search || undefined, status: status || undefined });
  const { data: clients, isLoading } = clientsQuery;
  const deleteClient = useDeleteClient();
  const archiveClient = useArchiveClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}" and all its positions and candidates? This cannot be undone.`)) return;
    deleteClient.mutate({ id }, {
      onSuccess: () => toast({ title: "Client deleted" }),
      onError: () => toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" }),
    });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow selecting the same file again later
    if (!file) return;

    setImporting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Couldn't read the file"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileData: base64, fileName: file.name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Import failed (${res.status})`);
      }

      const summary = await res.json();
      toast({
        title: "Import complete",
        description: `${summary.clientsCreated} new clients, ${summary.clientsMatched} matched to existing clients, ${summary.positionsCreated} positions added.`,
      });
      queryClient.invalidateQueries({ queryKey: clientsQuery.queryKey });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Something went wrong reading that file.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client relationships and accounts.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? "Importing..." : "Import from Excel"}
          </Button>
          <Link href="/clients/new">
            <Button><Plus className="w-4 h-4 mr-2" />Add Client</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={status || "all"}
              onValueChange={(v) => {
                const next = v === "all" ? "" : v;
                setStatus(next);
                setLocation(next ? `/clients?status=${encodeURIComponent(next)}` : "/clients");
              }}
            >
              <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {status && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setStatus(""); setLocation("/clients"); }}
              >
                <X className="w-3 h-3 mr-1" />Clear filter
              </Button>
            )}
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
