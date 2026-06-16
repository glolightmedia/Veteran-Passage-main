import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Veteran Passage';
const SITE_URL = 'https://veteranpassage.org';
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

const seoConfig = {
  '/': {
    title: 'Veteran Resources, Benefits, Careers & Business Support | Veterans Passage',
    description: 'Veterans Passage helps veterans and families find benefits, careers, education, business resources, housing guidance, second-chance support, and wealth-building opportunities.',
    keywords: 'veteran resources, veteran benefits guide, veteran assistance programs, veteran career resources, veteran business resources, veteran entrepreneur resources, veteran housing resources, veteran education benefits, veterans starting a business, veteran financial freedom, veterans transition assistance'
  },
  '/login': {
    title: 'Sign In | Veteran Passage',
    description: 'Sign in to your Veteran Passage account to access personalized benefits, resources, and career pathways based on your service history.',
    keywords: 'veteran login, veteran passage sign in, veteran benefits portal'
  },
  '/signup': {
    title: 'Create Account | Veteran Passage',
    description: 'Join Veteran Passage to get personalized benefit recommendations, career pathways, and discharge upgrade resources. All discharge types welcome.',
    keywords: 'veteran sign up, veteran registration, OTH veteran support, military veteran services'
  },
  '/dashboard': {
    title: 'Dashboard | Veteran Passage',
    description: 'Your personalized veteran dashboard. Track saved resources, access benefits navigator, and manage your transition pathway.',
    keywords: 'veteran dashboard, veteran benefits tracker, military transition tools'
  },
  '/navigator': {
    title: 'Benefits Navigator | Veteran Passage',
    description: 'Answer a few questions to discover VA benefits, grants, and programs you qualify for — even with an OTH or less-than-honorable discharge.',
    keywords: 'can i get VA benefits with OTH discharge, veteran benefits navigator, discharge upgrade eligibility, VA benefits checker'
  },
  '/resources': {
    title: 'Resource Directory | Veteran Passage',
    description: 'Curated directory of second-chance jobs, pro-bono legal aid, OTH-friendly grants, and veteran support services. Verified organizations nationwide.',
    keywords: 'veteran resources, second chance jobs for veterans, veteran legal aid, OTH friendly grants, veteran small business loans, military veterans support services'
  },
  '/benefits': {
    title: 'Veteran Benefits Guide: VA, PACT Act, GI Bill & VR&E | Veterans Passage',
    description: 'Explore a free veteran benefits guide covering VA benefits, PACT Act benefits, GI Bill benefits, VR&E benefits, and practical next steps.',
    keywords: 'veteran benefits guide, VA benefits, PACT Act benefits, GI Bill benefits, VR&E benefits'
  },
  '/business': {
    title: 'Veteran Business Grants & Entrepreneur Resources | Veterans Passage',
    description: 'Find free veteran entrepreneur resources for business grants, startup funding, disabled veteran business resources, and business launch planning.',
    keywords: 'veteran business grants, veteran entrepreneur resources, veteran startup funding, disabled veteran business resources'
  },
  '/wealth': {
    title: 'Veteran Financial Freedom & VA Loan Wealth Building | Veterans Passage',
    description: 'Explore veteran financial freedom resources, VA loan wealth building, VA loan multifamily strategy basics, and veteran passive income ideas.',
    keywords: 'veteran financial freedom, VA loan wealth building, VA loan multifamily strategy, veteran passive income ideas'
  },
  '/careers': {
    title: 'Veteran Jobs, Remote Work & Career Resources | Veterans Passage',
    description: 'Find free veteran career resources for veteran jobs, veteran-friendly employers, remote jobs for veterans, and careers after military service.',
    keywords: 'veteran jobs, veteran-friendly employers, remote jobs for veterans, best careers for veterans after military service'
  },
  '/second-chance': {
    title: 'Discharge Upgrade & Veteran Legal Assistance | Veterans Passage',
    description: 'Find free second chance programs for veterans, discharge upgrade guidance, veteran legal assistance, and benefits restoration resources.',
    keywords: 'discharge upgrade, veteran legal assistance, benefits restoration, second chance programs for veterans'
  },
  '/education': {
    title: 'GI Bill Programs & Veteran Education Benefits | Veterans Passage',
    description: 'Explore GI Bill programs, veteran education benefits, and high-paying career training paths supported by education benefits.',
    keywords: 'GI Bill programs, high paying careers with GI Bill, veteran education benefits'
  },
  '/housing': {
    title: 'VA Loan Benefits & Veteran Housing Assistance | Veterans Passage',
    description: 'Explore VA loan benefits, veteran housing assistance, and VA loan first-time home buyer guidance for veterans and families.',
    keywords: 'VA loan benefits, veteran housing assistance, VA loan first time home buyer'
  },
  '/profile': {
    title: 'My Profile | Veteran Passage',
    description: 'Update your service history and discharge information to get better personalized benefit recommendations.',
    keywords: 'veteran profile, veteran account settings'
  }
};

export function PageSEO({ path }) {
  const config = seoConfig[path] || seoConfig['/'];

  return (
    <Helmet>
      <title>{config.title}</title>
      <meta name="description" content={config.description} />
      <meta name="keywords" content={config.keywords} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={config.title} />
      <meta property="og:description" content={config.description} />
      <meta property="og:image" content={DEFAULT_IMAGE} />
      <meta property="og:url" content={`${SITE_URL}${path}`} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={config.title} />
      <meta name="twitter:description" content={config.description} />
      <meta name="twitter:image" content={DEFAULT_IMAGE} />

      {/* Canonical */}
      <link rel="canonical" href={`${SITE_URL}${path}`} />
    </Helmet>
  );
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Veteran Passage',
    alternateName: 'VeteranPassage',
    url: SITE_URL,
    logo: DEFAULT_IMAGE,
    description: 'Free veteran success platform helping veterans and families find benefits, careers, education, business resources, housing guidance, second-chance support, and wealth-building opportunities.',
    foundingDate: '2026',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@veteranpassage.org',
      contactType: 'customer support'
    },
    areaServed: {
      '@type': 'Country',
      name: 'United States'
    },
    serviceType: [
      'Veteran Benefits Navigation',
      'Discharge Upgrade Resources',
      'Veteran Career Services',
      'Military Transition Support',
      'Veteran Business Resources',
      'Veteran Housing Resources',
      'Veteran Education Benefits',
      'Veteran Financial Freedom Resources'
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

export function FAQSchema({ faqs }) {
  if (!faqs?.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
