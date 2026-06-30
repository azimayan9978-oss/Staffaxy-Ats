import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Activity } from "lucide-react";
import { format } from "date-fns";

const actionColors: Record<string, string> = {
  created: "bg-green-500/10 text-green-700 border-green-500/20",
  updated: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  deleted: "bg-red-500/10 text-red-700 border-red-500/20",
  archived: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  login: "bg-purple-500/10 text-purple-700 border-purple-500/20",
};

export function AuditLogPage() {
  const [entityType, setEntityType] = useState("all");
  const { data: logs, isLoading } = useListAuditLogs(
    entityType !== "all" ? { entityType } : {}
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Track all changes made across the system.</p>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center gap-3">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="position">Positions</SelectItem>
                <SelectItem value="candidate">Candidates</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading audit logs...</div>
          ) : !logs?.length ? (
            <div className="py-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No audit logs found</h3>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="mt-0.5">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={actionColors[log.action] || "bg-gray-500/10 text-gray-700"}>
                        {log.action}
                      </Badge>
                      <span className="text-sm font-medium capitalize">{log.entityType}</span>
                      <span className="text-sm text-muted-foreground">#{log.entityId}</span>
                      {log.userName && (
                        <span className="text-sm text-muted-foreground">by <span className="font-medium text-foreground">{log.userName}</span></span>
                      )}
                    </div>
                    {log.changes && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted px-2 py-1 rounded truncate">
                        {typeof log.changes === "string" ? log.changes : JSON.stringify(log.changes)}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
