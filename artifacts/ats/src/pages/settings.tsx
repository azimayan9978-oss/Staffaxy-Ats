import { useState } from "react";
import { useUpdateUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, KeyRound, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const updateUser = useUpdateUser();

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [passwordError, setPasswordError] = useState("");

  const handleSaveProfile = () => {
    if (!user) return;
    updateUser.mutate(
      { id: user.id, data: { name: profileForm.name, email: profileForm.email } },
      {
        onSuccess: () => {
          toast({ title: "Profile updated" });
          refreshUser?.();
        },
        onError: () => toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" }),
      }
    );
  };

  const handleChangePassword = () => {
    setPasswordError("");
    if (!passwordForm.current) { setPasswordError("Enter your current password."); return; }
    if (passwordForm.next.length < 6) { setPasswordError("New password must be at least 6 characters."); return; }
    if (passwordForm.next !== passwordForm.confirm) { setPasswordError("New passwords do not match."); return; }
    if (!user) return;
    updateUser.mutate(
      { id: user.id, data: { password: passwordForm.next } },
      {
        onSuccess: () => {
          toast({ title: "Password changed successfully" });
          setPasswordForm({ current: "", next: "", confirm: "" });
        },
        onError: () => toast({ title: "Error", description: "Failed to change password.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account profile and password.</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" />
            Profile
          </CardTitle>
          <CardDescription>Update your display name and email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
              {user?.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Badge variant="outline" className="ml-auto">{user?.role}</Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={updateUser.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateUser.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="w-4 h-4" />
            Change Password
          </CardTitle>
          <CardDescription>Choose a strong password with at least 6 characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Enter current password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="At least 6 characters"
                value={passwordForm.next}
                onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repeat new password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
          </div>

          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={updateUser.isPending}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              {updateUser.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
