import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateCandidate, useListPositions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Paperclip, X, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryParams } from "@/hooks/use-query-params";

export function NewCandidatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createCandidate = useCreateCandidate();
  const { data: positions } = useListPositions({});
  const fileRef = useRef<HTMLInputElement>(null);
  const queryParams = useQueryParams();

  // Arriving from a position's "Submit Candidate" button carries the
  // position along, so the recruiter doesn't have to re-find it here.
  const lockedPositionId = queryParams.get("positionId") ?? "";

  const [form, setForm] = useState({
    positionId: lockedPositionId,
    candidateName: "",
    email: "",
    phone: "",
    currentCompany: "",
    experience: "",
    currentCtc: "",
    expectedCtc: "",
    noticePeriod: "",
    source: "LinkedIn",
    resumeFileName: "",
    resumeData: "",
  });

  // If the position list loads after the query param is read, or the param
  // changes, keep the preselection in sync.
  useEffect(() => {
    if (lockedPositionId) {
      setForm((f) => (f.positionId ? f : { ...f, positionId: lockedPositionId }));
    }
  }, [lockedPositionId]);

  const lockedPosition = lockedPositionId
    ? positions?.find((p) => String(p.id) === lockedPositionId)
    : undefined;

  // Lets the recruiter override the pre-selected position if they landed
  // here for the wrong one, without losing the "no re-search" convenience
  // for the common case.
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setForm((f) => ({ ...f, resumeFileName: file.name, resumeData: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setForm((f) => ({ ...f, resumeFileName: "", resumeData: "" }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.positionId) {
      toast({ title: "Error", description: "Please select a position.", variant: "destructive" });
      return;
    }
    createCandidate.mutate(
      {
        data: {
          positionId: Number(form.positionId),
          candidateName: form.candidateName,
          email: form.email,
          phone: form.phone,
          currentCompany: form.currentCompany || undefined,
          experience: form.experience || undefined,
          currentCtc: form.currentCtc || undefined,
          expectedCtc: form.expectedCtc || undefined,
          noticePeriod: form.noticePeriod || undefined,
          source: form.source,
          resumeFileName: form.resumeFileName || undefined,
          resumeData: form.resumeData || undefined,
        },
      },
      {
        onSuccess: (c) => {
          toast({ title: "Candidate submitted", description: `${form.candidateName} has been submitted.` });
          setLocation(`/candidates/${c.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to submit candidate.", variant: "destructive" });
        },
      }
    );
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/candidates">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Candidate</h1>
          <p className="text-muted-foreground">
            {lockedPosition
              ? `Adding a candidate to ${lockedPosition.positionName} at ${lockedPosition.clientName}.`
              : "Add a new candidate to a position."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Candidate Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Position *</Label>
                {lockedPositionId && !showPositionPicker ? (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Briefcase className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {lockedPosition ? `${lockedPosition.positionName} — ${lockedPosition.clientName}` : "Loading position…"}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">Pre-selected</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPositionPicker(true)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Select value={form.positionId} onValueChange={(v) => setForm((f) => ({ ...f, positionId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a position" /></SelectTrigger>
                    <SelectContent>
                      {positions?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.positionName} — {p.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateName">Full Name *</Label>
                <Input id="candidateName" required value={form.candidateName} onChange={set("candidateName")} placeholder="John Mathew" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={form.email} onChange={set("email")} placeholder="john@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="+91-9911111111" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentCompany">Current Company</Label>
                <Input id="currentCompany" value={form.currentCompany} onChange={set("currentCompany")} placeholder="Infosys" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input id="experience" value={form.experience} onChange={set("experience")} placeholder="6 years" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noticePeriod">Notice Period</Label>
                <Input id="noticePeriod" value={form.noticePeriod} onChange={set("noticePeriod")} placeholder="30 days" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentCtc">Current CTC</Label>
                <Input id="currentCtc" value={form.currentCtc} onChange={set("currentCtc")} placeholder="18 LPA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCtc">Expected CTC</Label>
                <Input id="expectedCtc" value={form.expectedCtc} onChange={set("expectedCtc")} placeholder="24 LPA" />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["LinkedIn", "Indeed", "Reference", "Database", "Direct", "Job Portal", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Resume</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFile}
                />
                {form.resumeFileName ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/40">
                    <Paperclip className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate font-medium">{form.resumeFileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={clearFile}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attach Resume (PDF, DOC, DOCX)
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createCandidate.isPending}>
                {createCandidate.isPending ? "Submitting..." : "Submit Candidate"}
              </Button>
              <Link href="/candidates">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
