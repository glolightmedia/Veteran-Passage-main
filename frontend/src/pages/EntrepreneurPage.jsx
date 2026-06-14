import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Building, DollarSign, Users, ExternalLink, ArrowRight, CheckCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { PageSEO } from '@/components/SEO';

const wizardSteps = [
  { step: 1, title: 'Choose Your Structure', description: 'LLC, S-Corp, Sole Proprietorship — which is right for you?', details: 'Most veteran businesses start as an LLC. It\'s simple, protects personal assets, and has pass-through taxation.' },
  { step: 2, title: 'Register Your Business', description: 'File with your state and get your EIN from the IRS.', details: 'Get your EIN (Employer Identification Number) free at IRS.gov. Takes 5 minutes online.' },
  { step: 3, title: 'Open a Business Account', description: 'Separate personal and business finances from day one.', details: 'Most banks offer free or low-cost business checking. Some have veteran-specific programs.' },
  { step: 4, title: 'Get Funded', description: 'Veteran grants, SBA microloans, and crowdfunding.', details: 'SBA offers 7(a) loans, microloans up to $50k, and the Boots to Business program specifically for veterans.' },
];

const grants = [
  { name: 'SBA Boots to Business', org: 'SBA', amount: 'Free training', url: 'https://www.sba.gov/sba-learning-platform/boots-business', deadline: 'Rolling', type: 'Training' },
  { name: 'StreetShares Foundation Award', org: 'StreetShares', amount: 'Up to $15,000', url: 'https://streetshares.com/foundation', deadline: 'Quarterly', type: 'Grant' },
  { name: 'Veteran Small Business Grant', org: 'National Veteran-Owned Business Association', amount: 'Up to $10,000', url: 'https://navoba.org', deadline: 'Annual', type: 'Grant' },
  { name: 'SBA 7(a) Veteran Advantage', org: 'SBA', amount: 'Up to $5M', url: 'https://www.sba.gov/funding-programs/loans', deadline: 'Ongoing', type: 'Loan' },
  { name: 'Bunker Labs Veterans in Residence', org: 'Bunker Labs', amount: 'Free cohort program', url: 'https://bunkerlabs.org', deadline: 'Quarterly', type: 'Accelerator' },
  { name: 'SCORE Mentorship', org: 'SCORE', amount: 'Free mentoring', url: 'https://www.score.org', deadline: 'Ongoing', type: 'Mentorship' },
];

const TYPE_COLORS = {
  Grant: 'bg-green-100 text-green-700',
  Loan: 'bg-blue-100 text-blue-700',
  Training: 'bg-purple-100 text-purple-700',
  Accelerator: 'bg-amber-100 text-amber-700',
  Mentorship: 'bg-rose-100 text-rose-700',
};

export default function EntrepreneurPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="entrepreneur-page">
        <PageSEO path="/entrepreneur" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="entrepreneur-heading">Entrepreneur Track</h1>
          <p className="text-base text-muted-foreground">Start and grow your veteran-owned business with step-by-step guidance.</p>
        </motion.div>

        {/* LLC/EIN Wizard */}
        <Card className="border rounded-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Building className="w-5 h-5" /> Business Setup Wizard</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {wizardSteps.map((step, i) => (
                <motion.div key={step.step} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <div className="p-4 border rounded-xl bg-muted/20 h-full" data-testid={`wizard-step-${step.step}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold">{step.step}</span>
                      <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                    <p className="text-xs text-foreground/70">{step.details}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grant Calendar */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2"><DollarSign className="w-5 h-5" /> Grants & Funding Calendar</h2>
          <div className="space-y-3">
            {grants.map((grant, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <Card className="border rounded-2xl hover:shadow-md transition-all" data-testid={`grant-${i}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">{grant.name}</h3>
                          <Badge className={`text-xs rounded-full border-0 ${TYPE_COLORS[grant.type] || ''}`}>{grant.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{grant.org}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{grant.amount}</span>
                          <span>Deadline: {grant.deadline}</span>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="rounded-xl shrink-0">
                        <a href={grant.url} target="_blank" rel="noopener noreferrer">Learn More <ExternalLink className="ml-1 w-3 h-3" /></a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Key Resources */}
        <Card className="border rounded-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Key Resources</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { name: 'SBA.gov', desc: 'Small Business Administration — loans, counseling, government contracting', url: 'https://www.sba.gov' },
                { name: 'SCORE.org', desc: 'Free mentors, workshops, and business templates', url: 'https://www.score.org' },
                { name: 'Bunker Labs', desc: 'Veteran entrepreneur community and accelerator programs', url: 'https://bunkerlabs.org' },
              ].map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="p-3 border rounded-xl hover:border-secondary/40 transition-all block">
                  <h4 className="text-sm font-bold text-foreground mb-1">{r.name}</h4>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
