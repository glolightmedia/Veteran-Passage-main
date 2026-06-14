import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, CheckCircle, AlertTriangle, Ban, Trash2, LayoutDashboard, UserCog, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import RoleLayout from '@/components/RoleLayout';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const adminNav = [
  { name: 'Command Center', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: UserCog },
  { name: 'Resources', href: '/admin/resources', icon: FileCheck },
  { name: 'Reports', href: '/admin/reports', icon: Flag },
];

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/interactions/reports?status=${statusFilter}`, { withCredentials: true });
      setReports(data.reports);
      setTotal(data.total);
    } catch { }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const resolveReport = async (reportId, action) => {
    try {
      await axios.put(`${API}/api/interactions/reports/${reportId}`, { action, notes: `Resolved via admin panel: ${action}` }, { withCredentials: true });
      toast.success(`Report resolved: ${action}`);
      fetchReports();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const ACTION_ICONS = {
    dismiss: CheckCircle,
    warn: AlertTriangle,
    remove: Trash2,
    suspend: Ban,
  };

  return (
    <RoleLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      <div className="space-y-5" data-testid="admin-reports-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Moderation Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">{total} {statusFilter} reports</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs rounded-lg" data-testid="reports-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-20" /></Card>)}</div>
        ) : reports.length === 0 ? (
          <Card className="rounded-xl border">
            <CardContent className="p-10 text-center">
              <Flag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-base font-medium text-foreground">No {statusFilter} reports</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <Card key={r.id} className="rounded-xl border" data-testid={`report-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs rounded-full capitalize">{r.target_type}</Badge>
                        <Badge className={`text-xs rounded-full border-0 ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{r.status}</Badge>
                      </div>
                      <p className="text-sm text-foreground mt-1">{r.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">Reported by {r.reporter_name} &middot; {new Date(r.created_at).toLocaleDateString()}</p>
                      {r.resolution && <p className="text-xs text-secondary mt-1">Resolution: {r.resolution} {r.resolution_notes ? `— ${r.resolution_notes}` : ''}</p>}
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-1.5 shrink-0">
                        {['dismiss', 'warn', 'remove', 'suspend'].map(action => {
                          const Icon = ACTION_ICONS[action];
                          return (
                            <Button key={action} variant="outline" size="sm" className="h-7 text-xs rounded-md capitalize" onClick={() => resolveReport(r.id, action)} data-testid={`resolve-${action}-${r.id}`}>
                              <Icon className="w-3 h-3 mr-1" /> {action}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleLayout>
  );
}
