import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, Star, TrendingUp } from 'lucide-react';
import RoleLayout from '@/components/RoleLayout';
import { PageSEO } from '@/components/SEO';
import { LayoutDashboard, ListPlus, Megaphone } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const providerNav = [
  { name: 'Overview', href: '/partner', icon: LayoutDashboard },
  { name: 'My Listings', href: '/partner/listings', icon: ListPlus },
  { name: 'Promotions', href: '/partner/promotions', icon: Megaphone },
];

export default function ProviderDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/provider/analytics`, { withCredentials: true })
      .then(r => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = analytics ? [
    { label: 'Total Listings', value: analytics.resources.total, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Approved', value: analytics.resources.approved, icon: Star, color: 'text-green-600 bg-green-50' },
    { label: 'Active Promos', value: analytics.promotions.active, icon: Megaphone, color: 'text-purple-600 bg-purple-50' },
    { label: 'Total Views', value: analytics.engagement.views, icon: Eye, color: 'text-amber-600 bg-amber-50' },
  ] : [];

  return (
    <RoleLayout navItems={providerNav} roleLabel="Partner" roleColor="bg-blue-100 text-blue-700">
      <PageSEO path="/provider" />
      <div className="space-y-6" data-testid="provider-dashboard">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="provider-heading">Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your resource listings and promotions</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-20" /></Card>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <Card key={i} className="rounded-xl border" data-testid={`provider-stat-${i}`}>
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
        )}

        <Card className="rounded-xl border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Quick Tips</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Create resource listings from the <strong>My Listings</strong> page</li>
              <li>Listings require admin approval before they appear in the directory</li>
              <li>Promote listings via <strong>Promotions</strong> for increased visibility</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

export { providerNav };
