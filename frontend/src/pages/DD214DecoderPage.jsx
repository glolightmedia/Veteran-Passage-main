import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, FileText, Scale, ArrowRight, CheckCircle, AlertTriangle, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { branches } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';
import { LeadCaptureButton } from '@/components/LeadCaptureButton';
import { LegalFastLane } from '@/components/LegalFastLane';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const TIER_STYLE = {
  green: { label: 'Eligible', icon: CheckCircle, color: 'text-green-700 bg-green-100' },
  yellow: { label: 'Upgrade Recommended', icon: AlertTriangle, color: 'text-amber-700 bg-amber-100' },
  blue: { label: 'Upgrade Required', icon: XCircle, color: 'text-blue-700 bg-blue-100' },
};

export default function DD214DecoderPage() {
  const { user } = useAuth();
  const [reCode, setReCode] = useState(user?.re_code || '');
  const [narrative, setNarrative] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(user?.branch || '');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reCodeInfo, setReCodeInfo] = useState(null);

  const lookupReCode = async (code) => {
    if (!code) return;
    try {
      const { data } = await axios.get(`${API}/api/dd214/re-codes/${code}`, { withCredentials: true });
      setReCodeInfo(data.found ? data : null);
    } catch {}
  };

  const analyze = async () => {
    if (!reCode && !narrative) { toast.error('Enter an RE code or narrative reason'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/dd214/analyze`, {
        re_code: reCode, narrative_reason: narrative, branch: selectedBranch
      }, { withCredentials: true });
      setAnalysis(data);
    } catch { toast.error('Analysis failed'); }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5" data-testid="dd214-page">
        <PageSEO path="/dd214" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="dd214-heading">DD-214 Decoder</h1>
          <p className="text-base text-muted-foreground">Translate your DD-214 codes into plain English and discover your upgrade options.</p>
        </motion.div>

        <LegalFastLane />

        {/* Input Section */}
        <Card className="border rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>RE Code (Block 27)</Label>
                <Select value={reCode} onValueChange={(v) => { setReCode(v); lookupReCode(v); }}>
                  <SelectTrigger className="rounded-xl h-11" data-testid="re-code-select"><SelectValue placeholder="Select RE code" /></SelectTrigger>
                  <SelectContent>
                    {['RE-1','RE-1A','RE-2','RE-2B','RE-3','RE-3B','RE-3P','RE-4','RE-4R'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Narrative Reason (Block 28)</Label>
                <Select value={narrative} onValueChange={setNarrative}>
                  <SelectTrigger className="rounded-xl h-11" data-testid="narrative-select"><SelectValue placeholder="Select or type reason" /></SelectTrigger>
                  <SelectContent>
                    {['misconduct','pattern of misconduct','drug abuse','alcohol abuse','personality disorder','adjustment disorder','in lieu of court martial','commission of a serious offense','unfitness','homosexual conduct','parenthood','entry level performance and conduct'].map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="rounded-xl h-11" data-testid="branch-select"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>{branches.map(b => <SelectItem key={b.value} value={b.label}>{b.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full rounded-xl h-11 bg-secondary hover:bg-secondary/90" onClick={analyze} disabled={loading} data-testid="analyze-btn">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Search className="w-4 h-4 mr-2" /> Decode My DD-214</>}
            </Button>
          </CardContent>
        </Card>

        {/* Quick RE Code Info */}
        {reCodeInfo && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`border-2 rounded-2xl ${reCodeInfo.tier === 'green' ? 'border-green-200 bg-green-50/30' : reCodeInfo.tier === 'yellow' ? 'border-amber-200 bg-amber-50/30' : 'border-blue-200 bg-blue-50/30'}`} data-testid="re-code-info">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={`rounded-full border-0 text-sm font-bold ${TIER_STYLE[reCodeInfo.tier]?.color}`}>{reCodeInfo.code}</Badge>
                  <span className="text-sm font-semibold text-foreground">{reCodeInfo.meaning}</span>
                </div>
                <p className="text-sm text-muted-foreground">{reCodeInfo.description}</p>
                {reCodeInfo.upgrade_likelihood && (
                  <p className="text-sm mt-2"><span className="font-semibold text-foreground">Upgrade likelihood:</span> <span className="text-secondary">{reCodeInfo.upgrade_likelihood}</span></p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Full Analysis */}
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><FileText className="w-5 h-5" /> Your Analysis</h2>

            {analysis.narrative && (
              <Card className="border rounded-2xl" data-testid="narrative-analysis">
                <CardHeader className="pb-2"><CardTitle className="text-base">Narrative Reason: {analysis.narrative.reason}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-foreground"><span className="font-semibold">In plain English:</span> {analysis.narrative.plain_english}</p>
                  <p className="text-sm text-foreground"><span className="font-semibold">Upgrade path:</span> {analysis.narrative.upgrade_path}</p>
                  <p className="text-sm"><span className="font-semibold">Likelihood:</span> <span className="text-secondary font-semibold">{analysis.narrative.upgrade_likelihood}</span></p>
                </CardContent>
              </Card>
            )}

            {analysis.discharge_board?.name && (
              <Card className="border rounded-2xl" data-testid="board-info">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Scale className="w-4 h-4" /> Your Review Board</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold text-foreground">{analysis.discharge_board.name}</p>
                  <p className="text-xs text-muted-foreground">Typical timeline: {analysis.discharge_board.timeline}</p>
                  <Button asChild size="sm" className="mt-2 rounded-xl bg-secondary hover:bg-secondary/90" data-testid="board-link">
                    <a href={analysis.discharge_board.url} target="_blank" rel="noopener noreferrer">Visit Board Website <ExternalLink className="w-3 h-3 ml-1" /></a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {analysis.next_steps?.length > 0 && (
              <Card className={`border-2 rounded-2xl ${analysis.upgrade_recommended ? 'border-amber-200 bg-amber-50/30' : 'border-green-200 bg-green-50/30'}`} data-testid="next-steps">
                <CardHeader className="pb-2"><CardTitle className="text-base">{analysis.upgrade_recommended ? 'Recommended Next Steps' : 'Good News!'}</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {analysis.next_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                  {analysis.upgrade_recommended && (
                    <div className="flex gap-2 mt-3">
                      <LeadCaptureButton category="legal" resourceName="DD-214 Discharge Upgrade" label="Talk to a Legal Expert — Free" className="bg-secondary hover:bg-secondary/90 text-white border-0" variant="default" />
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <a href="/resources">Browse Legal Aid</a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
