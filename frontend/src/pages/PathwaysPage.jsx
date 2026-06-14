import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, GraduationCap, Scale, Heart, Rocket, ArrowRight, CheckCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { getDischargeTier, triageTiers } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';

const pathways = [
  {
    id: 'career',
    icon: Briefcase,
    title: 'Career Transition',
    description: 'Find veteran-friendly employers and translate your military skills to civilian careers.',
    color: 'text-blue-600 bg-blue-50',
    steps: [
      { label: 'Skills Assessment', description: 'Translate military MOS to civilian job titles' },
      { label: 'Resume Building', description: 'Free veteran resume services (Hire Heroes USA)' },
      { label: 'Job Search', description: 'Browse second-chance friendly employers' },
      { label: 'Interview Prep', description: 'Connect with a mentor for mock interviews' },
    ],
    tiers: ['green', 'yellow', 'blue'],
    cta: { label: 'Browse Jobs', link: '/jobs' }
  },
  {
    id: 'business',
    icon: Rocket,
    title: 'Entrepreneur Track',
    description: 'Start your own business with veteran grants, SBA programs, and mentorship.',
    color: 'text-purple-600 bg-purple-50',
    steps: [
      { label: 'Business Plan', description: 'Free planning tools via SCORE and SBA' },
      { label: 'LLC / EIN Setup', description: 'Step-by-step incorporation guide' },
      { label: 'Funding', description: 'Veteran grants, SBA microloans, Bunker Labs' },
      { label: 'Mentorship', description: 'Connect with veteran business owners' },
    ],
    tiers: ['green', 'yellow'],
    cta: { label: 'Start Your Business', link: '/entrepreneur' }
  },
  {
    id: 'legal',
    icon: Scale,
    title: 'Discharge Upgrade',
    description: 'Understand your options and connect with free legal aid for discharge upgrades.',
    color: 'text-amber-600 bg-amber-50',
    steps: [
      { label: 'Understand Your Discharge', description: 'Learn what your DD-214 codes mean' },
      { label: 'Eligibility Check', description: 'Determine if you qualify for an upgrade' },
      { label: 'Legal Aid', description: 'Connect with free veteran legal services' },
      { label: 'File Application', description: 'Submit to the Discharge Review Board' },
    ],
    tiers: ['green', 'yellow', 'blue'],
    cta: { label: 'Find Legal Aid', link: '/resources' }
  },
  {
    id: 'education',
    icon: GraduationCap,
    title: 'Education & Training',
    description: 'Access GI Bill benefits, vocational training, and college prep programs.',
    color: 'text-green-600 bg-green-50',
    steps: [
      { label: 'GI Bill Check', description: 'Verify your education benefit eligibility' },
      { label: 'College Prep', description: 'Veterans Upward Bound free programs' },
      { label: 'Vocational Training', description: 'Helmets to Hardhats, trade programs' },
      { label: 'Certifications', description: 'IT, healthcare, project management certs' },
    ],
    tiers: ['green', 'yellow'],
    cta: { label: 'Explore Programs', link: '/resources' }
  },
  {
    id: 'wellness',
    icon: Heart,
    title: 'Wellness & Support',
    description: 'Mental health, peer support, and crisis resources for you and your family.',
    color: 'text-rose-600 bg-rose-50',
    steps: [
      { label: 'Crisis Support', description: 'Veterans Crisis Line: 988, press 1' },
      { label: 'Counseling', description: 'Free therapy via Give an Hour, Cohen Network' },
      { label: 'Peer Support', description: 'Connect with veterans who understand' },
      { label: 'Family Support', description: 'Resources for military families' },
    ],
    tiers: ['green', 'yellow', 'blue'],
    cta: { label: 'Get Support', link: '/resources' }
  }
];

export default function PathwaysPage() {
  const { user } = useAuth();
  const userTier = getDischargeTier(user?.discharge);
  const tierInfo = triageTiers[userTier];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="pathways-page">
        <PageSEO path="/pathways" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="pathways-heading">The Map Room</h1>
          <p className="text-base text-muted-foreground">Choose your pathway. Each one is tailored to your situation and discharge type.</p>
        </motion.div>

        <div className="space-y-4">
          {pathways.map((pathway, index) => {
            const Icon = pathway.icon;
            const isAvailable = pathway.tiers.includes(userTier);
            return (
              <motion.div
                key={pathway.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <Card className={`border rounded-2xl transition-all ${isAvailable ? 'hover:shadow-md' : 'opacity-50 border-dashed'}`} data-testid={`pathway-${pathway.id}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row gap-5">
                      <div className="flex-shrink-0 flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pathway.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="lg:w-48">
                          <h3 className="text-lg font-bold text-foreground">{pathway.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{pathway.description}</p>
                          {!isAvailable && (
                            <Badge variant="outline" className="mt-2 text-xs border-amber-300 text-amber-600 rounded-full">Upgrade may be needed</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {pathway.steps.map((step, si) => (
                          <div key={si} className="relative p-3 bg-muted/30 rounded-xl border border-border/50">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-bold text-secondary">{si + 1}</span>
                              <CheckCircle className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">{step.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
                          </div>
                        ))}
                      </div>

                      {isAvailable && pathway.cta && (
                        <div className="flex items-center shrink-0">
                          <Button asChild size="sm" className="rounded-xl bg-secondary hover:bg-secondary/90" data-testid={`pathway-cta-${pathway.id}`}>
                            <Link to={pathway.cta.link}>{pathway.cta.label} <ArrowRight className="ml-1 w-3 h-3" /></Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
