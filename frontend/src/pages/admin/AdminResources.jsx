import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ExternalLink, Clock, LayoutDashboard, UserCog, FileCheck, Flag } from 'lucide-react';
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

export default function AdminResources() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/resources/pending`, { withCredentials: true });
      setPending(data.resources);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const approve = async (id) => {
    try {
      await axios.put(`${API}/api/admin/resources/${id}/approve`, {}, { withCredentials: true });
      toast.success('Resource approved');
      fetchPending();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const reject = async (id) => {
    try {
      await axios.put(`${API}/api/admin/resources/${id}/reject`, {}, { withCredentials: true });
      toast.success('Resource rejected');
      fetchPending();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  return (
    <RoleLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      <div className="space-y-5" data-testid="admin-resources-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resource Approval</h1>
          <p className="text-sm text-muted-foreground mt-1">{pending.length} pending review</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-24" /></Card>)}
          </div>
        ) : pending.length === 0 ? (
          <Card className="rounded-xl border">
            <CardContent className="p-10 text-center">
              <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-base font-medium text-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground">No resources pending approval</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <Card key={r.id} className="rounded-xl border" data-testid={`pending-resource-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-foreground truncate">{r.name}</h3>
                        <Badge variant="outline" className="text-xs rounded-full shrink-0">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">by {r.provider_name || 'Unknown'} &middot; {new Date(r.created_at).toLocaleDateString()}</p>
                      <p className="text-sm text-foreground line-clamp-2 mb-2">{r.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {(r.categories || []).map(c => <Badge key={c} variant="secondary" className="text-xs rounded-full">{c}</Badge>)}
                      </div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-secondary hover:underline mt-2">
                          <ExternalLink className="w-3 h-3" /> {r.url}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white rounded-lg" onClick={() => approve(r.id)} data-testid={`approve-btn-${r.id}`}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-red-600 border-red-200 hover:bg-red-50" onClick={() => reject(r.id)} data-testid={`reject-btn-${r.id}`}>
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
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
