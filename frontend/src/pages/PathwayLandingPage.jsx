import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  GraduationCap,
  Home,
  Landmark,
  Scale,
  Shield,
  TrendingUp,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageSEO, OrganizationSchema, FAQSchema } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { trackEvent } from '@/utils/analytics';

const relatedCenters = [
  { label: 'Home', href: '/', icon: Shield },
  { label: 'Benefits', href: '/benefits', icon: Landmark },
  { label: 'Careers', href: '/careers', icon: Briefcase },
  { label: 'Business', href: '/business', icon: Building2 },
  { label: 'Education', href: '/education', icon: GraduationCap },
  { label: 'Housing', href: '/housing', icon: Home },
  { label: 'Wealth', href: '/wealth', icon: Banknote },
  { label: 'Second Chance', href: '/second-chance', icon: Scale },
];

export const pathwayPageData = {
  benefits: {
    path: '/benefits',
    eyebrow: 'Veteran Benefits Guide',
    h1: 'Veteran Benefits Guide For VA Benefits, PACT Act, GI Bill & VR&E',
    description: 'Explore free veteran benefits resources for VA benefits, PACT Act benefits, GI Bill benefits, VR&E benefits, and practical next steps after service.',
    icon: Landmark,
    resources: [
      { title: 'VA Benefits Starting Point', copy: 'Understand common VA benefits categories, what documents may matter, and where to begin.' },
      { title: 'PACT Act Benefits', copy: 'Review exposure-related benefit resources and questions to ask before filing or updating a claim.' },
      { title: 'GI Bill Benefits', copy: 'Compare education and training paths that may be supported by GI Bill benefits.' },
      { title: 'VR&E Benefits', copy: 'Learn how Veteran Readiness and Employment resources may support training, employment, or self-employment goals.' },
    ],
    faqs: [
      { question: 'What VA benefits should I check first?', answer: 'Start with health care, disability compensation, education, employment support, housing, and state-level veteran benefits. Eligibility depends on your service record and situation.' },
      { question: 'What are PACT Act benefits?', answer: 'PACT Act benefits may apply to veterans with certain toxic exposure histories. Veterans should review official VA guidance and gather service, deployment, and medical documentation.' },
      { question: 'Can I use GI Bill and VR&E benefits?', answer: 'Some veterans may be eligible for both programs, but each has different rules. Check official benefit guidance before choosing a training or education path.' },
    ],
  },
  business: {
    path: '/business',
    eyebrow: 'Veteran Business Resources',
    h1: 'Veteran Business Grants, Startup Funding & Entrepreneur Resources',
    description: 'Find free veteran entrepreneur resources for business planning, veteran startup funding, disabled veteran business resources, grants, and mentorship.',
    icon: Building2,
    resources: [
      { title: 'Business Idea Validation', copy: 'Clarify your offer, audience, pricing, and first customer path before spending money.' },
      { title: 'Veteran Business Grants', copy: 'Find grant and pitch-program resources while understanding that grants are competitive and not guaranteed.' },
      { title: 'Startup Funding Options', copy: 'Compare bootstrap, loan, partner, accelerator, and local funding paths for veteran-owned businesses.' },
      { title: 'Disabled Veteran Business Resources', copy: 'Explore certification, contracting, training, and support options for disabled veteran entrepreneurs.' },
    ],
    faqs: [
      { question: 'Can veterans get business grants?', answer: 'Some grants and competitions exist, but they are competitive. Veterans should also consider training, mentorship, contracting support, and realistic startup funding options.' },
      { question: 'What should veterans do before applying for funding?', answer: 'Build a clear business plan, know startup costs, validate demand, separate personal and business finances, and prepare basic documents.' },
      { question: 'Are there disabled veteran business resources?', answer: 'Yes. Disabled veteran entrepreneurs may find support through certifications, procurement programs, nonprofits, training programs, and local small business centers.' },
    ],
  },
  wealth: {
    path: '/wealth',
    eyebrow: 'Veteran Wealth Building',
    h1: 'Veteran Financial Freedom, VA Loan Wealth Building & Passive Income Ideas',
    description: 'Explore free veteran wealth-building resources for financial freedom, VA loan wealth building, VA loan multifamily strategy, and practical passive income ideas.',
    icon: TrendingUp,
    resources: [
      { title: 'Financial Foundation', copy: 'Build a practical base with budgeting, emergency savings, credit repair, debt reduction, and benefit awareness.' },
      { title: 'VA Loan Wealth Building', copy: 'Understand how eligible veterans may use VA loan benefits responsibly as part of a homeownership plan.' },
      { title: 'VA Loan Multifamily Strategy', copy: 'Learn the basics of owner-occupied multifamily housing research, risk, affordability, and lender conversations.' },
      { title: 'Veteran Passive Income Ideas', copy: 'Explore realistic paths such as skills-based side income, digital products, rental research, and business ownership.' },
    ],
    faqs: [
      { question: 'What does veteran financial freedom mean?', answer: 'It means building more control over income, benefits, debt, savings, housing, and long-term options. The right path depends on your household and risk tolerance.' },
      { question: 'Can a VA loan help build wealth?', answer: 'A VA loan can support homeownership for eligible veterans. It may support wealth building when used with careful budgeting, realistic property choices, and long-term planning.' },
      { question: 'Is a VA loan multifamily strategy guaranteed to work?', answer: 'No. Multifamily strategies involve market, repair, tenant, financing, and affordability risk. Veterans should research carefully and seek qualified guidance.' },
    ],
  },
  careers: {
    path: '/careers',
    eyebrow: 'Veteran Career Resources',
    h1: 'Veteran Jobs, Remote Work & Best Careers After Military Service',
    description: 'Find free veteran career resources for veteran jobs, veteran-friendly employers, remote jobs for veterans, and the best careers after military service.',
    icon: Briefcase,
    resources: [
      { title: 'Veteran-Friendly Employers', copy: 'Look for employers that value military experience, reliability, leadership, logistics, security, and technical skills.' },
      { title: 'Remote Jobs For Veterans', copy: 'Explore remote-friendly fields such as customer success, operations, cybersecurity, project coordination, and tech support.' },
      { title: 'Best Careers After Service', copy: 'Compare trades, logistics, healthcare, technology, public service, security, and management paths.' },
      { title: 'Resume Translation', copy: 'Turn military experience into civilian language focused on outcomes, leadership, reliability, and measurable responsibility.' },
    ],
    faqs: [
      { question: 'What are the best careers for veterans after military service?', answer: 'Strong paths often include skilled trades, logistics, cybersecurity, healthcare, project management, public service, security, and operations roles.' },
      { question: 'How do I find veteran-friendly employers?', answer: 'Look for employers with veteran hiring programs, military skills translators, apprenticeship paths, remote options, and clear advancement ladders.' },
      { question: 'Are remote jobs for veterans realistic?', answer: 'Yes, depending on skills and training. Remote options may include tech support, operations, customer success, cybersecurity, sales, and administrative roles.' },
    ],
  },
  secondChance: {
    path: '/second-chance',
    eyebrow: 'Second Chance Resources',
    h1: 'Discharge Upgrade, Veteran Legal Assistance & Benefits Restoration Resources',
    description: 'Find free second chance programs for veterans, discharge upgrade guidance, veteran legal assistance, and benefits restoration resources.',
    icon: Scale,
    resources: [
      { title: 'Discharge Upgrade Basics', copy: 'Learn what boards review, what documents may matter, and how to organize your application.' },
      { title: 'Veteran Legal Assistance', copy: 'Find legal aid and nonprofit resources that may help with discharge review or benefits access.' },
      { title: 'Benefits Restoration', copy: 'Understand which benefits may be affected by discharge status and what questions to ask before applying.' },
      { title: 'Second Chance Programs', copy: 'Explore employment, legal, housing, and support resources for veterans rebuilding after setbacks.' },
    ],
    faqs: [
      { question: 'How do I start a discharge upgrade?', answer: 'Start by identifying the correct review board, collecting records, writing a clear statement, and finding qualified veteran legal assistance if available.' },
      { question: 'Can a discharge upgrade restore benefits?', answer: 'It may help in some situations, but outcomes depend on facts, board decisions, and benefit rules. Veterans should verify with official sources or qualified advocates.' },
      { question: 'Are second chance programs for veterans free?', answer: 'Some are free, nonprofit, pro bono, or low-cost. Veterans Passage highlights free-resource paths first whenever possible.' },
    ],
  },
  education: {
    path: '/education',
    eyebrow: 'Veteran Education Benefits',
    h1: 'GI Bill Programs, Veteran Education Benefits & High-Paying Career Training',
    description: 'Explore free resources for GI Bill programs, veteran education benefits, and high-paying careers with GI Bill-supported training paths.',
    icon: GraduationCap,
    resources: [
      { title: 'GI Bill Programs', copy: 'Research approved schools, training programs, certification paths, and how benefits may apply.' },
      { title: 'High-Paying Career Training', copy: 'Compare fields such as healthcare, skilled trades, cybersecurity, cloud support, logistics, and project management.' },
      { title: 'Education Benefit Planning', copy: 'Think through time, cost, completion rates, job outcomes, and whether the credential matches your goal.' },
      { title: 'VR&E And Career Fit', copy: 'Explore whether VR&E resources may support a career plan tied to employment or self-employment.' },
    ],
    faqs: [
      { question: 'What GI Bill programs should veterans compare?', answer: 'Compare approved degree, certificate, apprenticeship, technical, and licensing programs based on cost, time, completion support, and job outcomes.' },
      { question: 'Can the GI Bill support high-paying career training?', answer: 'It may support eligible programs, including some technical and career-focused training. Always verify program approval before enrolling.' },
      { question: 'How should I choose a veteran education program?', answer: 'Start with the career outcome, then compare program approval, cost, schedule, employer demand, credential value, and support services.' },
    ],
  },
  housing: {
    path: '/housing',
    eyebrow: 'Veteran Housing Resources',
    h1: 'VA Loan Benefits, Veteran Housing Assistance & First-Time Buyer Resources',
    description: 'Explore free veteran housing assistance resources, VA loan benefits, and VA loan first time home buyer guidance for veterans and families.',
    icon: Home,
    resources: [
      { title: 'VA Loan Benefits', copy: 'Understand basic VA loan benefits, eligibility questions, funding fee considerations, and lender conversations.' },
      { title: 'First-Time Buyer Guidance', copy: 'Review budgeting, credit, preapproval, inspections, closing costs, and realistic monthly payment planning.' },
      { title: 'Veteran Housing Assistance', copy: 'Find housing support resources for stability, affordability, homelessness prevention, and local help.' },
      { title: 'Homeownership Readiness', copy: 'Prepare documents, compare lenders, understand risk, and decide whether buying now fits your household.' },
    ],
    faqs: [
      { question: 'What are VA loan benefits?', answer: 'VA loans may offer favorable terms for eligible veterans, including options with no down payment. Details depend on eligibility, lender rules, credit, and affordability.' },
      { question: 'Can a first-time home buyer use a VA loan?', answer: 'Yes, eligible first-time buyers may use a VA loan. It is important to understand payments, closing costs, inspections, and long-term affordability.' },
      { question: 'Where can veterans find housing assistance?', answer: 'Veterans may find help through VA programs, local housing agencies, nonprofits, legal aid, and emergency support resources depending on need and location.' },
    ],
  },
};

