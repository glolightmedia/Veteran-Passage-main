import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  GraduationCap,
  Handshake,
  Home,
  Landmark,
  Scale,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageSEO, OrganizationSchema, FAQSchema } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { trackEvent } from '@/utils/analytics';

const trustSignals = [
  'Veteran-Focused Platform',
  '100% Free Resources',
  'Built For Veterans & Families',
  'New Opportunities Added Regularly',
];

const authorityStatements = [
  'Built to simplify the transition after service',
  'Focused on benefits, careers, business, housing, education, and financial freedom',
  'Designed to help veterans find the next best step',
];

const pathways = [
  {
    icon: Shield,
    title: 'Benefits Navigator',
    copy: 'Use a veteran benefits guide to explore VA benefits, PACT Act support, GI Bill options, and VR&E resources.',
    cta: 'Explore Benefits',
    href: '/benefits',
  },
  {
    icon: Briefcase,
    title: 'Career Center',
    copy: 'Find veteran career resources, veteran-friendly employers, remote jobs for veterans, and practical transition support.',
    cta: 'Find Careers',
    href: '/careers',
  },
  {
    icon: Building2,
    title: 'Business Launch Center',
    copy: 'Explore veteran business resources, veteran entrepreneur resources, startup funding, and veteran business grants.',
    cta: 'Start a Business',
    href: '/business',
  },
  {
    icon: Scale,
    title: 'Second Chance Center',
    copy: 'Find discharge upgrade resources, veteran legal assistance, benefits restoration guidance, and second-chance support.',
    cta: 'Explore Second Chance Resources',
    href: '/second-chance',
  },
  {
    icon: TrendingUp,
    title: 'Wealth Building Center',
    copy: 'Learn about veteran financial freedom, VA loan investing, GI Bill high-paying careers, and long-term wealth paths.',
    cta: 'Build Wealth',
    href: '/wealth',
  },
];

const internalLinks = [
  { label: 'Benefits', href: '/benefits', icon: Landmark },
  { label: 'Careers', href: '/careers', icon: Briefcase },
  { label: 'Business', href: '/business', icon: Building2 },
  { label: 'Education', href: '/education', icon: GraduationCap },
  { label: 'Housing', href: '/housing', icon: Home },
  { label: 'Wealth', href: '/wealth', icon: Banknote },
  { label: 'Second Chance', href: '/second-chance', icon: Scale },
  { label: 'Blog', href: '/blog', icon: BookOpen },
];

const faqs = [
  {
    question: 'What veteran benefits am I eligible for?',
    answer: 'Eligibility depends on your service history, discharge type, disability rating, education goals, location, and current needs. Veterans Passage helps organize veteran benefits guide resources so you can find relevant next steps.',
  },
  {
    question: 'How do I find veteran resources near me?',
    answer: 'Start with your top need, such as benefits, career support, housing, education, legal help, or business resources. Then use Veterans Passage pathways and resource listings to narrow options by category.',
  },
  {
    question: 'Can veterans get business grants?',
    answer: 'Some veterans may qualify for grants, training, pitch competitions, nonprofit support, or local startup programs. Veterans Passage highlights veteran entrepreneur resources and funding paths to research.',
  },
  {
    question: 'What are the best careers for veterans after military service?',
    answer: 'Strong options often include skilled trades, logistics, cybersecurity, healthcare, project management, government roles, and veteran-friendly employers that value military experience.',
  },
  {
    question: 'Can I use the GI Bill for high-paying career training?',
    answer: 'The GI Bill may support approved education and training programs, including some technical and career-focused paths. Always verify program approval and benefit fit before enrolling.',
  },
  {
    question: 'Can veterans use a VA loan to build wealth?',
    answer: 'A VA loan can help eligible veterans buy a home with favorable terms. Some veterans use homeownership as part of a long-term financial plan, but decisions should be based on affordability and risk.',
  },
  {
    question: 'How do I upgrade my military discharge?',
    answer: 'A discharge upgrade usually requires documentation, a clear argument, and filing with the correct review board. Veterans Passage points veterans toward legal assistance and discharge upgrade resources.',
  },
  {
    question: 'Is Veterans Passage free to use?',
    answer: 'Yes. Veterans Passage is designed as a free veteran success platform for veterans and families looking for resources, guidance, and opportunity pathways.',
  },
];

