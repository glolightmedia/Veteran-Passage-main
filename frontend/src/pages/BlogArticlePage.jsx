import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, User, Calendar, CheckCircle, ExternalLink, Star, AlertTriangle, HandHelping } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { trackEvent } from '@/utils/analytics';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const CTA_CONFIGS = {
  decoder: { title: "Need a faster answer?", desc: "Use the DD-214 Decoder to understand your specific situation.", btns: [{ label: "Use DD-214 Decoder", href: "/dd214" }, { label: "Get Help Now", href: "/donate" }] },
  jobs: { title: "Ready to take action?", desc: "Find jobs matched to your background and discharge situation.", btns: [{ label: "Find Job Matches", href: "/jobs" }, { label: "Get Help Applying", href: "/jobs" }] },
  legal: { title: "Need legal help?", desc: "Connect with free legal aid for discharge upgrades.", btns: [{ label: "Find Legal Aid", href: "/resources" }, { label: "Use DD-214 Decoder", href: "/dd214" }] },
  business: { title: "Ready to start your business?", desc: "Access free training, grants, and mentorship for veteran entrepreneurs.", btns: [{ label: "Entrepreneur Track", href: "/entrepreneur" }, { label: "Find Grants", href: "/resources" }] },
};

function CTABlock({ config, slug, position }) {
  if (!config) return null;
  const cta = CTA_CONFIGS[config.cta_type] || CTA_CONFIGS.decoder;
  const trackClick = (label) => {
    trackEvent('cta_click', { slug, position, label });
    axios.post(`${API}/api/blog/articles/${slug}/track`, { type: 'cta_click', metadata: { position, label } }).catch(() => {});
  };
  return (
    <Card className="border-2 border-secondary/20 rounded-2xl bg-secondary/5 my-6" data-testid={`cta-${position}`}>
      <CardContent className="p-5 text-center">
        <h3 className="text-base font-bold text-foreground mb-1">{cta.title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{cta.desc}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {cta.btns.map((b, i) => (
            <Button key={i} asChild variant={i === 0 ? "default" : "outline"} className={`rounded-xl ${i === 0 ? 'bg-secondary hover:bg-secondary/90' : ''}`} onClick={() => trackClick(b.label)}>
              <Link to={b.href}>{b.label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AffiliateBlock({ slots, slug }) {
  if (!slots || slots.length === 0) return null;
  const trackClick = (name) => {
    trackEvent('affiliate_click', { slug, affiliate: name });
    axios.post(`${API}/api/blog/articles/${slug}/track`, { type: 'affiliate_click', metadata: { affiliate: name } }).catch(() => {});
  };
  return (
    <div className="my-6 space-y-3" data-testid="affiliate-block">
      <h3 className="text-base font-bold text-foreground">Our Recommendations</h3>
      {slots.map((s, i) => (
        <Card key={i} className="border rounded-2xl" data-testid={`affiliate-${i}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-foreground">{s.name}</h4>
                  {s.badge && <Badge className="text-xs rounded-full bg-amber-100 text-amber-800 border-0">{s.badge}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{s.description}</p>
                {s.pros && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {s.pros.map((p, j) => <span key={j} className="text-xs text-green-700 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />{p}</span>)}
                  </div>
                )}
                {s.cautions && s.cautions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.cautions.map((c, j) => <span key={j} className="text-xs text-amber-600 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />{c}</span>)}
                  </div>
                )}
              </div>
              <Button asChild size="sm" className="rounded-xl bg-secondary hover:bg-secondary/90 shrink-0" onClick={() => trackClick(s.name)}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">Visit Provider <ExternalLink className="w-3 h-3 ml-1" /></a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BlogArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/blog/articles/${slug}`)
      .then(r => { setArticle(r.data); trackEvent('page_view', { slug, type: 'blog_article' }); })
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-secondary border-t-transparent" /></div>;
  if (!article) return <div className="min-h-screen flex items-center justify-center"><p>Article not found. <Link to="/blog" className="text-secondary underline">Back to blog</Link></p></div>;

  const seo = article.seo || {};
  const cta = article.cta_config || {};
  const contentParts = (article.content || "").split("\n\n");
  const midpoint = Math.floor(contentParts.length / 2);

  return (
    <div className="min-h-screen bg-background" data-testid="blog-article">
      <Helmet>
        <title>{seo.title || article.title}</title>
        <meta name="description" content={seo.meta_description || article.excerpt} />
        {seo.focus_keyword && <meta name="keywords" content={[seo.focus_keyword, ...(seo.secondary_keywords || [])].join(', ')} />}
        <meta property="og:title" content={seo.og_title || seo.title || article.title} />
        <meta property="og:description" content={seo.og_description || seo.meta_description || article.excerpt} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={seo.canonical || `https://veteranpassage.org/blog/${slug}`} />
        {seo.faq_schema && article.faq?.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": article.faq.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } }))
          })}</script>
        )}
        {seo.article_schema && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org", "@type": "Article",
            "headline": article.title, "description": article.excerpt,
            "author": { "@type": "Person", "name": article.author },
            "datePublished": article.published_at, "dateModified": article.updated_at
          })}</script>
        )}
      </Helmet>

      <Navigation />

      <article className="py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <Link to="/blog" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to blog
          </Link>

          {/* Header */}
          <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Badge variant="outline" className="text-xs rounded-full capitalize mb-3">{article.category}</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-2" data-testid="article-title">{article.title}</h1>
            {article.subtitle && <p className="text-lg text-muted-foreground">{article.subtitle}</p>}

            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{article.author}</span>
              {article.read_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.read_time}</span>}
              {article.updated_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Updated {new Date(article.updated_at).toLocaleDateString()}</span>}
            </div>

            <p className="text-xs text-muted-foreground mt-2 italic">Reviewed for clarity and updated regularly.</p>
          </motion.header>

          {/* Who this is for */}
          {article.who_for && (
            <div className="p-3 bg-muted/30 rounded-xl mb-6 text-sm">
              <span className="font-semibold text-foreground">Who this is for: </span>
              <span className="text-muted-foreground">{article.who_for}</span>
            </div>
          )}

          {/* Affiliate disclosure */}
          {article.affiliate_disclosure && (
            <p className="text-xs text-muted-foreground mb-4 italic">This article may include partner links. We may earn a commission at no extra cost to you.</p>
          )}

          {/* Top CTA */}
          {cta.top_cta && <CTABlock config={cta} slug={slug} position="top" />}

          {/* Content */}
          <div className="prose prose-sm max-w-none" data-testid="article-content">
            {contentParts.map((part, i) => {
              // Insert mid CTA
              if (i === midpoint && cta.mid_cta) {
                return (
                  <div key={i}>
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: formatContent(part) }} />
                    <CTABlock config={cta} slug={slug} position="mid" />
                  </div>
                );
              }
              return <div key={i} className="whitespace-pre-wrap text-foreground leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: formatContent(part) }} />;
            })}
          </div>

          {/* Affiliate Block */}
          {article.affiliate_enabled && <AffiliateBlock slots={article.affiliate_slots} slug={slug} />}

          {/* FAQ */}
          {article.faq?.length > 0 && (
            <section className="mt-8 mb-6" data-testid="faq-section">
              <h2 className="text-xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {article.faq.map((f, i) => (
                  <Card key={i} className="border rounded-xl">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-bold text-foreground mb-1">{f.q}</h3>
                      <p className="text-sm text-muted-foreground">{f.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Bottom CTA */}
          {cta.bottom_cta && (
            <Card className="border-2 border-secondary/30 rounded-2xl gradient-hero text-white my-8" data-testid="cta-bottom">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">Need help figuring out your next move?</h3>
                <p className="text-sm text-white/80 mb-4">Use the DD-214 Decoder, explore jobs, or request help now.</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button asChild className="rounded-xl bg-white text-foreground hover:bg-white/90" onClick={() => trackEvent('cta_click', { slug, position: 'bottom', label: 'Decode DD-214' })}>
                    <Link to="/dd214">Decode My DD-214</Link>
                  </Button>
                  <Button asChild className="rounded-xl bg-white/20 text-white hover:bg-white/30 border border-white/30" onClick={() => trackEvent('cta_click', { slug, position: 'bottom', label: 'See Jobs' })}>
                    <Link to="/jobs">See Job Matches</Link>
                  </Button>
                  <Button asChild className="rounded-xl bg-white/20 text-white hover:bg-white/30 border border-white/30" onClick={() => trackEvent('cta_click', { slug, position: 'bottom', label: 'Get Help' })}>
                    <Link to="/donate">Get Help Now</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
}

function formatContent(text) {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-foreground mt-6 mb-3">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-foreground mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-muted-foreground list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-sm text-muted-foreground list-decimal">$2</li>');
}
