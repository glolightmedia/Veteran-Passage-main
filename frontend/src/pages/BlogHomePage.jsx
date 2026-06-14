import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, Search, FileText, Briefcase, Building, Home, Wrench } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageSEO } from '@/components/SEO';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const TOPIC_ICONS = { benefits: FileText, dd214: FileText, jobs: Briefcase, business: Building, housing: Home, tools: Wrench, guides: BookOpen };
const TOPICS = [
  { id: 'benefits', label: 'Benefits' },
  { id: 'dd214', label: 'DD-214 & Discharge' },
  { id: 'jobs', label: 'Jobs & Careers' },
  { id: 'business', label: 'Business' },
  { id: 'tools', label: 'Tools & Services' },
  { id: 'guides', label: 'Guides' },
];

export default function BlogHomePage() {
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/blog/featured`).catch(() => ({ data: { articles: [] } })),
      axios.get(`${API}/api/blog/articles?limit=12`).catch(() => ({ data: { articles: [] } })),
    ]).then(([fRes, lRes]) => {
      setFeatured(fRes.data.articles);
      setLatest(lRes.data.articles);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="blog-home">
      <PageSEO path="/blog" />
      <Navigation />

      {/* Hero */}
      <section className="py-14 bg-gradient-to-br from-secondary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Guides, Answers, and Next Steps for Veterans</h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">Practical help for benefits, jobs, business, and discharge-related questions.</p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-10 space-y-12">

        {/* Featured */}
        {featured.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Featured Guides</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.slice(0, 6).map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/blog/${a.slug}`}>
                    <Card className="border rounded-2xl hover:shadow-md hover:border-secondary/30 transition-all h-full" data-testid={`featured-${i}`}>
                      <CardContent className="p-5">
                        <Badge variant="outline" className="text-xs rounded-full mb-2 capitalize">{a.category}</Badge>
                        <h3 className="text-base font-bold text-foreground mb-1 line-clamp-2">{a.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{a.excerpt}</p>
                        <p className="text-xs text-secondary mt-2 font-medium flex items-center gap-1">Read guide <ArrowRight className="w-3 h-3" /></p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Topics */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Browse by Topic</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {TOPICS.map(t => {
              const Icon = TOPIC_ICONS[t.id] || BookOpen;
              return (
                <Link key={t.id} to={`/blog?topic=${t.id}`} className="p-4 border rounded-xl text-center hover:border-secondary/40 hover:bg-secondary/5 transition-all" data-testid={`topic-${t.id}`}>
                  <Icon className="w-5 h-5 mx-auto mb-2 text-secondary" />
                  <span className="text-xs font-medium text-foreground">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-2xl gradient-hero p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Need Answers Now?</h2>
          <p className="text-sm text-white/80 mb-4">Use our tools to get personalized help instantly.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild variant="secondary" className="rounded-xl bg-white text-foreground hover:bg-white/90"><Link to="/dd214">Decode DD-214</Link></Button>
            <Button asChild variant="secondary" className="rounded-xl bg-white text-foreground hover:bg-white/90"><Link to="/jobs">Find Jobs</Link></Button>
            <Button asChild variant="secondary" className="rounded-xl bg-white text-foreground hover:bg-white/90"><Link to="/donate">Support Us</Link></Button>
          </div>
        </section>

        {/* All Articles */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">All Articles</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="rounded-xl animate-pulse"><CardContent className="p-5 h-20" /></Card>)}</div>
          ) : (
            <div className="space-y-3">
              {latest.map((a, i) => (
                <Link key={a.id} to={`/blog/${a.slug}`}>
                  <Card className="border rounded-xl hover:shadow-sm hover:border-secondary/30 transition-all mb-3" data-testid={`article-${i}`}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] rounded-full capitalize">{a.category}</Badge>
                          {a.read_time && <span className="text-[10px] text-muted-foreground">{a.read_time}</span>}
                        </div>
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">{a.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.excerpt}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}
