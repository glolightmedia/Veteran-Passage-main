import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Search, Plus, ArrowLeftRight, Send, Check, X, Settings } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SKILL_SUGGESTIONS = [
  'Resume Writing', 'Interview Coaching', 'Web Development', 'Graphic Design', 'Accounting', 'Plumbing',
  'Electrical Work', 'Carpentry', 'Auto Repair', 'Legal Advice', 'Tax Preparation', 'Photography',
  'Marketing', 'Project Management', 'Tutoring', 'Fitness Training', 'Cooking', 'CDL Training',
  'Welding', 'HVAC', 'Cybersecurity', 'First Aid/CPR', 'Spanish Translation', 'Public Speaking'
];

export default function BarterPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [requestDialog, setRequestDialog] = useState(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [skillsHave, setSkillsHave] = useState((user?.skills_have || []).join(', '));
  const [skillsNeed, setSkillsNeed] = useState((user?.skills_need || []).join(', '));
  const [barterActive, setBarterActive] = useState(user?.barter_active !== false);
  const [barterBio, setBarterBio] = useState(user?.barter_bio || '');

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/barter/matches`, { withCredentials: true });
      setMatches(data.matches);
    } catch {}
    setLoading(false);
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/barter/requests`, { withCredentials: true });
      setRequests(data.requests);
    } catch {}
  }, []);

  useEffect(() => { fetchMatches(); fetchRequests(); }, [fetchMatches, fetchRequests]);

  const saveProfile = async () => {
    try {
      await axios.put(`${API}/api/barter/profile`, {
        skills_have: skillsHave.split(',').map(s => s.trim()).filter(Boolean),
        skills_need: skillsNeed.split(',').map(s => s.trim()).filter(Boolean),
        active: barterActive,
        bio: barterBio
      }, { withCredentials: true });
      toast.success('Skills profile updated!');
      setProfileOpen(false);
      fetchMatches();
    } catch { toast.error('Failed to save'); }
  };

  const sendRequest = async (targetId) => {
    try {
      await axios.post(`${API}/api/barter/request`, { target_id: targetId, message: requestMsg }, { withCredentials: true });
      toast.success('Barter request sent!');
      setRequestDialog(null);
      setRequestMsg('');
      fetchRequests();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const respondRequest = async (id, action) => {
    try {
      await axios.put(`${API}/api/barter/requests/${id}`, { action }, { withCredentials: true });
      toast.success(`Request ${action}ed`);
      fetchRequests();
    } catch { toast.error('Failed'); }
  };

  const STATUS_STYLE = { pending: 'bg-amber-100 text-amber-700', accepted: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-700' };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="barter-page">
        <PageSEO path="/barter" />
        <div className="flex items-center justify-between">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1" data-testid="barter-heading">Skill Barter</h1>
            <p className="text-base text-muted-foreground">Trade skills with fellow veterans. You help them, they help you.</p>
          </motion.div>
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl" data-testid="barter-settings-btn"><Settings className="w-4 h-4 mr-1" /> My Skills</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader><DialogTitle>Skills Profile</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3"><Switch checked={barterActive} onCheckedChange={setBarterActive} /><Label>Active on Skill Barter</Label></div>
                <div><Label>Skills I Have (comma-separated)</Label><Input value={skillsHave} onChange={e => setSkillsHave(e.target.value)} placeholder="Resume Writing, Web Dev, Auto Repair" className="rounded-lg" data-testid="skills-have-input" /></div>
                <div><Label>Skills I Need (comma-separated)</Label><Input value={skillsNeed} onChange={e => setSkillsNeed(e.target.value)} placeholder="Tax Prep, Legal Advice, HVAC" className="rounded-lg" data-testid="skills-need-input" /></div>
                <div><Label>Short Bio</Label><Textarea value={barterBio} onChange={e => setBarterBio(e.target.value)} rows={2} className="rounded-lg" placeholder="What you're looking for..." /></div>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.slice(0, 12).map(s => (
                    <button key={s} onClick={() => setSkillsHave(prev => prev ? `${prev}, ${s}` : s)} className="text-[10px] px-2 py-1 rounded-full border hover:border-secondary/40 text-muted-foreground hover:text-foreground transition-all">{s}</button>
                  ))}
                </div>
                <Button className="w-full rounded-lg bg-secondary hover:bg-secondary/90" onClick={saveProfile} data-testid="save-skills-btn">Save Skills</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          <Button variant={tab === 'matches' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setTab('matches')} data-testid="tab-matches">
            <ArrowLeftRight className="w-4 h-4 mr-1" /> Matches {matches.length > 0 && <Badge className="ml-1 rounded-full text-xs">{matches.length}</Badge>}
          </Button>
          <Button variant={tab === 'requests' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setTab('requests')} data-testid="tab-requests">
            <Send className="w-4 h-4 mr-1" /> Requests {requests.length > 0 && <Badge className="ml-1 rounded-full text-xs">{requests.length}</Badge>}
          </Button>
        </div>

        {tab === 'matches' && (
          <>
            {loading ? (
              <div className="space-y-3">{[1,2].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-20" /></Card>)}</div>
            ) : matches.length === 0 ? (
              <Card className="rounded-xl border"><CardContent className="p-10 text-center">
                <ArrowLeftRight className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No matches yet</p>
                <p className="text-sm text-muted-foreground mt-1">Set your skills above to find barter partners!</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {matches.map(m => (
                  <Card key={m.id} className="border rounded-2xl hover:shadow-md transition-all" data-testid={`match-${m.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-white font-bold text-sm shrink-0">{m.full_name?.charAt(0) || '?'}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground">{m.full_name}</h3>
                          {m.branch && <span className="text-xs text-muted-foreground">{m.branch}</span>}
                          {m.they_can_help_with.length > 0 && (
                            <div className="mt-1.5"><span className="text-xs text-green-700 font-medium">They can help you with: </span>
                              {m.they_can_help_with.map(s => <Badge key={s} className="text-xs rounded-full bg-green-100 text-green-700 border-0 mr-1">{s}</Badge>)}
                            </div>
                          )}
                          {m.i_can_help_with.length > 0 && (
                            <div className="mt-1"><span className="text-xs text-blue-700 font-medium">You can help them with: </span>
                              {m.i_can_help_with.map(s => <Badge key={s} className="text-xs rounded-full bg-blue-100 text-blue-700 border-0 mr-1">{s}</Badge>)}
                            </div>
                          )}
                        </div>
                        <Dialog open={requestDialog === m.id} onOpenChange={open => { setRequestDialog(open ? m.id : null); setRequestMsg(''); }}>
                          <DialogTrigger asChild><Button size="sm" className="rounded-lg bg-secondary hover:bg-secondary/90 shrink-0" data-testid={`barter-connect-${m.id}`}>Connect</Button></DialogTrigger>
                          <DialogContent className="max-w-sm rounded-2xl">
                            <DialogHeader><DialogTitle>Barter with {m.full_name}</DialogTitle></DialogHeader>
                            <Textarea placeholder="Propose a skill exchange..." value={requestMsg} onChange={e => setRequestMsg(e.target.value)} rows={3} className="rounded-lg" />
                            <Button className="w-full rounded-lg bg-secondary hover:bg-secondary/90" onClick={() => sendRequest(m.id)} data-testid="send-barter-btn"><Send className="w-4 h-4 mr-1" /> Send Request</Button>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <Card className="rounded-xl border"><CardContent className="p-10 text-center text-muted-foreground">No barter requests yet.</CardContent></Card>
            ) : requests.map(r => (
              <Card key={r.id} className="border rounded-2xl" data-testid={`barter-req-${r.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">{r.from_id === user?.id ? `To: ${r.to_id}` : `From: ${r.from_name}`}</p>
                      <Badge className={`text-xs rounded-full border-0 ${STATUS_STYLE[r.status]}`}>{r.status}</Badge>
                    </div>
                    {r.message && <p className="text-xs text-muted-foreground">{r.message}</p>}
                  </div>
                  {r.status === 'pending' && r.to_id === user?.id && (
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 rounded-md bg-green-600 hover:bg-green-700 text-white" onClick={() => respondRequest(r.id, 'accept')}><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" className="h-7 rounded-md" onClick={() => respondRequest(r.id, 'decline')}><X className="w-3 h-3" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
