import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { ClientsPage } from "@/pages/clients";
import { NewClientPage } from "@/pages/clients/new";
import { ClientDetailPage } from "@/pages/clients/detail";
import { PositionsPage } from "@/pages/positions";
import { NewPositionPage } from "@/pages/positions/new";
import { PositionDetailPage } from "@/pages/positions/detail";
import { CandidatesPage } from "@/pages/candidates";
import { NewCandidatePage } from "@/pages/candidates/new";
import { CandidateDetailPage } from "@/pages/candidates/detail";
import { ReportsPage } from "@/pages/reports";
import { AuditLogPage } from "@/pages/audit-log";
import { UsersPage } from "@/pages/users";
import { NotificationsPage } from "@/pages/notifications";
import { SettingsPage } from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user && location === "/") {
      setLocation("/dashboard");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user ? () => null : LoginPage} />

      {/* Dashboard */}
      <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>

      {/* Clients */}
      <Route path="/clients/new"><ProtectedRoute component={NewClientPage} /></Route>
      <Route path="/clients/:id"><ProtectedRoute component={ClientDetailPage} /></Route>
      <Route path="/clients"><ProtectedRoute component={ClientsPage} /></Route>

      {/* Positions */}
      <Route path="/positions/new"><ProtectedRoute component={NewPositionPage} /></Route>
      <Route path="/positions/:id"><ProtectedRoute component={PositionDetailPage} /></Route>
      <Route path="/positions"><ProtectedRoute component={PositionsPage} /></Route>

      {/* Candidates */}
      <Route path="/candidates/new"><ProtectedRoute component={NewCandidatePage} /></Route>
      <Route path="/candidates/:id"><ProtectedRoute component={CandidateDetailPage} /></Route>
      <Route path="/candidates"><ProtectedRoute component={CandidatesPage} /></Route>

      {/* Other pages */}
      <Route path="/reports"><ProtectedRoute component={ReportsPage} /></Route>
      <Route path="/audit-log"><ProtectedRoute component={AuditLogPage} /></Route>
      <Route path="/notifications"><ProtectedRoute component={NotificationsPage} /></Route>
      <Route path="/users"><ProtectedRoute component={UsersPage} /></Route>
      <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
