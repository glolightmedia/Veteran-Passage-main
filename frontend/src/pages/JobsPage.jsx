import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, MapPin, DollarSign, Star, ExternalLink, Shield, Zap, Clock,
  CheckCircle, Lock, ArrowRight, HandHelping, Briefcase, Filter
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDischargeTier } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';
import { trackEvent } from '@/utils/analytics';

const API = process.env.REACT_APP_BACKEND_URL;

const BADGE_CONFIG = {
  second_chance_friendly: { label: 'Second Chance Friendly', color: 'bg-green-100 text-green-800' },
  vet_preferred: { label: 'Vet Preferred', color: 'bg-blue-100 text-blue-800' },
  fast_hiring: { label: 'Fast Hiring', color: 'bg-amber-100 text-amber-800' },
  easy_apply: { label: 'Easy Apply', color: 'bg-purple-100 text-purple-800' },
  no_degree_required: { label: 'No Degree Required', color: 'bg-teal-100 text-teal-800' },
  benefits_available: { label: 'Benefits Available', color: 'bg-indigo-100 text-indigo-800' },
  remote: { label: 'Remote', color: 'bg-cyan-100 text-cyan-800' },
};

function JobBadges({ job }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(BADGE_CONFIG).map(([key, cfg]) =>
        job[key] ? <Badge key={key} className={`text-[11px] rounded-full border-0 font-medium px-2.5 py-0.5 ${cfg.color}`}>{cfg.label}</Badge> : null
      )}
    </div>
  );
}

function SalaryDisplay({ job }) {
  if (!job.salary_min && !job.salary_max) return null;
  const fmt = (n) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (job.salary_min && job.salary_max) return <span>{fmt(job.salary_min)}–{fmt(job.salary_max)}/yr</span>;
  return <span>{fmt(job.salary_min || job.salary_max)}/yr</span>;
}

