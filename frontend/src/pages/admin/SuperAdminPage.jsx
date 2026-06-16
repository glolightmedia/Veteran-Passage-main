import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  LayoutDashboard, Users, FileText, MessageSquare, Briefcase, DollarSign,
  Activity, Megaphone, PenTool, Trash2, Pencil, Plus, Search, Shield,
  Key, Eye, Bot, Heart, ChevronLeft, ChevronRight, RotateCcw, Crown
} from 'lucide-react';
import RoleLayout from '@/components/RoleLayout';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const superNav = [
  { name: 'Command Center', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Resources', href: '/admin/resources', icon: FileText },
  { name: 'Reports', href: '/admin/reports', icon: Shield },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'blog', label: 'Blog', icon: PenTool },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'forum', label: 'Forum', icon: MessageSquare },
  { id: 'mentorship', label: 'Mentorship', icon: Heart },
  { id: 'transactions', label: 'Revenue', icon: DollarSign },
  { id: 'leads', label: 'Leads', icon: Eye },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: Eye },
  { id: 'links', label: 'Link Health', icon: Activity },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'audit', label: 'Audit Log', icon: Activity },
];

const ROLE_OPTIONS = [
  { value: 'veteran', label: 'Veteran' },
  { value: 'partner', label: 'Partner' },
  { value: 'content_manager', label: 'Content Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'SuperAdmin' },
];

export default function SuperAdminPage() {
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [widgets, setWidgets] = useState(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'veteran', partner_subtype: '', organization: '', state: '', billing_plan: '' });
  const [authEvents, setAuthEvents] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [eventSummary, setEventSummary] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [brokenLinks, setBrokenLinks] = useState([]);
  const [linkChecking, setLinkChecking] = useState(false);

  // Fetch deep analytics + widgets
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/superadmin/analytics/deep`, { withCredentials: true }).catch(() => null),
      axios.get(`${API}/api/superadmin/widgets`, { withCredentials: true }).catch(() => null),
    ]).then(([aRes, wRes]) => {
      if (aRes) setAnalytics(aRes.data);
      if (wRes) setWidgets(wRes.data);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch tab data
  const fetchTabData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = {
        blog: '/api/superadmin/blog',
        announcements: '/api/superadmin/announcements',
        jobs: '/api/superadmin/all-jobs',
        forum: '/api/superadmin/all-forum-posts',
        mentorship: '/api/superadmin/all-mentorship',
        transactions: '/api/superadmin/all-transactions',
        leads: '/api/superadmin/leads?status=all',
        'api-keys': '/api/superadmin/all-api-keys',
      };
      if (endpoints[tab]) {
        const { data: d } = await axios.get(`${API}${endpoints[tab]}`, { withCredentials: true });
        setData(d[Object.keys(d).find(k => Array.isArray(d[k]))] || []);
      }
      if (tab === 'security') {
        const { data: d } = await axios.get(`${API}/api/superadmin/security/auth-events`, { withCredentials: true });
        setAuthEvents(d);
        setData([]);
      } else if (tab === 'billing') {
        const { data: d } = await axios.get(`${API}/api/superadmin/billing/subscriptions`, { withCredentials: true });
        setSubscriptions(d.subscriptions);
        setData([]);
      } else if (tab === 'analytics') {
        const [sumRes, funRes] = await Promise.all([
          axios.get(`${API}/api/events/summary`, { withCredentials: true }).catch(() => null),
          axios.get(`${API}/api/events/funnel`, { withCredentials: true }).catch(() => null),
        ]);
        if (sumRes) setEventSummary(sumRes.data);
        if (funRes) setFunnel(funRes.data.funnel);
        setData([]);
      } else if (tab === 'links') {
        const { data: d } = await axios.get(`${API}/api/link-health/broken`, { withCredentials: true });
        setBrokenLinks(d.broken_links);
        setData([]);
      } else if (tab === 'audit') {
        const params = new URLSearchParams({ page: auditPage, limit: 30 });
        if (auditFilter) params.append('action', auditFilter);
        const { data: d } = await axios.get(`${API}/api/superadmin/audit-log?${params}`, { withCredentials: true });
        setData(d.logs);
        setAuditTotal(d.total);
      }
    } catch {}
    setLoading(false);
  }, [tab, auditFilter, auditPage]);

  useEffect(() => { if (tab !== 'overview') fetchTabData(); }, [tab, fetchTabData]);

  // Blog CRUD
  const saveBlog = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await axios.put(`${API}/api/superadmin/blog/${editItem}`, form, { withCredentials: true });
        toast.success('Blog post updated');
      } else {
        await axios.post(`${API}/api/superadmin/blog`, form, { withCredentials: true });
        toast.success('Blog post created');
      }
      setDialogOpen(false);
      fetchTabData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  const deleteBlog = async (id) => {
    if (!window.confirm('Delete this blog post?')) return;
    try {
      await axios.delete(`${API}/api/superadmin/blog/${id}`, { withCredentials: true });
      toast.success('Deleted');
      fetchTabData();
    } catch { toast.error('Failed'); }
  };

  // Announcements
  const saveAnnouncement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await axios.put(`${API}/api/superadmin/announcements/${editItem}`, form, { withCredentials: true });
      } else {
        await axios.post(`${API}/api/superadmin/announcements`, form, { withCredentials: true });
      }
      toast.success('Saved');
      setDialogOpen(false);
      fetchTabData();
    } catch { toast.error('Failed'); }
    setSaving(false);
  };

  const deleteAnnouncement = async (id) => {
    try { await axios.delete(`${API}/api/superadmin/announcements/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchTabData(); } catch { toast.error('Failed'); }
  };

  // Create User
  const createNewUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: d } = await axios.post(`${API}/api/superadmin/users/create`, newUser, { withCredentials: true });
      toast.success(d.message);
      setCreateUserOpen(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'veteran', partner_subtype: '', organization: '', state: '', billing_plan: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  // Delete job
  const deleteJob = async (id) => {
    if (!window.confirm('Delete this job?')) return;
    try { await axios.delete(`${API}/api/superadmin/jobs/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchTabData(); } catch { toast.error('Failed'); }
  };

  // Delete forum post
  const deleteForumPost = async (id) => {
    if (!window.confirm('Delete this forum post and all replies?')) return;
    try { await axios.delete(`${API}/api/forum/posts/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchTabData(); } catch { toast.error('Failed'); }
  };

  const openBlogEditor = (post = null) => {
    setEditItem(post?.id || null);
    setForm(post ? { title: post.title, slug: post.slug, content: post.content, excerpt: post.excerpt, category: post.category, tags: (post.tags || []).join(', '), status: post.status } : { title: '', slug: '', content: '', excerpt: '', category: 'general', tags: '', status: 'draft' });
    setDialogOpen(true);
  };

  const openAnnouncementEditor = (ann = null) => {
    setEditItem(ann?.id || null);
    setForm(ann ? { title: ann.title, content: ann.content, type: ann.type, active: ann.active } : { title: '', content: '', type: 'info', active: true });
    setDialogOpen(true);
  };

  const stats = analytics ? [
    { label: 'Users', value: analytics.users.total, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Resources', value: analytics.resources.total, icon: FileText, color: 'text-purple-600 bg-purple-50' },
    { label: 'Jobs', value: analytics.jobs.active, icon: Briefcase, color: 'text-green-600 bg-green-50' },
    { label: 'Forum Posts', value: analytics.forum.posts, icon: MessageSquare, color: 'text-amber-600 bg-amber-50' },
    { label: 'Chat Sessions', value: analytics.chat.sessions, icon: Bot, color: 'text-cyan-600 bg-cyan-50' },
    { label: 'Mentors', value: analytics.mentorship.active_mentors, icon: Heart, color: 'text-rose-600 bg-rose-50' },
    { label: 'Revenue', value: `$${(analytics.revenue.total || 0).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Blog Posts', value: analytics.blog.published, icon: PenTool, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Pending Reports', value: analytics.moderation.pending, icon: Shield, color: 'text-red-600 bg-red-50' },
    { label: 'API Keys', value: analytics.developer.active_api_keys, icon: Key, color: 'text-gray-600 bg-gray-50' },
  ] : [];

  return (
    <RoleLayout navItems={superNav} roleLabel="Superadmin" roleColor="bg-gradient-to-r from-amber-100 to-red-100 text-red-800">
      <PageSEO path="/admin" />
      <div className="space-y-5" data-testid="superadmin-page">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-amber-500" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground" data-testid="superadmin-heading">Superadmin Command Center</h1>
            <p className="text-sm text-muted-foreground">Full control over every aspect of Veteran Passage</p>
          </div>
          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-secondary hover:bg-secondary/90" data-testid="create-user-btn"><Plus className="w-4 h-4 mr-1" /> Create User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              <form onSubmit={createNewUser} className="space-y-3" data-testid="create-user-form">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Full Name</Label><Input value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required className="rounded-lg h-9" data-testid="cu-name" /></div>
                  <div><Label className="text-xs">Email</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required className="rounded-lg h-9" data-testid="cu-email" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Password</Label><Input value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required minLength={6} className="rounded-lg h-9" data-testid="cu-password" /></div>
                  <div>
                    <Label className="text-xs">Role</Label>
                    <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                      <SelectTrigger className="rounded-lg h-9" data-testid="cu-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {newUser.role === 'partner' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Partner Subtype</Label>
                        <Select value={newUser.partner_subtype} onValueChange={v => setNewUser({...newUser, partner_subtype: v})}>
                          <SelectTrigger className="rounded-lg h-9" data-testid="cu-subtype"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {['employer','legal_aid','school','grant_provider','housing','healthcare','nonprofit'].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_',' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Organization</Label><Input value={newUser.organization} onChange={e => setNewUser({...newUser, organization: e.target.value})} className="rounded-lg h-9" data-testid="cu-org" /></div>
                    </div>
                    {newUser.partner_subtype === 'employer' && (
                      <div>
                        <Label className="text-xs">Billing Plan</Label>
                        <Select value={newUser.billing_plan} onValueChange={v => setNewUser({...newUser, billing_plan: v})}>
                          <SelectTrigger className="rounded-lg h-9" data-testid="cu-plan"><SelectValue placeholder="Select plan..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard — $39/mo (1 job)</SelectItem>
                            <SelectItem value="growth">Growth — $99/mo (5 jobs)</SelectItem>
                            <SelectItem value="featured">Featured — $199/mo (10 jobs)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
                <div><Label className="text-xs">State</Label><Input value={newUser.state} onChange={e => setNewUser({...newUser, state: e.target.value})} className="rounded-lg h-9" placeholder="e.g., Texas" /></div>
                <Button type="submit" className="w-full rounded-lg bg-secondary hover:bg-secondary/90" disabled={saving} data-testid="cu-submit">{saving ? 'Creating...' : 'Create User'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <Button key={t.id} variant={tab === t.id ? 'default' : 'ghost'} size="sm" className="rounded-lg text-xs shrink-0" onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
              <t.icon className="w-3.5 h-3.5 mr-1" /> {t.label}
            </Button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {stats.map((s, i) => (
                <Card key={i} className="rounded-xl border" data-testid={`stat-${i}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-4 h-4" /></div>
                      <div><p className="text-[10px] text-muted-foreground">{s.label}</p><p className="text-lg font-bold text-foreground">{s.value}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {analytics && (
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="rounded-xl border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Users by Role</CardTitle></CardHeader>
                  <CardContent>{Object.entries(analytics.users.by_role).map(([r, c]) => (
                    <div key={r} className="flex justify-between py-1 border-b last:border-0"><Badge variant="outline" className="text-xs capitalize rounded-full">{r}</Badge><span className="text-sm font-bold">{c}</span></div>
                  ))}</CardContent>
                </Card>
                <Card className="rounded-xl border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Engagement Metrics</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm" data-testid="engagement-metrics">
                    <div className="flex justify-between"><span className="text-muted-foreground">Intake completed</span><span className="font-bold">{analytics.engagement?.intake_completed || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Intake rate</span><span className="font-bold">{analytics.engagement?.intake_rate || 0}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Active trackers</span><span className="font-bold">{analytics.engagement?.active_progress_trackers || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Actions logged</span><span className="font-bold">{analytics.engagement?.total_actions_logged || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Recs viewed</span><span className="font-bold">{analytics.engagement?.recommendations_viewed || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Leads</span><span className="font-bold text-secondary">{analytics.engagement?.total_leads || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">New leads</span><span className="font-bold text-secondary">{analytics.engagement?.new_leads || 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Donations</span><span className="font-bold">{analytics.engagement?.total_donations || 0}</span></div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Platform Health</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">New users (30d)</span><span className="font-bold">{analytics.users.recent_signups_30d}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pending resources</span><span className="font-bold">{analytics.resources.pending}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Forum replies</span><span className="font-bold">{analytics.forum.replies}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mentorship requests</span><span className="font-bold">{analytics.mentorship.requests}</span></div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Widgets */}
            {widgets && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Failed Logins (24h)', value: widgets.failed_logins_24h, color: widgets.failed_logins_24h > 0 ? 'text-red-600' : 'text-foreground' },
                  { label: 'Broken Links', value: widgets.broken_links, color: widgets.broken_links > 0 ? 'text-amber-600' : 'text-foreground' },
                  { label: 'Pending Jobs', value: widgets.pending_jobs },
                  { label: 'Pending Partners', value: widgets.pending_partners },
                  { label: 'Leads Today', value: widgets.leads_today, color: 'text-green-600' },
                  { label: 'Paid Employers', value: widgets.active_paid_employers },
                  { label: 'Checkout Conv.', value: `${widgets.checkout_conversion}%` },
                  { label: 'Errors (24h)', value: widgets.recent_errors_24h, color: widgets.recent_errors_24h > 0 ? 'text-red-600' : 'text-foreground' },
                ].map((w, i) => (
                  <div key={i} className="p-2.5 border rounded-lg" data-testid={`widget-${i}`}>
                    <p className="text-[10px] text-muted-foreground">{w.label}</p>
                    <p className={`text-lg font-bold ${w.color || 'text-foreground'}`}>{w.value}</p>
                  </div>
                ))}
              </div>
            )}

            {widgets?.top_apply_jobs?.length > 0 && (
              <Card className="rounded-xl border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Top Jobs by Apply Clicks</CardTitle></CardHeader>
                <CardContent>{widgets.top_apply_jobs.map((j, i) => (
                  <div key={i} className="flex justify-between py-1 border-b last:border-0 text-sm"><span className="text-muted-foreground truncate">{j.title}</span><span className="font-bold">{j.clicks}</span></div>
                ))}</CardContent>
              </Card>
            )}
          </div>
        )}

        {/* BLOG TAB */}
        {tab === 'blog' && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-bold">Blog Posts</h2>
              <Button size="sm" className="rounded-lg bg-secondary hover:bg-secondary/90" onClick={() => openBlogEditor()} data-testid="new-blog-btn"><Plus className="w-4 h-4 mr-1" /> New Post</Button>
            </div>
            <Dialog open={dialogOpen && tab === 'blog'} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editItem ? 'Edit Blog Post' : 'New Blog Post'}</DialogTitle></DialogHeader>
                <form onSubmit={saveBlog} className="space-y-4" data-testid="blog-form">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} required className="rounded-lg" data-testid="blog-title" /></div>
                    <div><Label>Slug</Label><Input value={form.slug || ''} onChange={e => setForm({...form, slug: e.target.value})} placeholder="my-post-url" className="rounded-lg" data-testid="blog-slug" /></div>
                  </div>
                  <div><Label>Excerpt</Label><Input value={form.excerpt || ''} onChange={e => setForm({...form, excerpt: e.target.value})} className="rounded-lg" /></div>
                  <div><Label>Content</Label><Textarea value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} rows={10} required className="rounded-lg" data-testid="blog-content" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Category</Label><Input value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="rounded-lg" /></div>
                    <div><Label>Tags (comma-separated)</Label><Input value={form.tags || ''} onChange={e => setForm({...form, tags: e.target.value})} className="rounded-lg" /></div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status || 'draft'} onValueChange={v => setForm({...form, status: v})}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full rounded-lg bg-secondary hover:bg-secondary/90" disabled={saving} data-testid="blog-submit">{saving ? 'Saving...' : 'Save'}</Button>
                </form>
              </DialogContent>
            </Dialog>
            {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : data.length === 0 ? <p className="text-sm text-muted-foreground">No blog posts yet.</p> : (
              <div className="space-y-2">
                {data.map(p => (
                  <Card key={p.id} className="rounded-xl border" data-testid={`blog-${p.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2"><h3 className="text-sm font-bold">{p.title}</h3><Badge className={`text-xs rounded-full border-0 ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</Badge></div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.views || 0} views &middot; {new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openBlogEditor(p)}><Pencil className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteBlog(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab === 'announcements' && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-bold">Announcements</h2>
              <Button size="sm" className="rounded-lg bg-secondary hover:bg-secondary/90" onClick={() => openAnnouncementEditor()} data-testid="new-ann-btn"><Plus className="w-4 h-4 mr-1" /> New</Button>
            </div>
            <Dialog open={dialogOpen && tab === 'announcements'} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader><DialogTitle>{editItem ? 'Edit' : 'New'} Announcement</DialogTitle></DialogHeader>
                <form onSubmit={saveAnnouncement} className="space-y-4">
                  <div><Label>Title</Label><Input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} required className="rounded-lg" data-testid="ann-title" /></div>
                  <div><Label>Content</Label><Textarea value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} rows={3} className="rounded-lg" data-testid="ann-content" /></div>
                  <div className="flex items-center gap-3"><Switch checked={form.active !== false} onCheckedChange={v => setForm({...form, active: v})} /><Label>Active</Label></div>
                  <Button type="submit" className="w-full rounded-lg bg-secondary hover:bg-secondary/90" disabled={saving}>Save</Button>
                </form>
              </DialogContent>
            </Dialog>
            {data.length === 0 ? <p className="text-sm text-muted-foreground">No announcements.</p> : data.map(a => (
              <Card key={a.id} className="rounded-xl border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div><div className="flex items-center gap-2"><h3 className="text-sm font-bold">{a.title}</h3><Badge className={`text-xs rounded-full border-0 ${a.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{a.active ? 'Active' : 'Inactive'}</Badge></div><p className="text-xs text-muted-foreground mt-0.5">{a.content?.slice(0, 80)}</p></div>
                  <div className="flex gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openAnnouncementEditor(a)}><Pencil className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteAnnouncement(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* JOBS TAB */}
        {tab === 'jobs' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">All Jobs ({data.length})</h2>
            {data.map(j => (
              <Card key={j.id} className="rounded-xl border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div><h3 className="text-sm font-bold">{j.title}</h3><p className="text-xs text-muted-foreground">{j.company} &middot; {j.location}</p></div>
                  <Button variant="ghost" size="sm" className="h-7 text-red-500" onClick={() => deleteJob(j.id)} data-testid={`del-job-${j.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* FORUM TAB */}
        {tab === 'forum' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">All Forum Posts ({data.length})</h2>
            {data.map(p => (
              <Card key={p.id} className="rounded-xl border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div><div className="flex items-center gap-2"><h3 className="text-sm font-bold">{p.title}</h3><Badge variant="outline" className="text-xs rounded-full">{p.category}</Badge></div><p className="text-xs text-muted-foreground">{p.author_name} &middot; {p.reply_count || 0} replies &middot; {p.upvotes || 0} upvotes</p></div>
                  <Button variant="ghost" size="sm" className="h-7 text-red-500" onClick={() => deleteForumPost(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* MENTORSHIP TAB */}
        {tab === 'mentorship' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Mentorship Requests ({data.length})</h2>
            {data.map(r => (
              <Card key={r.id} className="rounded-xl border">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2"><span className="text-sm">{r.mentee_name} → {r.mentor_name}</span><Badge className={`text-xs rounded-full border-0 ${r.status === 'accepted' ? 'bg-green-100 text-green-700' : r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.status}</Badge></div>
                  <p className="text-xs text-muted-foreground mt-1">{r.message || 'No message'} &middot; {new Date(r.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {tab === 'transactions' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Payment Transactions ({data.length})</h2>
            {data.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : data.map(t => (
              <Card key={t.id} className="rounded-xl border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div><p className="text-sm font-bold">${t.amount} {t.currency?.toUpperCase()}</p><p className="text-xs text-muted-foreground">{t.plan} plan &middot; {new Date(t.created_at).toLocaleDateString()}</p></div>
                  <Badge className={`text-xs rounded-full border-0 ${t.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t.payment_status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* API KEYS TAB */}
        {tab === 'api-keys' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">All Developer API Keys ({data.length})</h2>
            {data.map(k => (
              <Card key={k.id} className="rounded-xl border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div><p className="text-sm font-bold">{k.name} <span className="font-mono text-xs text-muted-foreground">({k.key_prefix}...)</span></p><p className="text-xs text-muted-foreground">{k.request_count} requests &middot; {k.revoked ? 'Revoked' : 'Active'}</p></div>
                  <Badge className={`text-xs rounded-full border-0 ${k.revoked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{k.revoked ? 'Revoked' : 'Active'}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* LEADS TAB */}
        {tab === 'leads' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Help Request Leads ({data.length})</h2>
            {data.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet. Leads are generated when veterans click "Request Help" on the dashboard.</p> : data.map(l => {
              const STATUS_L = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-amber-100 text-amber-700', converted: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600' };
              return (
                <Card key={l.id} className="rounded-xl border" data-testid={`lead-${l.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold">{l.user_name || 'Anonymous'}</h3>
                          <Badge className={`text-xs rounded-full border-0 ${STATUS_L[l.status] || ''}`}>{l.status}</Badge>
                          <Badge variant="outline" className="text-xs rounded-full capitalize">{l.category?.replace('-', ' ')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{l.user_email} &middot; {l.user_state} &middot; {l.user_discharge}</p>
                        {l.message && <p className="text-xs text-foreground mt-1">{l.message}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(l.created_at).toLocaleString()}</p>
                      </div>
                      <Select onValueChange={async (v) => {
                        try { await axios.put(`${API}/api/superadmin/leads/${l.id}`, { status: v }, { withCredentials: true }); toast.success('Updated'); fetchTabData(); } catch { toast.error('Failed'); }
                      }}>
                        <SelectTrigger className="w-28 h-7 text-xs rounded-md"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* SECURITY TAB */}
        {tab === 'security' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Auth Security ({authEvents?.period_hours || 24}h)</h2>
            {authEvents ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Failed Logins', value: authEvents.failed_logins, color: authEvents.failed_logins > 0 ? 'text-red-600 bg-red-50' : 'bg-muted/30' },
                    { label: 'Locked Accounts', value: authEvents.locked_accounts, color: authEvents.locked_accounts > 0 ? 'text-amber-600 bg-amber-50' : 'bg-muted/30' },
                    { label: 'Password Resets', value: authEvents.password_resets, color: 'bg-muted/30' },
                  ].map((s, i) => (
                    <div key={i} className={`p-3 rounded-xl ${s.color}`}>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color?.includes('text-') ? '' : 'text-foreground'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {Object.keys(authEvents.failure_reasons || {}).length > 0 && (
                  <Card className="rounded-xl border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Failure Reasons</CardTitle></CardHeader>
                    <CardContent>{Object.entries(authEvents.failure_reasons).map(([reason, count]) => (
                      <div key={reason} className="flex justify-between py-1 border-b last:border-0 text-sm"><Badge variant="outline" className="text-xs rounded-full">{reason.replace('_',' ')}</Badge><span className="font-bold">{count}</span></div>
                    ))}</CardContent>
                  </Card>
                )}
                {authEvents.recent_failures?.length > 0 && (
                  <Card className="rounded-xl border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Failed Logins</CardTitle></CardHeader>
                    <CardContent className="space-y-1">{authEvents.recent_failures.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 py-1 border-b last:border-0 text-xs">
                        <span className="text-muted-foreground">{f.email}</span>
                        <Badge variant="outline" className="text-[10px] rounded-full">{f.reason?.replace('_',' ')}</Badge>
                        <span className="text-muted-foreground ml-auto">{new Date(f.created_at).toLocaleString()}</span>
                      </div>
                    ))}</CardContent>
                  </Card>
                )}
              </>
            ) : <p className="text-sm text-muted-foreground">Loading...</p>}
          </div>
        )}

        {/* BILLING TAB */}
        {tab === 'billing' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Employer Subscriptions ({subscriptions.length})</h2>
            {subscriptions.length === 0 ? <p className="text-sm text-muted-foreground">No active subscriptions. Create an Employer partner via "Create User" to start.</p> : (
              <div className="space-y-2">{subscriptions.map(s => (
                <Card key={s.id} className="rounded-xl border">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2"><h3 className="text-sm font-bold">{s.organization || s.user_name || s.user_email}</h3><Badge className={`text-xs rounded-full border-0 ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</Badge></div>
                      <p className="text-xs text-muted-foreground">{s.plan_name} — ${s.price}/mo &middot; {s.jobs_used}/{s.job_limit} jobs used &middot; Expires: {new Date(s.expires_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-lg font-bold text-foreground">${s.price}</span>
                  </CardContent>
                </Card>
              ))}</div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Product Analytics</h2>
            {funnel.length > 0 && (
              <Card className="rounded-xl border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Conversion Funnel</CardTitle></CardHeader>
                <CardContent>
                  {funnel.map((step, i) => {
                    const maxCount = funnel[0]?.count || 1;
                    const pct = Math.round((step.count / maxCount) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <span className="text-xs text-muted-foreground w-28">{step.label}</span>
                        <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-12 text-right">{step.count}</span>
                        <span className="text-[10px] text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
            {eventSummary && (
              <Card className="rounded-xl border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Event Summary ({eventSummary.total_events} total)</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(eventSummary.by_event || {}).slice(0, 12).map(([name, count]) => (
                      <div key={name} className="flex justify-between py-1 px-2 border rounded-lg text-xs">
                        <span className="text-muted-foreground truncate">{name}</span>
                        <span className="font-bold ml-2">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {!eventSummary && <p className="text-sm text-muted-foreground">No analytics data yet. Events are tracked automatically as users interact.</p>}
          </div>
        )}

        {/* LINK HEALTH TAB */}
        {tab === 'links' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Link Health ({brokenLinks.length} broken)</h2>
              <Button size="sm" className="rounded-lg bg-secondary hover:bg-secondary/90" disabled={linkChecking} onClick={async () => {
                setLinkChecking(true);
                try {
                  const { data: d } = await axios.post(`${API}/api/link-health/check`, {}, { withCredentials: true });
                  toast.success(`Checked ${d.checked} links. ${d.broken} broken.`);
                  const { data: b } = await axios.get(`${API}/api/link-health/broken`, { withCredentials: true });
                  setBrokenLinks(b.broken_links);
                } catch { toast.error('Check failed'); }
                setLinkChecking(false);
              }} data-testid="run-link-check">
                {linkChecking ? 'Checking...' : 'Run Link Check'}
              </Button>
            </div>
            {brokenLinks.length === 0 ? (
              <Card className="rounded-xl border"><CardContent className="p-6 text-center text-sm text-muted-foreground">No broken links detected. Run a check to scan all partner URLs.</CardContent></Card>
            ) : (
              <div className="space-y-2">{brokenLinks.map(l => (
                <Card key={l.id} className="rounded-xl border border-red-200 bg-red-50/30">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{l.source_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-md">{l.url}</p>
                      <p className="text-[10px] text-red-600">HTTP {l.http_status || 'timeout'} &middot; {l.source} &middot; Last checked: {l.last_checked ? new Date(l.last_checked).toLocaleString() : 'N/A'}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                      await axios.delete(`${API}/api/link-health/broken/${l.id}`, { withCredentials: true });
                      setBrokenLinks(prev => prev.filter(x => x.id !== l.id));
                      toast.success('Dismissed');
                    }}>Dismiss</Button>
                  </CardContent>
                </Card>
              ))}</div>
            )}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {tab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">Audit Log</h2>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Filter by action..." value={auditFilter} onChange={e => { setAuditFilter(e.target.value); setAuditPage(1); }} className="pl-9 h-8 rounded-lg text-xs" data-testid="audit-filter" />
              </div>
              <span className="text-xs text-muted-foreground">{auditTotal} entries</span>
            </div>
            {data.map(l => (
              <Card key={l.id} className="rounded-xl border">
                <CardContent className="p-2.5 flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] rounded-full shrink-0">{l.action}</Badge>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{JSON.stringify(l.metadata || {}).slice(0, 100)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{new Date(l.created_at).toLocaleString()}</span>
                </CardContent>
              </Card>
            ))}
            {auditTotal > 30 && (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" className="h-7" disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-xs text-muted-foreground self-center">Page {auditPage}</span>
                <Button variant="outline" size="sm" className="h-7" onClick={() => setAuditPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleLayout>
  );
}
