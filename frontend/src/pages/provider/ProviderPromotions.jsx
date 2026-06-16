import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, CreditCard, CheckCircle, Loader2, Star, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import RoleLayout from '@/components/RoleLayout';
import { providerNav } from './ProviderDashboard';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PLAN_ICONS = { basic: Star, premium: Zap, featured: Crown };
const PLAN_COLORS = {
  basic: 'border-blue-200 bg-blue-50/50',
  premium: 'border-purple-200 bg-purple-50/50',
  featured: 'border-amber-200 bg-amber-50/50',
};

export default function ProviderPromotions() {
  const [searchParams] = useSearchParams();
  const [resources, setResources] = useState([]);
  const [plans, setPlans] = useState({});
  const [promotions, setPromotions] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [resData, plansData, promoData] = await Promise.all([
          axios.get(`${API}/api/provider/resources`, { withCredentials: true }),
          axios.get(`${API}/api/provider/promotions/plans`, { withCredentials: true }),
          axios.get(`${API}/api/provider/promotions`, { withCredentials: true }),
        ]);
        setResources(resData.data.resources.filter(r => r.status === 'approved'));
        setPlans(plansData.data.plans);
        setPromotions(promoData.data.promotions);
      } catch { }
      setLoading(false);
    };
    init();
  }, []);

  // Poll payment status on return from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;

    let attempts = 0;
    setCheckingPayment(true);

    const poll = async () => {
      if (attempts >= 5) { setCheckingPayment(false); return; }
      attempts++;
      try {
        const { data } = await axios.get(`${API}/api/provider/promotions/status/${sessionId}`, { withCredentials: true });
        if (data.payment_status === 'paid') {
          toast.success('Payment successful! Your listing is now promoted.');
          setCheckingPayment(false);
          // Refresh promotions
          const promoData = await axios.get(`${API}/api/provider/promotions`, { withCredentials: true });
          setPromotions(promoData.data.promotions);
          return;
        }
        if (data.status === 'expired') {
          toast.error('Payment session expired');
          setCheckingPayment(false);
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 2000);
      }
    };
    poll();
  }, [searchParams]);

  const startCheckout = async () => {
    if (!selectedResource || !selectedPlan) { toast.error('Select a resource and plan'); return; }
    try {
      const { data } = await axios.post(`${API}/api/provider/promotions/checkout`,
        { resource_id: selectedResource, plan: selectedPlan },
        { withCredentials: true, headers: { 'X-Origin-URL': window.location.origin } }
      );
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Checkout failed');
    }
  };

  return (
    <RoleLayout navItems={providerNav} roleLabel="Partner" roleColor="bg-blue-100 text-blue-700">
      <div className="space-y-6" data-testid="provider-promotions-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promote Your Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">Boost visibility with promoted placement in the directory</p>
        </div>

        {checkingPayment && (
          <Card className="rounded-xl border border-green-200 bg-green-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
              <span className="text-sm text-green-700">Verifying payment...</span>
            </CardContent>
          </Card>
        )}

        {/* Promotion Plans */}
        {!loading && (
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(plans).map(([key, plan]) => {
              const Icon = PLAN_ICONS[key] || Star;
              return (
                <Card
                  key={key}
                  className={`rounded-xl border-2 cursor-pointer transition-all ${selectedPlan === key ? 'ring-2 ring-secondary' : ''} ${PLAN_COLORS[key]}`}
                  onClick={() => setSelectedPlan(key)}
                  data-testid={`plan-${key}`}
                >
                  <CardContent className="p-5 text-center">
                    <Icon className="w-8 h-8 mx-auto mb-3 text-secondary" />
                    <h3 className="text-base font-bold text-foreground">{plan.label}</h3>
                    <p className="text-2xl font-bold text-foreground mt-2">${plan.price}</p>
                    <p className="text-xs text-muted-foreground">per {plan.duration_days} days</p>
                    <Badge className="mt-3 rounded-full" variant="secondary">{plan.badge}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Checkout Section */}
        {!loading && resources.length > 0 && (
          <Card className="rounded-xl border">
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Start Promotion</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedResource} onValueChange={setSelectedResource}>
                  <SelectTrigger className="flex-1 rounded-lg" data-testid="promo-resource-select">
                    <SelectValue placeholder="Select a listing to promote" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button className="rounded-lg bg-secondary hover:bg-secondary/90" onClick={startCheckout} disabled={!selectedResource || !selectedPlan} data-testid="checkout-btn">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {selectedPlan && plans[selectedPlan] ? `Pay $${plans[selectedPlan].price}` : 'Select Plan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && resources.length === 0 && (
          <Card className="rounded-xl border"><CardContent className="p-6 text-center text-sm text-muted-foreground">You need at least one approved listing to create a promotion.</CardContent></Card>
        )}

        {/* Active Promotions */}
        {promotions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">Active Promotions</h2>
            <div className="space-y-3">
              {promotions.map(p => (
                <Card key={p.id} className="rounded-xl border" data-testid={`promotion-${p.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <Badge className="rounded-full bg-purple-100 text-purple-700 border-0 text-xs capitalize">{p.plan}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`rounded-full border-0 text-xs ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </RoleLayout>
  );
}