export default function PathwayLandingPage({ pageKey }) {
  const page = pathwayPageData[pageKey] || pathwayPageData.benefits;
  const Icon = page.icon;
  const filteredLinks = relatedCenters.filter((link) => link.href !== page.path);

  return (
    <div className="min-h-screen bg-background" data-testid={`${pageKey}-landing-page`}>
      <PageSEO path={page.path} />
      <OrganizationSchema />
      <FAQSchema faqs={page.faqs} />
      <Navigation />

      <section className="border-b bg-gradient-to-br from-background via-muted/20 to-secondary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid lg:grid-cols-[1fr_0.8fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-secondary mb-6">
                <Icon className="w-4 h-4" />
                {page.eyebrow}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-foreground max-w-4xl">
                {page.h1}
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                {page.description}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="rounded-full bg-secondary hover:bg-secondary/90 h-12 px-7 text-base font-bold" onClick={() => trackEvent('pathway_page_cta_click', { page: page.path })}>
                  <Link to="/signup">Explore Free Resources <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full h-12 px-7 text-base font-bold border-2">
                  <Link to="/">Back To Home</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-6 sm:p-8 shadow-lg">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-5">
                <Icon className="w-7 h-7 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Free veteran-first guidance</h2>
              <div className="space-y-3">
                {['No paid veteran service positioning', 'Built for veterans and families', 'Practical next-step resource paths'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Resource Areas</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Start with the resources that match your next step</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              These cards are designed to help you scan options quickly and decide what to research first.
            </p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {page.resources.map((resource) => (
              <Card key={resource.title} className="rounded-lg border bg-background h-full shadow-none">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{resource.copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{page.eyebrow} FAQ</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Clear answers for veterans and families researching free resources.
            </p>
          </div>
          <Accordion type="single" collapsible className="rounded-lg border bg-background px-4 sm:px-6">
            {page.faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`}>
                <AccordionTrigger className="text-base font-bold text-foreground hover:no-underline">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-gradient-to-br from-secondary/10 via-background to-accent/10 p-6 sm:p-10">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-3">Explore related veteran resource centers</h2>
                <p className="text-muted-foreground">
                  Veterans Passage connects benefits, careers, education, housing, second chances, business, and wealth-building in one veteran-first platform.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {filteredLinks.map((link) => (
                  <Button key={link.href} asChild variant="outline" className="rounded-full bg-background">
                    <Link to={link.href}>
                      <link.icon className="w-4 h-4 mr-2" />
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-8">
              <Button asChild size="lg" className="rounded-full bg-secondary hover:bg-secondary/90 h-12 px-7 text-base font-bold">
                <Link to="/signup">Explore Free Resources <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
