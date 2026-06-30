import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetClient,
  useUpdateClient,
  useDeleteClient,
  useListPositions,
  useListNotes,
  useCreateNote,
  useDeleteNote,
  useListFiles,
  useUploadFile,
  useDeleteFile,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Save, X, Plus, Paperclip, Briefcase, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const statusColors: Record<string, string> = {
  "Signed Agreement": "bg-green-500/10 text-green-700 border-green-500/20",
  "Potential Client": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  "Will Work in Future": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Inactive": "bg-gray-500/10 text-gray-700 border-gray-500/20",
};

export function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: client, isLoading } = useGetClient(id);
  const { data: positions } = useListPositions({ clientId: id });
  const { data: notes } = useListNotes({ entityType: "client", entityId: id });
  const { data: files } = useListFiles({ entityType: "client", entityId: id });

  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [noteText, setNoteText] = useState("");

  const handleStartEdit = () => {
    setEditForm({
      clientName: client?.clientName ?? "",
      pocName: client?.pocName ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      website: client?.website ?? "",
      source: client?.source ?? "",
      status: client?.status ?? "",
    });
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updateClient.mutate(
      { id, data: editForm },
      {
        onSuccess: () => {
          toast({ title: "Client updated" });
          setEditing(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
      }
    );
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    createNote.mutate(
      { data: { entityType: "client", entityId: id, comment: noteText } },
      {
        onSuccess: () => {
          toast({ title: "Note added" });
          setNoteText("");
        },
        onError: () => toast({ title: "Error", description: "Failed to add note.", variant: "destructive" }),
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFile.mutate(
        {
          data: {
            entityType: "client",
            entityId: id,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: base64,
          },
        },
        {
          onSuccess: () => toast({ title: "File uploaded", description: file.name }),
          onError: () => toast({ title: "Error", description: "Failed to upload.", variant: "destructive" }),
        }
      );
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!client) return <div className="py-12 text-center text-muted-foreground">Client not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{client.clientName}</h1>
            <Badge variant="outline" className={statusColors[client.status] ?? ""}>
              {client.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Added {format(new Date(client.createdAt), "MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" onClick={handleStartEdit}>
                <Edit className="w-4 h-4 mr-2" />Edit
              </Button>
              <Button
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => {
                  if (!confirm(`Delete "${client.clientName}" and all its positions and candidates? This cannot be undone.`)) return;
                  deleteClient.mutate({ id }, {
                    onSuccess: () => { toast({ title: "Client deleted" }); setLocation("/clients"); },
                    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
                  });
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSaveEdit} disabled={updateClient.isPending}>
                <Save className="w-4 h-4 mr-2" />{updateClient.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editing && editForm ? (
                <div className="space-y-3">
                  {[
                    ["clientName", "Company Name"],
                    ["pocName", "POC Name"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["website", "Website"],
                  ].map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={editForm[field] ?? ""}
                        onChange={(e) => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs">Source</Label>
                    <Select value={editForm.source} onValueChange={(v) => setEditForm((f: any) => ({ ...f, source: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["LinkedIn", "Reference", "Direct", "Job Portal", "Cold Call", "Other"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm((f: any) => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Potential Client", "Will Work in Future", "Signed Agreement", "Inactive"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <div><span className="text-muted-foreground">POC:</span> <span className="font-medium">{client.pocName}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a></div>
                  {client.phone && <div><span className="text-muted-foreground">Phone:</span> {client.phone}</div>}
                  {client.website && (
                    <div>
                      <span className="text-muted-foreground">Website:</span>{" "}
                      <a href={client.website} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1 inline-flex">
                        {client.website.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {client.source && <div><span className="text-muted-foreground">Source:</span> {client.source}</div>}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Positions</span>
                <span className="font-medium">{positions?.filter(p => p.status === "Open").length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Positions</span>
                <span className="font-medium">{positions?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notes</span>
                <span className="font-medium">{notes?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Files</span>
                <span className="font-medium">{files?.length ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2">
          <Tabs defaultValue="positions">
            <TabsList>
              <TabsTrigger value="positions">Positions ({positions?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="files">Files ({files?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="positions" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-base">Positions</CardTitle>
                  <Link href={`/positions/new`}>
                    <Button size="sm"><Plus className="w-3 h-3 mr-1" />Add Position</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {!positions?.length ? (
                    <div className="py-8 text-center text-muted-foreground">No positions yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {positions.map((p) => (
                        <Link key={p.id} href={`/positions/${p.id}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                              <Briefcase className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-sm">{p.positionName}</div>
                                <div className="text-xs text-muted-foreground">{p.location} · {p.employmentType}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={
                                p.priority === "High" ? "bg-red-500/10 text-red-700 border-red-500/20" :
                                p.priority === "Medium" ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" :
                                "bg-blue-500/10 text-blue-700 border-blue-500/20"
                              }>{p.priority}</Badge>
                              <Badge variant="outline" className={
                                p.status === "Open" ? "bg-blue-500/10 text-blue-700 border-blue-500/20" :
                                p.status === "Filled" ? "bg-green-500/10 text-green-700 border-green-500/20" :
                                "bg-gray-500/10 text-gray-700 border-gray-500/20"
                              }>{p.status}</Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={createNote.isPending || !noteText.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </form>
                  {!notes?.length ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">No notes yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((n) => (
                        <div key={n.id} className="p-3 rounded-lg bg-muted/50 border group relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">{n.userName || "Unknown"}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{format(new Date(n.createdAt), "MMM d, yyyy HH:mm")}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                                onClick={() => { if (confirm("Delete this note?")) deleteNote.mutate({ id: n.id }); }}
                              ><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                          <p className="text-sm">{n.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-base">Files</CardTitle>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    <Button size="sm" asChild>
                      <span><Paperclip className="w-3 h-3 mr-1" />Upload File</span>
                    </Button>
                  </label>
                </CardHeader>
                <CardContent>
                  {!files?.length ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">No files uploaded.</div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border group">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{f.fileName}</div>
                              <div className="text-xs text-muted-foreground">
                                {((f.fileSize ?? 0) / 1024).toFixed(1)} KB · {format(new Date(f.createdAt), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => { if (confirm("Delete this file?")) deleteFile.mutate({ id: f.id }); }}
                          ><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