export default function JobsPage() {
  const { user } = useAuth();
  const tier = getDischargeTier(user?.discharge);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [secondChance, setSecondChance] = useState(tier !== 'green');
  const [fastHiring, setFastHiring] = useState(false);
  const [sort, setSort] = useState('best_fit');
  const [categories, setCategories] = useState([]);
  const [applyModal, setApplyModal] = useState(null);
  const [helpModal, setHelpModal] = useState(null);
  const [helpMsg, setHelpMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/jobs/categories`, { withCredentials: true })
      .then(r => setCategories(r.data.categories)).catch(() => {});
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (search) params.append('search', search);
      if (category !== 'all') params.append('category', category);
      if (secondChance) params.append('second_chance', 'true');
      if (fastHiring) params.append('fast_hiring', 'true');
      const { data: d } = await axios.get(`${API}/api/jobs?${params}`, { withCredentials: true });
      setData(d);
    } catch {}
    setLoading(false);
  }, [search, category, secondChance, fastHiring, sort]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const trackApply = async (job) => {
    trackEvent('job_apply_clicked', { job_id: job.id, job_title: job.title, company: job.company });
    try { await axios.post(`${API}/api/jobs/track-apply`, { job_id: job.id, job_title: job.title, company: job.company }, { withCredentials: true }); } catch {}
  };

  const submitHelp = async () => {
    setSending(true);
    try {
      await axios.post(`${API}/api/intelligence/request-help`, {
        category: 'employment', resource_name: helpModal?.title || 'Job Application Help', message: helpMsg
      }, { withCredentials: true });
      toast.success("Request submitted! We'll help you with this application.");
      setHelpModal(null); setHelpMsg('');
    } catch { toast.error('Failed'); }
    setSending(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="jobs-page">
        <PageSEO path="/jobs" />

        {/* ═══ HERO HEADER ═══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="jobs-heading">
            Find Jobs You Can Actually Get
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Personalized opportunities based on your background, location, and discharge situation.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-muted-foreground">
            {[
              { icon: Shield, text: 'Verified employers' },
              { icon: Star, text: 'Veteran friendly' },
              { icon: CheckCircle, text: 'Second chance opportunities' },
              { icon: Zap, text: 'Fast apply options' },
            ].map((t, i) => (
              <span key={i} className="flex items-center gap-1"><t.icon className="w-3.5 h-3.5 text-secondary" />{t.text}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">We prioritize realistic options you can act on now.</p>
        </motion.div>

        {/* ═══ BEST MATCH ═══ */}
        {data?.best_matches?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-bold text-foreground">Best Match for You</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Based on your profile, these are the strongest opportunities available right now.</p>
            <div className="space-y-3">
              {data.best_matches.map((job, i) => (
                <Card key={job.id} className="border-2 border-secondary/25 rounded-2xl bg-secondary/3 shadow-sm" data-testid={`best-match-${i}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-foreground">{job.title}</h3>
                        <p className="text-sm text-secondary font-medium">{job.company}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location_city}{job.location_state ? `, ${job.location_state}` : ''}</span>
                          <SalaryDisplay job={job} />
                        </div>
                        <p className="text-sm text-foreground mt-2.5 leading-relaxed">{job.summary}</p>
                        <div className="mt-2.5"><JobBadges job={job} /></div>
                        {job.microcopy && <p className="text-xs text-muted-foreground mt-2 italic">{job.microcopy}</p>}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 md:w-44">
                        <Button className="rounded-xl bg-secondary hover:bg-secondary/90 font-bold h-11" onClick={() => setApplyModal(job)} data-testid={`apply-best-${i}`}>
                          Apply Now <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                        <Button variant="outline" className="rounded-xl text-xs h-9" onClick={() => setHelpModal(job)} data-testid={`help-best-${i}`}>
                          <HandHelping className="w-3.5 h-3.5 mr-1" /> Get Help Applying
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">Application usually takes under 5 minutes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ FILTERS ═══ */}
        <Card className="border rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" data-testid="jobs-search" />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-xl w-full sm:w-40" data-testid="jobs-cat-filter"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 rounded-xl w-full sm:w-36" data-testid="jobs-sort"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="best_fit">Best Fit</SelectItem>
                  <SelectItem value="fastest">Fastest Hiring</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-2">
                <Switch checked={secondChance} onCheckedChange={setSecondChance} data-testid="second-chance-toggle" />
                <Label className="text-sm cursor-pointer">Second Chance Only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={fastHiring} onCheckedChange={setFastHiring} data-testid="fast-hiring-toggle" />
                <Label className="text-sm cursor-pointer">Fast Hiring</Label>
              </div>
            </div>
            {secondChance && (
              <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded-lg">Showing employers that are more likely to consider your situation.</p>
            )}
          </CardContent>
        </Card>

        {/* ═══ YOU CAN APPLY TODAY ═══ */}
        {!loading && data?.available?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-foreground">You Can Apply Today</h2>
              <span className="text-xs text-muted-foreground">({data.total_available} opportunities)</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">These opportunities are available based on your current situation.</p>
            <div className="space-y-2.5">
              {data.available.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="border rounded-2xl hover:shadow-sm transition-all" data-testid={`job-${job.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-foreground">{job.title}</h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-secondary font-medium">{job.company}</span>
                            <span className="text-muted-foreground">&middot;</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location_city}{job.location_state ? `, ${job.location_state}` : ''}</span>
                          </div>
                          {(job.salary_min || job.salary_max) && (
                            <p className="text-xs font-semibold text-foreground mt-1"><SalaryDisplay job={job} /></p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1.5">{job.summary}</p>
                          <div className="mt-2"><JobBadges job={job} /></div>
                          {job.microcopy && <p className="text-xs text-muted-foreground mt-1.5 italic">{job.microcopy}</p>}
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <Button size="sm" className="rounded-xl bg-secondary hover:bg-secondary/90 font-semibold flex-1 sm:flex-none" onClick={() => setApplyModal(job)}>
                            Apply Now
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl text-xs flex-1 sm:flex-none" onClick={() => setHelpModal(job)}>
                            <HandHelping className="w-3 h-3 mr-1" /> Help
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ UNLOCK MORE ═══ */}
        {data?.locked?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-foreground">Unlock More Opportunities</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Some jobs may open up if you improve your discharge status. We can help you understand your options.</p>
            <div className="space-y-2">
              {data.locked.map((job, i) => (
                <Card key={job.id} className="border border-dashed border-amber-200 rounded-2xl bg-amber-50/20 opacity-75" data-testid={`locked-${job.id}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground">{job.title}</h3>
                      <p className="text-xs text-muted-foreground">{job.company} &middot; {job.salary_min && job.salary_max ? `$${Math.round(job.salary_min/1000)}k–$${Math.round(job.salary_max/1000)}k/yr` : ''}</p>
                      <p className="text-xs text-amber-700 mt-1">{job.microcopy || 'This role may require a discharge upgrade.'}</p>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-xl text-xs shrink-0 border-amber-300 text-amber-700" onClick={() => setHelpModal({ ...job, title: 'Discharge Upgrade Consultation' })}>
                      Explore Upgrade Help
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && data && !data.best_matches?.length && !data.available?.length && (
          <Card className="border rounded-2xl"><CardContent className="p-10 text-center">
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">We couldn't find a strong direct match yet</p>
            <p className="text-sm text-muted-foreground mt-1">But here are support paths that can help:</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setHelpModal({ title: 'Job Search Assistance' })}>Resume Support</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setHelpModal({ title: 'Career Guidance' })}>Career Guidance</Button>
            </div>
          </CardContent></Card>
        )}

        {/* Badge guide */}
        <Card className="border rounded-xl bg-muted/20">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-foreground mb-1.5">Badge Guide</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] text-muted-foreground">
              <span><span className="font-medium text-green-700">Second Chance</span> = open to less-than-honorable</span>
              <span><span className="font-medium text-amber-700">Fast Hiring</span> = shorter hiring timeline</span>
              <span><span className="font-medium text-purple-700">Easy Apply</span> = low application friction</span>
              <span><span className="font-medium text-blue-700">Vet Preferred</span> = values military experience</span>
            </div>
          </CardContent>
        </Card>

        {/* Sticky help CTA (desktop) */}
        <div className="fixed bottom-6 right-6 z-40 hidden lg:block" data-testid="sticky-help">
          <Button className="rounded-full shadow-xl bg-secondary hover:bg-secondary/90 h-12 px-5" onClick={() => setHelpModal({ title: 'Job Search Help' })}>
            <HandHelping className="w-4 h-4 mr-2" /> Need help choosing?
          </Button>
        </div>

        {/* Mobile sticky bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t p-3">
          <Button className="w-full rounded-xl bg-secondary hover:bg-secondary/90 h-11 font-semibold" onClick={() => setHelpModal({ title: 'Job Search Help' })}>
            <HandHelping className="w-4 h-4 mr-2" /> Need help choosing the right job?
          </Button>
        </div>
        <div className="h-16 lg:h-0" /> {/* Spacer for mobile sticky */}

        {/* ═══ APPLY MODAL ═══ */}
        <Dialog open={!!applyModal} onOpenChange={(o) => !o && setApplyModal(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle>Applying to {applyModal?.company}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">You're leaving Veteran Passage to apply directly with this employer.</p>
            <p className="text-sm text-foreground font-medium">{applyModal?.title}</p>
            <p className="text-xs text-muted-foreground">Before you go, would you like help with:</p>
            <div className="space-y-2 text-sm">
              <button className="w-full text-left p-2.5 border rounded-xl hover:bg-muted/50 transition-all" onClick={() => { setApplyModal(null); setHelpModal({ ...applyModal, title: 'Resume Support' }); }}>Resume support</button>
              <button className="w-full text-left p-2.5 border rounded-xl hover:bg-muted/50 transition-all" onClick={() => { setApplyModal(null); setHelpModal(applyModal); }}>Application guidance</button>
            </div>
            <Button className="w-full rounded-xl bg-secondary hover:bg-secondary/90 font-bold" asChild onClick={() => { trackApply(applyModal); setApplyModal(null); }} data-testid="continue-apply">
              <a href={applyModal?.apply_url || '#'} target="_blank" rel="noopener noreferrer">Continue to Apply <ExternalLink className="w-3.5 h-3.5 ml-1" /></a>
            </Button>
          </DialogContent>
        </Dialog>

        {/* ═══ HELP MODAL ═══ */}
        <Dialog open={!!helpModal} onOpenChange={(o) => !o && setHelpModal(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><HandHelping className="w-5 h-5" /> Get Help Applying</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">We'll help you understand the best next step for this opportunity.</p>
            {helpModal?.title && <p className="text-sm font-medium text-foreground">{helpModal.title}</p>}
            <Textarea placeholder="What would help you most? (optional)" value={helpMsg} onChange={e => setHelpMsg(e.target.value)} rows={3} className="rounded-lg" data-testid="help-msg-input" />
            <Button className="w-full rounded-xl bg-secondary hover:bg-secondary/90" onClick={submitHelp} disabled={sending} data-testid="submit-help">
              {sending ? 'Submitting...' : 'Request Help — Free'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">No cost to you.</p>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
