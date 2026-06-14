import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ExternalLink, Check, Clock, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import RoleLayout from '@/components/RoleLayout';
import { providerNav } from './ProviderDashboard';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  removed: 'bg-gray-100 text-gray-700',
};

const emptyForm = { name: '', description: '', categories: '', eligibility: '', url: '', phone: '' };

export default function ProviderListings() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/provider/resources`, { withCredentials: true });
      setResources(data.resources);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchResources(); }, []);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setDialogOpen(true); };
  const openEdit = (r) => {
    setForm({ name: r.name, description: r.description, categories: (r.categories || []).join(', '), eligibility: r.eligibility || '', url: r.url, phone: r.phone || '' });
    setEditId(r.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, categories: form.categories.split(',').map(c => c.trim()).filter(Boolean) };
    try {
      if (editId) {
        await axios.put(`${API}/api/provider/resources/${editId}`, payload, { withCredentials: true });
        toast.success('Resource updated');
      } else {
        await axios.post(`${API}/api/provider/resources`, payload, { withCredentials: true });
        toast.success('Resource created — pending admin approval');
      }
      setDialogOpen(false);
      fetchResources();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
    setSaving(false);
  };

  const deleteResource = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await axios.delete(`${API}/api/provider/resources/${id}`, { withCredentials: true });
      toast.success('Resource deleted');
      fetchResources();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  return (
    <RoleLayout navItems={providerNav} roleLabel="Provider" roleColor="bg-blue-100 text-blue-700">
      <div className="space-y-5" data-testid="provider-listings-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Listings</h1>
            <p className="text-sm text-muted-foreground mt-1">{resources.length} resource listings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg bg-secondary hover:bg-secondary/90" onClick={openCreate} data-testid="create-listing-btn">
                <Plus className="w-4 h-4 mr-1" /> New Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl">
              <DialogHeader><DialogTitle>{editId ? 'Edit Listing' : 'Create Listing'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="listing-form">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="rounded-lg" data-testid="listing-name-input" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required rows={3} className="rounded-lg" data-testid="listing-desc-input" /></div>
                <div><Label>Categories (comma-separated)</Label><Input value={form.categories} onChange={e => setForm({...form, categories: e.target.value})} placeholder="legal, employment, housing" className="rounded-lg" data-testid="listing-cat-input" /></div>
                <div><Label>Eligibility</Label><Input value={form.eligibility} onChange={e => setForm({...form, eligibility: e.target.value})} className="rounded-lg" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Website URL</Label><Input value={form.url} onChange={e => setForm({...form, url: e.target.value})} required type="url" className="rounded-lg" data-testid="listing-url-input" /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="rounded-lg" /></div>
                </div>
                <Button type="submit" className="w-full rounded-lg bg-secondary hover:bg-secondary/90" disabled={saving} data-testid="listing-submit-btn">
                  {saving ? 'Saving...' : editId ? 'Update Listing' : 'Create Listing'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-24" /></Card>)}</div>
        ) : resources.length === 0 ? (
          <Card className="rounded-xl border">
            <CardContent className="p-10 text-center">
              <Plus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No listings yet</p>
              <p className="text-sm text-muted-foreground">Create your first resource listing</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {resources.map(r => (
              <Card key={r.id} className="rounded-xl border" data-testid={`listing-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground">{r.name}</h3>
                        <Badge className={`text-xs rounded-full border-0 ${STATUS_STYLES[r.status] || ''}`}>{r.status}</Badge>
                        {r.is_promoted && <Badge className="text-xs rounded-full bg-purple-100 text-purple-700 border-0">{r.promotion?.badge || 'Promoted'}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(r.categories || []).map(c => <Badge key={c} variant="outline" className="text-xs rounded-full">{c}</Badge>)}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)} data-testid={`edit-listing-${r.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => deleteResource(r.id)} data-testid={`delete-listing-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
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
