import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetPosition,
  useUpdatePosition,
  useDeletePosition,
  useListCandidates,
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
import { ArrowLeft, Edit, Save, X, Plus, Paperclip, ExternalLink, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  Open: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Filled: "bg-green-500/10 text-green-700 border-green-500/20",
  "On Hold": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  Cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

const priorityColors: Record<string, string> = {
  High: "bg-red-500/10 text-red-700 border-red-500/20",
  Medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  Low: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

const candidateStatusColors: Record<string, string> = {
  Submitted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Shortlisted: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  "Interview Scheduled": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Offer Released": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Offer Accepted": "bg-green-500/10 text-green-700 border-green-500/20",
  Placed: "bg-green-500/10 text-green-700 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function PositionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: position, isLoading } = useGetPosition(id);
  const { data: candidates } = useListCandidates({ positionId: id });
  const { data: notes } = useListNotes({ entityType: "position", entityId: id });
  const { data: files } = useListFiles({ entityType: "position", entityId: id });

  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [noteText, setNoteText] = useState("");

  const handleStartEdit = () => {
    setEditForm({
      positionName: position?.positionName ?? "",
      jobDescription: position?.jobDescription ?? "",
      jobDescriptionLink: position?.jobDescriptionLink ?? "",
      location: position?.location ?? "",
      employmentType: position?.employmentType ?? "",
      priority: position?.priority ?? "",
      openings: String(position?.openings ?? 1),
      hiringManager: position?.hiringManager ?? "",
      status: position?.status ?? "",
    });
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updatePosition.mutate(
      { id, data: { ...editForm, openings: Number(editForm.openings) } },
      {
        onSuccess: () => { toast({ title: "Position updated" }); setEditing(false); },
        onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
      }
    );
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    createNote.mutate(
      { data: { entityType: "position", entityId: id, comment: noteText } },
      { onSuccess: () => { toast({ title: "Note added" }); setNoteText(""); }, onError: () => toast({ title: "Error", variant: "destructive" }) }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFile.mutate(
        { data: { entityType: "position", entityId: id, fileName: file.name, fileType: file.type, fileSize: file.size, fileData: base64 } },
        { onSuccess: () => toast({ title: "File uploaded" }), onError: () => toast({ title: "Error", variant: "destructive" }) }
      );
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!position) return <div className="py-12 text-center text-muted-foreground">Position not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/positions">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{position.positionName}</h1>
            <Badge variant="outline" className={priorityColors[position.priority] ?? ""}>{position.priority}</Badge>
            <Badge variant="outline" className={statusColors[position.status] ?? ""}>{position.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            <Link href={`/clients/${position.clientId}`} className="hover:underline text-primary">{position.clientName}</Link>
            {position.location && ` · ${position.location}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" onClick={handleStartEdit}><Edit className="w-4 h-4 mr-2" />Edit</Button>
              <Button
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => {
                  if (!confirm(`Delete "${position.positionName}" and all its candidates? This cannot be undone.`)) return;
                  deletePosition.mutate({ id }, {
                    onSuccess: () => { toast({ title: "Position deleted" }); setLocation("/positions"); },
                    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
                  });
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSaveEdit} disabled={updatePosition.isPending}>
                <Save className="w-4 h-4 mr-2" />{updatePosition.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-2" />Cancel</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editing && editForm ? (
                <div className="space-y-3">
                  {[["positionName", "Title"], ["location", "Location"], ["hiringManager", "Hiring Manager"], ["jobDescriptionLink", "JD Link"], ["openings", "Openings"]].map(([f, l]) => (
                    <div key={f} className="space-y-1">
                      <Label className="text-xs">{l}</Label>
                      <Input value={editForm[f] ?? ""} onChange={(e) => setEditForm((p: any) => ({ ...p, [f]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs">Job Description</Label>
                    <Textarea value={editForm.jobDescription ?? ""} onChange={(e) => setEditForm((p: any) => ({ ...p, jobDescription: e.target.value }))} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Employment Type</Label>
                    <Select value={editForm.employmentType} onValueChange={(v) => setEditForm((p: any) => ({ ...p, employmentType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Permanent", "Contract", "Remote", "Hybrid", "Part-time"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Priority</Label>
                    <Select value={editForm.priority} onValueChange={(v) => setEditForm((p: any) => ({ ...p, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["High", "Medium", "Low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm((p: any) => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Open", "Filled", "On Hold", "Cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Employment</span><span>{position.employmentType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Openings</span><span className="font-medium">{position.openings}</span></div>
                  {position.hiringManager && <div className="flex justify-between"><span className="text-muted-foreground">Hiring Mgr</span><span>{position.hiringManager}</span></div>}
                  {position.jobDescriptionLink && (
                    <div>
                      <a href={position.jobDescriptionLink} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1 text-sm">
                        View JD <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {position.jobDescription && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground text-xs mb-1">Description</p>
                      <p className="text-sm">{position.jobDescription}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries({
                Submitted: candidates?.filter(c => c.status === "Submitted").length ?? 0,
                Shortlisted: candidates?.filter(c => c.status === "Shortlisted").length ?? 0,
                "Interview Scheduled": candidates?.filter(c => c.status === "Interview Scheduled").length ?? 0,
                "Offer Released": candidates?.filter(c => ["Offer Released", "Offer Accepted"].includes(c.status)).length ?? 0,
                Placed: candidates?.filter(c => c.status === "Placed").length ?? 0,
              }).map(([label, count]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2">
          <Tabs defaultValue="candidates">
            <TabsList>
              <TabsTrigger value="candidates">Candidates ({candidates?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="files">Files ({files?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="candidates" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-base">Candidates</CardTitle>
                  <Link href="/candidates/new">
                    <Button size="sm"><Plus className="w-3 h-3 mr-1" />Submit Candidate</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {!candidates?.length ? (
                    <div className="py-8 text-center text-muted-foreground">No candidates yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {candidates.map((c) => (
                        <Link key={c.id} href={`/candidates/${c.id}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 cursor-pointer transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {c.candidateName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{c.candidateName}</div>
                                <div className="text-xs text-muted-foreground">{c.currentCompany} · {c.experience}</div>
                              </div>
                            </div>
                            <Badge variant="outline" className={candidateStatusColors[c.status] ?? "bg-gray-500/10 text-gray-700"}>
                              {c.status}
                            </Badge>
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
                    <Textarea placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} className="flex-1" />
                    <Button type="submit" disabled={createNote.isPending || !noteText.trim()}><Plus className="w-4 h-4" /></Button>
                  </form>
                  {!notes?.length ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">No notes yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((n) => (
                        <div key={n.id} className="p-3 rounded-lg bg-muted/50 border group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">{n.userName || "Unknown"}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{format(new Date(n.createdAt), "MMM d, HH:mm")}</span>
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
                    <Button size="sm" asChild><span><Paperclip className="w-3 h-3 mr-1" />Upload</span></Button>
                  </label>
                </CardHeader>
                <CardContent>
                  {!files?.length ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">No files uploaded.</div>
                  ) : (
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border group">
                          <div className="flex items-center gap-3">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{f.fileName}</div>
                              <div className="text-xs text-muted-foreground">{((f.fileSize ?? 0) / 1024).toFixed(1)} KB · {format(new Date(f.createdAt), "MMM d, yyyy")}</div>
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
