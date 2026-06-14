import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scale, Building, GraduationCap, Heart, Home, Globe, Users, CheckCircle, ExternalLink, Search, Phone, Mail } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const TYPE_ICONS = { legal_aid: Scale, employer: Building, school: GraduationCap, healthcare: Heart, housing: Home, nonprofit: Users, grant_provider: Globe };
const TYPE_COLORS = { legal_aid: 'text-amber-600 bg-amber-50', employer: 'text-blue-600 bg-blue-50', school: 'text-green-600 bg-green-50', healthcare: 'text-rose-600 bg-rose-50', housing: 'text-purple-600 bg-purple-50', nonprofit: 'text-gray-600 bg-gray-50', grant_provider: 'text-cyan-600 bg-cyan-50' };

const emptyForm = { organization_name: '', contact_name: '', contact_email: '', phone: '', website: '', partner_type: 'legal_aid', description: '', services_offered: '', states_served: '', accepts_oth: false, accepts_bcd: false, pro_bono: false };

export default function PartnersPage() {
  const [tab, setTab] = useState('directory');
  const [partners, setPartners] = useState([]);
  const [types, setTypes] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          axios.get(`${API}/api/partners/directory`),
          axios.get(`${API}/api/partners/types`)
        ]);
        setPartners(pRes.data.partners);
        setTypes(tRes.data.types);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const filtered = typeFilter === 'all' ? partners : partners.filter(p => p.partner_type === typeFilter);

  const submitApplication = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        services_offered: form.services_offered.split(',').map(s => s.trim()).filter(Boolean),
        states_served: form.states_served.split(',').map(s => s.trim()).filter(Boolean),
      };
      await axios.post(`${API}/api/partners/apply`, payload);
      toast.success("Application submitted! We'll review it within 48 hours.");
      setApplyOpen(false);
      setForm(emptyForm);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to submit'); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background" data-testid="partners-page">
      <PageSEO path="/partners" />
      <Navigation />

      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" data-testid="partners-heading">Partners' Lodge</h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Organizations dedicated to serving veterans. Find legal aid, employers, training programs, and more.
            </p>
          </motion.div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <Button variant={tab === 'directory' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setTab('directory')}>Directory</Button>
              <Button variant={tab === 'apply' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => { setTab('apply'); setApplyOpen(true); }}>Become a Partner</Button>
            </div>
            {tab === 'directory' && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 h-8 rounded-lg text-xs" data-testid="partner-type-filter"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Directory */}
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-24" /></Card>)}</div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-xl border">
              <CardContent className="p-10 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No partners yet</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to join! Click "Become a Partner" above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((p, i) => {
                const Icon = TYPE_ICONS[p.partner_type] || Users;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="border rounded-2xl hover:shadow-md transition-all" data-testid={`partner-${i}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[p.partner_type] || 'bg-gray-50'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-base font-bold text-foreground">{p.organization_name}</h3>
                              <Badge variant="outline" className="text-xs rounded-full capitalize">{p.partner_type.replace('_', ' ')}</Badge>
                              {p.pro_bono && <Badge className="text-xs rounded-full bg-green-100 text-green-700 border-0">Pro Bono</Badge>}
                              {p.accepts_oth && <Badge className="text-xs rounded-full bg-amber-100 text-amber-700 border-0">OTH Friendly</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{p.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                              {p.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.contact_email}</span>}
                              {p.website && (
                                <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-secondary hover:underline"><Globe className="w-3 h-3" />Website</a>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Application Dialog */}
          <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
            <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Partner Application</DialogTitle></DialogHeader>
              <form onSubmit={submitApplication} className="space-y-4" data-testid="partner-form">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Organization Name</Label><Input value={form.organization_name} onChange={e => setForm({...form, organization_name: e.target.value})} required className="rounded-lg" data-testid="partner-org-name" /></div>
                  <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} required className="rounded-lg" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} required className="rounded-lg" data-testid="partner-email" /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="rounded-lg" /></div>
                </div>
                <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="rounded-lg" /></div>
                <div>
                  <Label>Partner Type</Label>
                  <Select value={form.partner_type} onValueChange={v => setForm({...form, partner_type: v})}>
                    <SelectTrigger className="rounded-lg" data-testid="partner-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required rows={3} className="rounded-lg" data-testid="partner-desc" /></div>
                <div><Label>Services Offered (comma-separated)</Label><Input value={form.services_offered} onChange={e => setForm({...form, services_offered: e.target.value})} className="rounded-lg" /></div>
                <div><Label>States Served (comma-separated, or "Nationwide")</Label><Input value={form.states_served} onChange={e => setForm({...form, states_served: e.target.value})} className="rounded-lg" /></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Checkbox checked={form.accepts_oth} onCheckedChange={v => setForm({...form, accepts_oth: v})} /><Label>We accept OTH discharge veterans</Label></div>
                  <div className="flex items-center gap-2"><Checkbox checked={form.accepts_bcd} onCheckedChange={v => setForm({...form, accepts_bcd: v})} /><Label>We accept BCD/Dishonorable discharge veterans</Label></div>
                  <div className="flex items-center gap-2"><Checkbox checked={form.pro_bono} onCheckedChange={v => setForm({...form, pro_bono: v})} /><Label>We offer pro bono / free services</Label></div>
                </div>
                <Button type="submit" className="w-full rounded-lg bg-secondary hover:bg-secondary/90" disabled={submitting} data-testid="partner-submit">{submitting ? 'Submitting...' : 'Submit Application'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <Footer />
    </div>
  );
}
