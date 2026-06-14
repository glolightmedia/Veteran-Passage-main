import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight, ExternalLink, Lock, Unlock, CheckCircle, Zap, Award,
  Clock, FileText, AlertTriangle, ShieldCheck, Heart, HandHelping
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDischargeTier, triageTiers } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';
import { LegalFastLane } from '@/components/LegalFastLane';
import { trackEvent } from '@/utils/analytics';

const API = process.env.REACT_APP_BACKEND_URL;

const GOAL_LABELS = {
  employment: 'Find a Job', benefits: 'Access VA Benefits', business: 'Start a Business',
  legal: 'Discharge Upgrade', education: 'Education & Training', housing: 'Housing', 'mental-health': 'Wellness'
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recs, setRecs] = useState(null);
  const [progress, setProgress] = useState(null);
  const [checkIn, setCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [helpDialog, setHelpDialog] = useState(null);
  const [helpMsg, setHelpMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const tier = getDischargeTier(user?.discharge);
  const tierInfo = triageTiers[tier];

  useEffect(() => {
    if (!user?.intake_completed && user?.role === 'customer') { navigate('/intake'); return; }
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const load = async () => {
      try {
        const [recsRes, progRes, ciRes] = await Promise.all([
          axios.get(`${API}/api/intelligence/recommendations`, { withCredentials: true }).catch(() => null),
          axios.get(`${API}/api/progress`, { withCredentials: true }).catch(() => null),
          axios.get(`${API}/api/progress/check-in`, { withCredentials: true }).catch(() => null),
        ]);
        if (recsRes) { setRecs(recsRes.data); if (recsRes.data.success_message) setShowSuccess(true); }
        if (progRes) setProgress(progRes.data);
        if (ciRes) setCheckIn(ciRes.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  const logAction = async (type, rId, rName) => {
    trackEvent('dashboard_next_action_clicked', { type, resource_id: rId, resource_name: rName });
    try {
      await axios.post(`${API}/api/progress/action`, { type, resource_id: rId, resource_name: rName }, { withCredentials: true });
    } catch {}
  };

  const requestHelp = async (category, resourceName) => {
    setSending(true);
    try {
      await axios.post(`${API}/api/intelligence/request-help`, {
        category, resource_name: resourceName, message: helpMsg
      }, { withCredentials: true });
      toast.success("Request submitted! A partner will reach out soon.");
      setHelpDialog(null);
      setHelpMsg('');
    } catch { toast.error('Failed to submit'); }
    setSending(false);
  };

  const actionsCount = progress?.actions_taken?.length || 0;
  const milestonesCount = progress?.milestones?.length || 0;

  if (loading) return (
    <DashboardLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-secondary border-t-transparent" /></div></DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-3xl mx-auto" data-testid="dashboard-page">
        <PageSEO path="/dashboard" />

        {/* Personalized Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground" data-testid="personalization-text">{recs?.personalization}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1" data-testid="welcome-heading">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Veteran'}
          </h1>
        </motion.div>

        {/* SUCCESS MOMENT — instant win after intake */}
        <AnimatePresence>
          {showSuccess && recs?.success_message && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <Card className="border-2 border-green-300 rounded-2xl bg-green-50/60 shadow-md" data-testid="success-moment">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-green-800">{recs.success_message}</p>
                    <p className="text-sm text-green-700 mt-0.5">Click below to get started — takes about {recs.next_action?.time_estimate || '5 minutes'}.</p>
                  </div>
                  <Button size="sm" className="rounded-full shrink-0 bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowSuccess(false)}>
                    Got it
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nudge */}
        {checkIn?.nudge && (
          <Card className="border border-amber-200 rounded-2xl bg-amber-50/40" data-testid="nudge-card">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 flex-1">{checkIn.nudge.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Legal Fast Lane — shows only for OTH/BCD */}
        <LegalFastLane />

        {/* ═══ SECTION 1: YOUR NEXT STEP ═══ */}
        {recs?.next_action && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-bold text-foreground">Your Next Step</h2>
            </div>
            <Card className="border-2 border-secondary/30 rounded-2xl bg-secondary/5 shadow-sm" data-testid="next-action-card">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="flex-1">
                    <Badge className="mb-2 rounded-full text-xs bg-green-100 text-green-700 border-0">Eligible Now</Badge>
                    <h3 className="text-xl font-bold text-foreground mb-1">{recs.next_action.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{recs.next_action.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recs.next_action.time_estimate}</span>
                      {!recs.next_action.documents_required && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-600" /> No documents needed</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <Button asChild size="lg" className="rounded-xl bg-secondary hover:bg-secondary/90 font-bold text-base w-full" onClick={() => logAction('clicked', recs.next_action.id, recs.next_action.name)} data-testid="next-action-btn">
                      <a href={recs.next_action.action_url} target="_blank" rel="noopener noreferrer">
                        {recs.next_action.action_label} <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs w-full" onClick={() => setHelpDialog(recs.next_action.category)} data-testid="request-help-btn">
                      <HandHelping className="w-3 h-3 mr-1" /> Request Personal Help
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ SECTION 2: WHAT YOU CAN DO TODAY ═══ */}
        {recs?.available?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-foreground">What You Can Do Today</h2>
            </div>
            <div className="space-y-2">
              {recs.available.map(r => (
                <Card key={r.id} className="border rounded-xl" data-testid={`available-${r.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{r.time_estimate}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button asChild size="sm" variant="outline" className="rounded-lg h-8 text-xs" onClick={() => logAction('visited', r.id, r.name)}>
                        <a href={r.action_url} target="_blank" rel="noopener noreferrer">{r.action_label}</a>
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 p-0" onClick={() => setHelpDialog(r.category)} title="Request help">
                        <HandHelping className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ SECTION 3: UNLOCK MORE ═══ */}
        {recs?.unlockable?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-3">
              <Unlock className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-foreground">Unlock More Options</h2>
            </div>
            <Card className="border border-amber-200 rounded-2xl bg-amber-50/30">
              <CardContent className="p-4">
                <p className="text-sm text-amber-800 mb-3">Upgrade your discharge to access these resources:</p>
                {recs.unlockable.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-amber-200/50 last:border-0" data-testid={`unlock-${r.id}`}>
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">{r.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{r.description}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link to="/dd214">Decode My DD-214 <FileText className="w-3 h-3 ml-1" /></Link>
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setHelpDialog('legal')}>
                    <HandHelping className="w-3 h-3 mr-1" /> Get Legal Help
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Progress mini-bar */}
        <Card className="border rounded-xl" data-testid="progress-bar">
          <CardContent className="p-3 flex items-center gap-3">
            <Award className="w-5 h-5 text-secondary shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">Your Progress</span>
                <span className="text-xs text-muted-foreground">{actionsCount} actions</span>
              </div>
              <Progress value={Math.min(100, actionsCount * 10)} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Request Help Dialog */}
        <Dialog open={!!helpDialog} onOpenChange={(open) => { if (!open) setHelpDialog(null); }}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><HandHelping className="w-5 h-5" /> Request Personal Help</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">We'll connect you with a partner who specializes in {helpDialog?.replace('-', ' ')}. They'll reach out to you directly.</p>
            <Textarea placeholder="Tell us what you need help with (optional)..." value={helpMsg} onChange={e => setHelpMsg(e.target.value)} rows={3} className="rounded-lg" data-testid="help-message" />
            <Button className="w-full rounded-xl bg-secondary hover:bg-secondary/90" onClick={() => requestHelp(helpDialog, '')} disabled={sending} data-testid="submit-help-btn">
              {sending ? 'Submitting...' : 'Request Help'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