function HeroVisual() {
  const items = [
    { icon: Landmark, label: 'Benefits' },
    { icon: Briefcase, label: 'Careers' },
    { icon: Building2, label: 'Business' },
    { icon: Home, label: 'Housing' },
    { icon: GraduationCap, label: 'Education' },
    { icon: TrendingUp, label: 'Wealth' },
  ];

  return (
    <div className="relative rounded-2xl border bg-background shadow-xl overflow-hidden" aria-label="Veteran opportunity pathways visual">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-secondary via-accent to-green-600" />
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <img src="/logo.png" alt="Veterans Passage logo" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold text-secondary">Veterans Passage</p>
            <p className="text-2xl font-bold text-foreground">Opportunity Pathways</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl border bg-muted/30 p-4 min-h-[92px]">
              <item.icon className="w-6 h-6 text-secondary mb-3" />
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl bg-secondary/10 p-4 flex items-start gap-3">
          <Search className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            One place to explore veteran assistance programs and move toward your next best step.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      <PageSEO path="/" />
      <OrganizationSchema />
      <FAQSchema faqs={faqs} />
      <Navigation />

      <section className="relative overflow-hidden border-b bg-gradient-to-br from-background via-muted/20 to-secondary/5" data-testid="hero-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-secondary mb-6">
                <Sparkles className="w-4 h-4" />
                Free veteran resources for life after service
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground max-w-4xl">
                Discover Veteran Benefits, Careers, Business Opportunities & Wealth-Building Resources
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Veterans Passage helps veterans and their families find benefits, employment opportunities, education programs, business resources, housing solutions, and financial freedom strategies - all in one place.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="rounded-full bg-secondary hover:bg-secondary/90 h-12 px-7 text-base font-bold" onClick={() => trackEvent('hero_cta_click', { cta: 'explore_free_resources' })}>
                  <a href="#pathways">Explore Free Resources <ArrowRight className="w-4 h-4 ml-2" /></a>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full h-12 px-7 text-base font-bold border-2" onClick={() => trackEvent('hero_cta_click', { cta: 'get_veteran_updates' })}>
                  <Link to="/signup">Get Veteran Updates</Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                {trustSignals.map((signal) => (
                  <div key={signal} className="flex items-center gap-2 rounded-xl border bg-background/80 px-4 py-3 text-sm font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    {signal}
                  </div>
                ))}
              </div>
            </div>
            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16" data-testid="authority-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-4">
            {authorityStatements.map((statement) => (
              <Card key={statement} className="border rounded-lg shadow-none">
                <CardContent className="p-5 flex items-start gap-3">
                  <BadgeCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-foreground">{statement}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pathways" className="py-14 sm:py-20 bg-muted/30" data-testid="pathways-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Veteran Resource Pathways</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Find the right veteran assistance programs faster</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Choose the pathway that matches your goal: get more benefits, find better work, launch a business, rebuild after setbacks, or build wealth.
            </p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
            {pathways.map((pathway) => (
              <Card key={pathway.title} className="rounded-lg border bg-background h-full shadow-none hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="w-11 h-11 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                    <pathway.icon className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{pathway.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{pathway.copy}</p>
                  <Button asChild variant="link" className="justify-start px-0 mt-5 text-secondary font-bold" onClick={() => trackEvent('pathway_click', { pathway: pathway.title })}>
                    <Link to={pathway.href}>{pathway.cta} <ArrowRight className="w-4 h-4 ml-1" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {internalLinks.map((link) => (
              <Button key={link.href} asChild variant="outline" className="rounded-full bg-background">
                <Link to={link.href}>
                  <link.icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20" data-testid="difference-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Why Veterans Passage Is Different</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">More Than Benefits. A Roadmap To Success.</h2>
            </div>
            <div className="space-y-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
              <p>
                Most veteran sites focus only on benefits or claims. Veterans Passage helps veterans move from service to long-term success through benefits, employment, education, entrepreneurship, housing, second chances, and wealth-building.
              </p>
              <p>
                The goal is simple: help veterans and families understand available veteran resources, choose a practical next step, and avoid getting stuck in disconnected systems.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {['Veteran benefits guide', 'Veteran career resources', 'Veteran housing resources', 'Veterans transition assistance'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Handshake className="w-4 h-4 text-secondary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-muted/30" data-testid="faq-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Veteran Resources FAQ</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Quick answers about veteran benefits, career resources, education benefits, VA loans, business resources, and second-chance support.
            </p>
          </div>
          <Accordion type="single" collapsible className="rounded-lg border bg-background px-4 sm:px-6">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`}>
                <AccordionTrigger className="text-base font-bold text-foreground hover:no-underline">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-14 sm:py-20" data-testid="final-cta-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-gradient-to-br from-secondary/10 via-background to-accent/10 p-8 sm:p-12 text-center">
            <Users className="w-10 h-10 text-secondary mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Ready To Discover Your Next Opportunity?</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Explore free veteran resources designed to help you succeed after military service.
            </p>
            <Button asChild size="lg" className="rounded-full bg-secondary hover:bg-secondary/90 h-12 px-8 text-base font-bold" onClick={() => trackEvent('final_cta_click', { cta: 'get_started_free' })}>
              <Link to="/signup">Get Started Free <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
