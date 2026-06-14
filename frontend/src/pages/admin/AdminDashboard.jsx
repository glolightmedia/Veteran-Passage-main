import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, DollarSign, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import RoleLayout from '@/components/RoleLayout';
import { PageSEO } from '@/components/SEO';
import { LayoutDashboard, UserCog, FileCheck, Flag } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const adminNav = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: UserCog },
  { name: 'Resources', href: '/admin/resources', icon: FileCheck },
  { name: 'Reports', href: '/admin/reports', icon: Flag },
];

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/admin/analytics`, { withCredentials: true })
      .then(r => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = analytics ? [
    { label: 'Total Users', value: analytics.users.total, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Resources', value: analytics.resources.total, icon: FileText, color: 'text-purple-600 bg-purple-50' },
    { label: 'Pending Review', value: analytics.resources.pending, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
    { label: 'Active Promos', value: analytics.promotions.active, icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'Revenue', value: `$${(analytics.revenue.total || 0).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
  ] : [];

  return (
    <RoleLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      <PageSEO path="/admin" />
      <div className="space-y-6" data-testid="admin-dashboard">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="admin-heading">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-20" /></Card>)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.map((s, i) => (
                <Card key={i} className="rounded-xl border" data-testid={`admin-stat-${i}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                        <s.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-xl font-bold text-foreground">{s.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {analytics && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="rounded-xl border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Users by Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.users.by_role).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize rounded-full">{role}</Badge>
                          </div>
                          <span className="text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" /> Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(analytics.recent_activity || []).slice(0, 8).map((a, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <span className="text-xs text-muted-foreground">{a.action}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                      {(!analytics.recent_activity || analytics.recent_activity.length === 0) && (
                        <p className="text-xs text-muted-foreground">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </RoleLayout>
  );
}

export { adminNav };
