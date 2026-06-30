import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreatePosition, useListClients } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function NewPositionPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createPosition = useCreatePosition();
  const { data: clients } = useListClients({});

  const [form, setForm] = useState({
    clientId: "",
    positionName: "",
    jobDescription: "",
    jobDescriptionLink: "",
    location: "",
    employmentType: "Permanent",
    priority: "Medium",
    openings: "1",
    hiringManager: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast({ title: "Error", description: "Please select a client.", variant: "destructive" });
      return;
    }
    createPosition.mutate(
      {
        data: {
          clientId: Number(form.clientId),
          positionName: form.positionName,
          jobDescription: form.jobDescription || undefined,
          jobDescriptionLink: form.jobDescriptionLink || undefined,
          location: form.location,
          employmentType: form.employmentType,
          priority: form.priority,
          openings: Number(form.openings) || 1,
          hiringManager: form.hiringManager || undefined,
        },
      },
      {
        onSuccess: (pos) => {
          toast({ title: "Position created", description: `${form.positionName} has been added.` });
          setLocation(`/positions/${pos.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create position.", variant: "destructive" });
        },
      }
    );
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/positions">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Position</h1>
          <p className="text-muted-foreground">Create a new job opening.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Position Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Client *</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.clientName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="positionName">Position Title *</Label>
                <Input id="positionName" required value={form.positionName} onChange={set("positionName")} placeholder="Senior Backend Engineer" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea id="jobDescription" value={form.jobDescription} onChange={set("jobDescription")} placeholder="5+ years exp in Node.js..." rows={3} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="jobDescriptionLink">JD Link</Label>
                <Input id="jobDescriptionLink" value={form.jobDescriptionLink} onChange={set("jobDescriptionLink")} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={set("location")} placeholder="Bangalore / Remote" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hiringManager">Hiring Manager</Label>
                <Input id="hiringManager" value={form.hiringManager} onChange={set("hiringManager")} placeholder="Ravi Patel" />
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={form.employmentType} onValueChange={(v) => setForm((f) => ({ ...f, employmentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Permanent", "Contract", "Remote", "Hybrid", "Part-time"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["High", "Medium", "Low"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openings">Openings</Label>
                <Input id="openings" type="number" min="1" value={form.openings} onChange={set("openings")} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createPosition.isPending}>
                {createPosition.isPending ? "Creating..." : "Create Position"}
              </Button>
              <Link href="/positions">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
