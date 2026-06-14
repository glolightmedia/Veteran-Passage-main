import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Users, Search, Send, Check, X, Clock, UserPlus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { branches } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MentorshipPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('directory');
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [requestDialog, setRequestDialog] = useState(null);
  const [requestMsg, setRequestMsg] = useState('');
  const [profileDialog, setProfileDialog] = useState(false);
  const [mentorProfile, setMentorProfile] = useState({
    is_mentor: user?.is_mentor || false,
    expertise: (user?.mentor_expertise || []).join(', '),
    bio: user?.mentor_bio || '',
    availability: user?.mentor_availability || 'available'
  });

  const fetchMentors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter !== 'all') params.append('branch', branchFilter);
      const { data } = await axios.get(`${API}/api/mentorship/mentors?${params}`, { withCredentials: true });
      setMentors(data.mentors);
    } catch {}
    setLoading(false);
  }, [branchFilter]);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/mentorship/requests`, { withCredentials: true });
      setRequests(data.requests);
    } catch {}
  }, []);

  useEffect(() => { fetchMentors(); fetchRequests(); }, [fetchMentors, fetchRequests]);

  const sendRequest = async () => {
    try {
      await axios.post(`${API}/api/mentorship/requests`, { mentor_id: requestDialog, message: requestMsg }, { withCredentials: true });
      toast.success('Mentorship request sent!');
      setRequestDialog(null);
      setRequestMsg('');
      fetchRequests();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send');
    }
  };

  const respondRequest = async (id, action) => {
    try {
      await axios.put(`${API}/api/mentorship/requests/${id}`, { action }, { withCredentials: true });
      toast.success(`Request ${action}ed`);
      fetchRequests();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const saveProfile = async () => {
    try {
      await axios.put(`${API}/api/mentorship/profile`, {
        is_mentor: mentorProfile.is_mentor,
        expertise: mentorProfile.expertise.split(',').map(s => s.trim()).filter(Boolean),
        bio: mentorProfile.bio,
        availability: mentorProfile.availability
      }, { withCredentials: true });
      toast.success('Mentor profile updated!');
      setProfileDialog(false);
      fetchMentors();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const filteredMentors = search
    ? mentors.filter(m => m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.bio?.toLowerCase().includes(search.toLowerCase()))
    : mentors;

  const STATUS_STYLE = { pending: 'bg-amber-100 text-amber-700', accepted: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-700' };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="mentorship-page">
        <PageSEO path="/mentorship" />
        <div className="flex items-center justify-between">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1" data-testid="mentorship-heading">Mentorship</h1>
            <p className="text-base text-muted-foreground">Connect with veteran mentors or become one yourself.</p>
          </motion.div>
          <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl" data-testid="mentor-profile-btn"><UserPlus className="w-4 h-4 mr-1" /> Mentor Settings</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader><DialogTitle>Mentor Profile</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch checked={mentorProfile.is_mentor} onCheckedChange={v => setMentorProfile({...mentorProfile, is_mentor: v})} data-testid="is-mentor-toggle" />
                  <Label>I want to be a mentor</Label>
                </div>
                {mentorProfile.is_mentor && (
                  <>
                    <div><Label>Expertise (comma-separated)</Label><Input value={mentorProfile.expertise} onChange={e => setMentorProfile({...mentorProfile, expertise: e.target.value})} placeholder="career transition, business, legal" className="rounded-lg" data-testid="mentor-expertise" /></div>
                    <div><Label>Bio</Label><Textarea value={mentorProfile.bio} onChange={e => setMentorProfile({...mentorProfile, bio: e.target.value})} rows={3} className="rounded-lg" data-testid="mentor-bio" /></div>
                    <div>
                      <Label>Availability</Label>
                      <Select value={mentorProfile.availability} onValueChange={v => setMentorProfile({...mentorProfile, availability: v})}>
                        <SelectTrigger className="rounded-lg" data-testid="mentor-availability"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <Button className="w-full rounded-lg bg-secondary hover:bg-secondary/90" onClick={saveProfile} data-testid="save-mentor-btn">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={tab === 'directory' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setTab('directory')} data-testid="tab-directory">
            <Users className="w-4 h-4 mr-1" /> Mentor Directory
          </Button>
          <Button variant={tab === 'requests' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setTab('requests')} data-testid="tab-requests">
            <Send className="w-4 h-4 mr-1" /> My Requests {requests.length > 0 && <Badge className="ml-1 rounded-full text-xs">{requests.length}</Badge>}
          </Button>
        </div>

        {tab === 'directory' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search mentors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" data-testid="mentor-search" />
              </div>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="h-10 rounded-xl w-full sm:w-40" data-testid="mentor-branch-filter"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-20" /></Card>)}</div>
            ) : filteredMentors.length === 0 ? (
              <Card className="rounded-xl border"><CardContent className="p-10 text-center text-muted-foreground">No mentors found. Be the first — click Mentor Settings above!</CardContent></Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {filteredMentors.map(m => (
                  <Card key={m.id} className="border rounded-2xl hover:shadow-md transition-all" data-testid={`mentor-${m.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-white font-bold text-sm shrink-0">{m.full_name?.charAt(0) || '?'}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground">{m.full_name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.branch && <Badge variant="outline" className="text-xs rounded-full capitalize">{m.branch}</Badge>}
                            {(m.expertise || []).map(e => <Badge key={e} variant="secondary" className="text-xs rounded-full">{e}</Badge>)}
                          </div>
                          {m.bio && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{m.bio}</p>}
                        </div>
                        {m.id !== user?.id && (
                          <Dialog open={requestDialog === m.id} onOpenChange={open => { setRequestDialog(open ? m.id : null); setRequestMsg(''); }}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="rounded-lg bg-secondary hover:bg-secondary/90 shrink-0" data-testid={`request-mentor-${m.id}`}>Connect</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm rounded-2xl">
                              <DialogHeader><DialogTitle>Connect with {m.full_name}</DialogTitle></DialogHeader>
                              <Textarea placeholder="Introduce yourself and what you're looking for..." value={requestMsg} onChange={e => setRequestMsg(e.target.value)} rows={4} className="rounded-lg" data-testid="request-message" />
                              <Button className="w-full rounded-lg bg-secondary hover:bg-secondary/90" onClick={sendRequest} data-testid="send-request-btn"><Send className="w-4 h-4 mr-1" /> Send Request</Button>
                            </DialogContent>
                          </Dialog>
                        )}
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
              <Card className="rounded-xl border"><CardContent className="p-10 text-center text-muted-foreground">No mentorship requests yet.</CardContent></Card>
            ) : requests.map(r => (
              <Card key={r.id} className="border rounded-2xl" data-testid={`request-${r.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">
                          {r.mentor_id === user?.id ? `From: ${r.mentee_name}` : `To: ${r.mentor_name}`}
                        </p>
                        <Badge className={`text-xs rounded-full border-0 ${STATUS_STYLE[r.status]}`}>{r.status}</Badge>
                      </div>
                      {r.message && <p className="text-xs text-muted-foreground">{r.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    {r.status === 'pending' && r.mentor_id === user?.id && (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 rounded-md bg-green-600 hover:bg-green-700 text-white" onClick={() => respondRequest(r.id, 'accept')} data-testid={`accept-${r.id}`}><Check className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-md" onClick={() => respondRequest(r.id, 'decline')} data-testid={`decline-${r.id}`}><X className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
