import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useLogout, useListNotifications } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  BarChart,
  Activity,
  Settings,
  LogOut,
  Bell,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logoutContext } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const { data: notifications } = useListNotifications({});
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        logoutContext();
        setLocation("/");
      },
    });
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ["Admin", "Manager", "Recruiter"] },
    { icon: Building2, label: "Clients", href: "/clients", roles: ["Admin", "Manager", "Recruiter"] },
    { icon: Briefcase, label: "Positions", href: "/positions", roles: ["Admin", "Manager", "Recruiter"] },
    { icon: Users, label: "Candidates", href: "/candidates", roles: ["Admin", "Manager", "Recruiter"] },
    { icon: BarChart, label: "Reports", href: "/reports", roles: ["Admin", "Manager", "Recruiter"] },
    { icon: Activity, label: "Audit Log", href: "/audit-log", roles: ["Admin", "Manager"] },
    { icon: Users, label: "Users", href: "/users", roles: ["Admin"] },
    { icon: Settings, label: "Settings", href: "/settings", roles: ["Admin", "Manager", "Recruiter"] },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-white text-sm">
            R
          </div>
          <span className="font-bold text-xl tracking-tight">RecruitPro</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2">
          {navItems
            .filter((item) => user && item.roles.includes(user.role))
            .map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-md bg-sidebar-accent/50">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center text-xs font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{user?.name}</span>
              <span className="text-xs text-sidebar-foreground/60">{user?.role}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-16 border-b flex items-center justify-between px-8 bg-card shrink-0">
          <h2 className="text-lg font-semibold text-foreground">
            {navItems.find((i) => location.startsWith(i.href))?.label ||
              (location.startsWith("/clients") ? "Clients" :
               location.startsWith("/positions") ? "Positions" :
               location.startsWith("/candidates") ? "Candidates" :
               location.startsWith("/reports") ? "Reports" :
               location.startsWith("/audit-log") ? "Audit Log" :
               location.startsWith("/notifications") ? "Notifications" :
               "RecruitPro")}
          </h2>
          <div className="flex items-center gap-2">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
