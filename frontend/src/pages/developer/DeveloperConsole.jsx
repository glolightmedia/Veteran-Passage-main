import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Code, Activity, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import RoleLayout from '@/components/RoleLayout';
import { PageSEO } from '@/components/SEO';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const devNav = [
  { name: 'API Keys', href: '/developer', icon: Key },
  { name: 'Documentation', href: '/developer/docs', icon: BookOpen },
];

export default function DeveloperConsole() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyDesc, setKeyDesc] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchKeys = async () => {
    try {
      const { data } = await axios.get(`${API}/api/developer/api-keys`, { withCredentials: true });
      setKeys(data.api_keys);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await axios.post(`${API}/api/developer/api-keys`,
        { name: keyName, description: keyDesc || null },
        { withCredentials: true }
      );
      setNewKey(data.api_key);
      toast.success('API key created');
      fetchKeys();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setCreating(false);
  };

  const revokeKey = async (id) => {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/api/developer/api-keys/${id}`, { withCredentials: true });
      toast.success('API key revoked');
      fetchKeys();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    toast.success('Copied to clipboard');
  };

  return (
    <RoleLayout navItems={devNav} roleLabel="Developer" roleColor="bg-purple-100 text-purple-700">
      <PageSEO path="/developer" />
      <div className="space-y-6" data-testid="developer-console">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="developer-heading">API Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your API keys for programmatic access</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setNewKey(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg bg-secondary hover:bg-secondary/90" onClick={() => { setKeyName(''); setKeyDesc(''); setNewKey(null); }} data-testid="create-key-btn">
                <Plus className="w-4 h-4 mr-1" /> New Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader><DialogTitle>{newKey ? 'API Key Created' : 'Create API Key'}</DialogTitle></DialogHeader>
              {newKey ? (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium mb-2">Copy this key now. It won't be shown again.</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white p-2 rounded border font-mono break-all" data-testid="new-api-key">{newKey}</code>
                      <Button variant="outline" size="sm" className="shrink-0 h-8" onClick={() => copyKey(newKey)} data-testid="copy-key-btn">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full rounded-lg" onClick={() => setDialogOpen(false)}>Done</Button>
                </div>
              ) : (
                <form onSubmit={createKey} className="space-y-4" data-testid="create-key-form">
                  <div><Label>Key Name</Label><Input value={keyName} onChange={e => setKeyName(e.target.value)} required placeholder="e.g., Production API" className="rounded-lg" data-testid="key-name-input" /></div>
                  <div><Label>Description (optional)</Label><Input value={keyDesc} onChange={e => setKeyDesc(e.target.value)} placeholder="What is this key for?" className="rounded-lg" /></div>
                  <Button type="submit" className="w-full rounded-lg bg-secondary hover:bg-secondary/90" disabled={creating} data-testid="submit-key-btn">
                    {creating ? 'Creating...' : 'Generate Key'}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Keys List */}
        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-16" /></Card>)}</div>
        ) : keys.length === 0 ? (
          <Card className="rounded-xl border">
            <CardContent className="p-10 text-center">
              <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No API keys yet</p>
              <p className="text-sm text-muted-foreground">Create your first API key to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <Card key={k.id} className={`rounded-xl border ${k.revoked ? 'opacity-50' : ''}`} data-testid={`api-key-${k.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{k.name}</h3>
                        <Badge className={`text-xs rounded-full border-0 ${k.revoked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {k.revoked ? 'Revoked' : 'Active'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{k.key_prefix}...</span>
                        <span>{k.request_count} requests</span>
                        {k.last_used && <span>Last used: {new Date(k.last_used).toLocaleDateString()}</span>}
                        <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {!k.revoked && (
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-700" onClick={() => revokeKey(k.id)} data-testid={`revoke-key-${k.id}`}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Revoke
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* API Reference Card */}
        <Card className="rounded-xl border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Code className="w-4 h-4" /> Quick Reference</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-foreground mb-1">Authentication</p>
              <code className="text-xs text-muted-foreground font-mono">X-API-Key: vp_your_key_here</code>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-foreground mb-1">Get Resources</p>
              <code className="text-xs text-muted-foreground font-mono">GET /api/developer/public/resources?category=legal&limit=20</code>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-foreground mb-1">Get Platform Stats</p>
              <code className="text-xs text-muted-foreground font-mono">GET /api/developer/public/stats</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

export { devNav };
