import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, ArrowLeft, RefreshCw, Shield, Users, BookOpen } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageSEO } from '@/components/SEO';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const SUGGESTED = [10, 25, 50, 100];

export default function DonatePage() {
  const [amount, setAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [recurring, setRecurring] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  const activeAmount = isCustom ? parseFloat(customAmount) || 0 : amount;

  const selectSuggested = (val) => {
    setAmount(val);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustom = (val) => {
    setCustomAmount(val);
    setIsCustom(true);
  };

  const handleDonate = async () => {
    if (activeAmount < 1) { toast.error('Minimum donation is $1'); return; }
    setProcessing(true);
    try {
      const { data } = await axios.post(`${API}/api/donate/checkout`, {
        amount: activeAmount,
        recurring,
        name: name || 'Anonymous',
        email
      }, { headers: { 'X-Origin-URL': window.location.origin } });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Something went wrong');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="donate-page">
      <PageSEO path="/donate" />
      <Navigation />

      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mb-6">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left — Why Donate */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center mb-5">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                  Support Veterans <br />
                  <span className="text-gradient">in Transition</span>
                </h1>
                <p className="text-base text-muted-foreground leading-relaxed">
                  Your donation helps veterans of all discharges access benefits, legal aid, career resources, and mental health support.
                </p>
              </motion.div>

              <div className="space-y-3">
                {[
                  { icon: Shield, text: 'Free legal aid for discharge upgrades' },
                  { icon: Users, text: 'Mentorship matching and community support' },
                  { icon: BookOpen, text: 'Career resources and entrepreneur training' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-secondary" />
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Donation Form */}
            <div className="lg:col-span-3">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border shadow-xl rounded-3xl">
                  <CardContent className="p-6 sm:p-8 space-y-6">
                    {/* Amount Selection */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Choose an amount</Label>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {SUGGESTED.map(val => (
                          <button
                            key={val}
                            onClick={() => selectSuggested(val)}
                            className={`py-3 rounded-xl text-base font-bold transition-all border-2 ${
                              !isCustom && amount === val
                                ? 'bg-secondary text-white border-secondary shadow-md'
                                : 'bg-background text-foreground border-border hover:border-secondary/40'
                            }`}
                            data-testid={`amount-${val}`}
                          >
                            ${val}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Custom amount"
                          value={customAmount}
                          onChange={e => handleCustom(e.target.value)}
                          className={`pl-9 h-12 rounded-xl text-lg font-semibold border-2 ${isCustom ? 'border-secondary' : ''}`}
                          data-testid="custom-amount-input"
                        />
                      </div>
                    </div>

                    {/* RECURRING CHECKBOX — Large and prominent */}
                    <div
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        recurring
                          ? 'border-secondary bg-secondary/5 shadow-sm'
                          : 'border-border bg-background'
                      }`}
                      onClick={() => setRecurring(!recurring)}
                      data-testid="recurring-section"
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={recurring}
                          onCheckedChange={setRecurring}
                          className="w-6 h-6 mt-0.5 border-2 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                          data-testid="recurring-checkbox"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <RefreshCw className={`w-5 h-5 ${recurring ? 'text-secondary' : 'text-muted-foreground'}`} />
                            <span className="text-base font-bold text-foreground">
                              Make this a monthly donation
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {recurring
                              ? `You will be charged $${activeAmount || '...'} every month. You can cancel anytime.`
                              : 'Check this box to donate monthly and provide ongoing support.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Donor Info */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Name (optional)</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="rounded-xl h-11" data-testid="donor-name" />
                      </div>
                      <div>
                        <Label className="text-sm">Email (for receipt)</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="rounded-xl h-11" data-testid="donor-email" />
                      </div>
                    </div>

                    {/* Summary + CTA */}
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Donation amount</span>
                        <span className="text-lg font-bold text-foreground">${activeAmount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Frequency</span>
                        <span className={`text-sm font-semibold ${recurring ? 'text-secondary' : 'text-foreground'}`}>
                          {recurring ? 'Monthly (recurring)' : 'One-time'}
                        </span>
                      </div>
                    </div>

                    {recurring && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-800 font-medium">
                          By proceeding, you agree to be charged <strong>${activeAmount}/month</strong> until you cancel. You can cancel your subscription at any time.
                        </p>
                      </div>
                    )}

                    <Button
                      className="w-full h-13 rounded-xl text-base font-bold bg-secondary hover:bg-secondary/90 shadow-lg"
                      onClick={handleDonate}
                      disabled={processing || activeAmount < 1}
                      data-testid="donate-submit-btn"
                    >
                      <Heart className="w-5 h-5 mr-2" />
                      {processing ? 'Processing...' : recurring ? `Donate $${activeAmount}/month` : `Donate $${activeAmount}`}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Secure payment via Stripe. Your donation supports Veteran Passage's mission.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
