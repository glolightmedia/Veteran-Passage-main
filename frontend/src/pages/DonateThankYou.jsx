import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageSEO } from '@/components/SEO';

export default function DonateThankYou() {
  const [params] = useSearchParams();
  const amount = params.get('amount') || '25';
  const recurring = params.get('recurring') === 'true';

  return (
    <div className="min-h-screen bg-background" data-testid="donate-thankyou-page">
      <PageSEO path="/donate/thank-you" />
      <Navigation />

      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <Card className="border shadow-xl rounded-3xl text-center">
              <CardContent className="p-8 sm:p-12 space-y-6">
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-foreground" data-testid="thankyou-heading">
                  Thank You for Your Generosity!
                </h1>

                <p className="text-base text-muted-foreground max-w-lg mx-auto">
                  Your support makes a real difference in the lives of veterans navigating their transition to civilian life.
                </p>

                <div className="p-5 bg-muted/50 rounded-2xl max-w-sm mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-secondary" />
                    <span className="text-2xl font-bold text-foreground">${amount}</span>
                  </div>
                  {recurring ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-semibold text-secondary">Monthly Recurring Donation</span>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-800">
                          You will be charged <strong>${amount} every month</strong>. You can manage or cancel your subscription anytime through your Stripe receipt email.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">One-time donation</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild className="rounded-xl bg-secondary hover:bg-secondary/90" data-testid="explore-btn">
                    <Link to="/signup">Join Veteran Passage <ArrowRight className="ml-1 w-4 h-4" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/">Return Home</Link>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  A receipt has been sent to your email. Thank you for supporting veterans of all discharges.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
