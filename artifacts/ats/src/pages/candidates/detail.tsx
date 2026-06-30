import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetCandidate,
  useUpdateCandidate,
  useDeleteCandidate,
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
import { ArrowLeft, Edit, Save, X, Plus, Paperclip, Mail, Phone, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  Submitted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Shortlisted: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  "Interview Scheduled": "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  "Offer Released": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Offer Accepted": "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  Placed: "bg-green-500/10 text-green-700 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-700 border-red-500/20",
  "Offer Declined": "bg-red-500/10 text-red-700 border-red-500/20",
};

const candidateStatuses = [
  "Submitted", "Shortlisted", "Interview Scheduled", "Offer Released",
  "Offer Accepted", "Offer Declined", "Placed", "Rejected",
];

export function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: candidate, isLoading } = useGetCandidate(id);
  const { data: notes } = useListNotes({ entityType: "candidate", entityId: id });
  const { data: files } = useListFiles({ entityType: "candidate", entityId: id });

  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [noteText, setNoteText] = useState("");

  const handleStartEdit = () => {
    setEditForm({
      candidateName: candidate?.candidateName ?? "",
      email: candidate?.email ?? "",
      phone: candidate?.phone ?? "",
      currentCompany: candidate?.currentCompany ?? "",
      experience: candidate?.experience ?? "",
      currentCtc: candidate?.currentCtc ?? "",
      expectedCtc: candidate?.expectedCtc ?? "",
      noticePeriod: candidate?.noticePeriod ?? "",
      source: candidate?.source ?? "",
      status: candidate?.status ?? "",
      resumeLink: "",
    });
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updateCandidate.mutate(
      { id, data: editForm },
      {
        onSuccess: () => { toast({ title: "Candidate updated" }); setEditing(false); },
        onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
      }
    );
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    createNote.mutate(
      { data: { entityType: "candidate", entityId: id, comment: noteText } },
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
        { data: { entityType: "candidate", entityId: id, fileName: file.name, fileType: file.type, fileSize: file.size, fileData: base64 } },
        { onSuccess: () => toast({ title: "File uploaded" }), onError: () => toast({ title: "Error", variant: "destructive" }) }
      );
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!candidate) return <div className="py-12 text-center text-muted-foreground">Candidate not found.</div>;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm((f: any) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/candidates">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{candidate.candidateName}</h1>
            <Badge variant="outline" className={statusColors[candidate.status] ?? "bg-gray-500/10 text-gray-700"}>
              {candidate.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {candidate.currentCompany && `${candidate.currentCompany} · `}
            <Link href={`/positions/${candidate.positionId}`} className="hover:underline text-primary">{candidate.positionName}</Link>
            {candidate.clientName && ` @ ${candidate.clientName}`}
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
                  if (!confirm(`Delete "${candidate.candidateName}"? This cannot be undone.`)) return;
                  deleteCandidate.mutate({ id }, {
                    onSuccess: () => { toast({ title: "Candidate deleted" }); setLocation("/candidates"); },
                    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
                  });
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSaveEdit} disabled={updateCandidate.isPending}>
                <Save className="w-4 h-4 mr-2" />{updateCandidate.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-2" />Cancel</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editing && editForm ? (
                <div className="space-y-3">
                  {[
                    ["candidateName", "Name"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["currentCompany", "Current Company"],
                    ["experience", "Experience"],
                    ["currentCtc", "Current CTC"],
                    ["expectedCtc", "Expected CTC"],
                    ["noticePeriod", "Notice Period"],
                    ["resumeLink", "Resume Link"],
                  ].map(([f, l]) => (
                    <div key={f} className="space-y-1">
                      <Label className="text-xs">{l}</Label>
                      <Input value={editForm[f] ?? ""} onChange={set(f)} />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label className="text-xs">Source</Label>
                    <Select value={editForm.source} onValueChange={(v) => setEditForm((f: any) => ({ ...f, source: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["LinkedIn", "Indeed", "Reference", "Database", "Direct", "Job Portal", "Other"].map((s) => (
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
                        {candidateStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <a href={`mailto:${candidate.email}`} className="text-primary hover:underline">{candidate.email}</a>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      {candidate.phone}
                    </div>
                  )}
                  {candidate.experience && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Experience</span>
                      <span className="font-medium">{candidate.experience}</span>
                    </div>
                  )}
                  {candidate.noticePeriod && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Notice</span>
                      <span>{candidate.noticePeriod}</span>
                    </div>
                  )}
                  {candidate.currentCtc && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current CTC</span>
                      <span>{candidate.currentCtc}</span>
                    </div>
                  )}
                  {candidate.expectedCtc && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected CTC</span>
                      <span className="font-medium">{candidate.expectedCtc}</span>
                    </div>
                  )}
                  {candidate.source && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span>{candidate.source}</span>
                    </div>
                  )}
                  {candidate.resumeFileName && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> {candidate.resumeFileName}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Submitted {format(new Date(candidate.submissionDate), "MMM d, yyyy")}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2">
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes ({notes?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="files">Files ({files?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Interview Notes & Updates</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <Textarea placeholder="Add interview feedback, notes..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} className="flex-1" />
                    <Button type="submit" disabled={createNote.isPending || !noteText.trim()}><Plus className="w-4 h-4" /></Button>
                  </form>
                  {!notes?.length ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">No notes yet. Add interview feedback here.</div>
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
                  <CardTitle className="text-base">Resume & Documents</CardTitle>
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
