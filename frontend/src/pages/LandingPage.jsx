import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Search, Briefcase, BookOpen, Heart, ArrowRight, CheckCircle, Users, Star, Play } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PageSEO, OrganizationSchema } from '@/components/SEO';
import { LeadCaptureButton } from '@/components/LeadCaptureButton';
import { trackEvent } from '@/utils/analytics';

const fadeIn = { initial: { opacity: 0, y: 25 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

export default function LandingPage() {
  return (
    <div className="min-h-screen" data-testid="landing-page">
      <PageSEO path="/" />
      <OrganizationSchema />
      <Navigation />

      {/* ═══ SECTION 1: HERO ═══ */}
      <section className="relative pt-16 pb-20 overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-secondary/8" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-foreground leading-[1.1] mb-6">
                Find Out What You<br />Actually Qualify For<br /><span className="text-gradient">as a Veteran</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-6 max-w-lg">
                Clear answers, real opportunities, and a path forward — no matter your situation.
              </p>
              <ul className="space-y-2.5 mb-8">
                {[
                  'See what you qualify for right now',
                  'Find jobs and resources that actually fit',
                  'Get help without confusion or dead ends',
                ].map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button asChild size="lg" className="rounded-full text-base px-8 bg-secondary hover:bg-secondary/90 shadow-lg h-13 font-bold" data-testid="hero-cta-primary" onClick={() => trackEvent('hero_cta_click', { cta: 'start_passage' })}>
                  <Link to="/signup">Start Your Passage Now <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full text-base px-8 border-2 h-13" data-testid="hero-cta-decoder" onClick={() => trackEvent('hero_cta_click', { cta: 'decoder' })}>
                  <Link to="/dd214">Use DD-214 Decoder</Link>
                </Button>
              </div>
              {/* Trust strip */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-secondary" /> Built by a Marine Corps Veteran</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-600" /> Designed for all discharge types</span>
                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> No cost to use</span>
              </div>
            </motion.div>

            {/* Right — Video-ready placeholder */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }} className="hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden aspect-video bg-gradient-to-br from-secondary/10 to-accent/10 border-2 border-border shadow-xl flex items-center justify-center" data-testid="hero-media">
                <img src="/logo.png" alt="Veteran Passage" className="w-32 h-32 object-contain opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center cursor-pointer hover:bg-secondary/30 transition-all">
                    <Play className="w-7 h-7 text-secondary ml-1" />
                  </div>
                </div>
                <p className="absolute bottom-4 text-xs text-muted-foreground">Video coming soon</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: PROBLEM ═══ */}
      <section className="py-16 bg-muted/30" data-testid="problem-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <motion.div {...fadeIn} className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5">Most Veterans Don't Get Clear Answers After Service</h2>
            <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
              There's no roadmap after discharge. The systems are confusing. Benefits feel impossible to navigate. And most resources assume you have an honorable discharge.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {[
                '"I don\'t know what I qualify for"',
                '"I don\'t know where to start"',
                '"I feel like I\'m missing opportunities"',
              ].map((q, i) => (
                <div key={i} className="p-4 border rounded-2xl bg-background text-center">
                  <p className="text-sm text-foreground italic">{q}</p>
                </div>
              ))}
            </div>
            <Button asChild size="lg" className="rounded-full bg-secondary hover:bg-secondary/90 px-8 font-bold" onClick={() => trackEvent('section_cta_click', { section: 'problem' })}>
              <Link to="/signup">Get Clear Answers Now <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 3: FOUNDER STORY ═══ */}
      <section className="py-16" data-testid="founder-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <motion.div {...fadeIn} className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary mb-4 block">Built by Someone Who Lived It</span>
            <div className="space-y-4 text-base text-muted-foreground leading-relaxed text-left">
              <p>
                I served in the Marine Corps. I deployed to Fallujah. When I came home, I thought the hard part was over.
              </p>
              <p>
                It wasn't. I had an Other Than Honorable discharge, and suddenly every door seemed closed. I didn't know what I qualified for. I didn't know where to start. I felt invisible.
              </p>
              <p>
                It took me years to figure out what was available — programs that existed all along, opportunities I never knew about, legal rights no one told me I had.
              </p>
              <p className="text-foreground font-medium">
                I built Veteran Passage so no veteran has to go through that alone. This platform gives you the clarity, direction, and support that I wish I'd had from day one.
              </p>
              <p className="text-sm text-muted-foreground italic">
                — Shawn, Founder of Veteran Passage & Marine Corps Veteran
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full bg-secondary hover:bg-secondary/90 px-8 font-bold mt-8" onClick={() => trackEvent('section_cta_click', { section: 'founder' })}>
              <Link to="/signup">Start Your Passage Now <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 4: SOLUTION ═══ */}
      <section className="py-16 bg-gradient-to-br from-secondary/3 to-accent/3" data-testid="solution-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div {...fadeIn} className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">A Clear Path Forward — No Matter Where You're Starting</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Search, title: 'See What You Qualify For', desc: 'Understand your real options instantly based on your discharge and situation.' },
              { icon: Briefcase, title: 'Find Real Opportunities', desc: 'Jobs, resources, and paths that actually fit you — not generic listings.' },
              { icon: ArrowRight, title: 'Take Action Immediately', desc: 'No confusion. No wasted time. One clear next step.' },
            ].map((item, i) => (
              <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                <Card className="border rounded-2xl h-full text-center hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild size="lg" className="rounded-full bg-secondary hover:bg-secondary/90 px-8 font-bold" onClick={() => trackEvent('section_cta_click', { section: 'solution' })}>
              <Link to="/signup">Find Your Next Step <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5: CORE TOOLS ═══ */}
      <section className="py-16" data-testid="tools-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div {...fadeIn} className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Tools Built to Give You Real Answers</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: 'DD-214 Decoder', desc: 'Understand your discharge and what it means for your future.', cta: 'Use Decoder', href: '/dd214' },
              { icon: Briefcase, title: 'Job Matching', desc: 'Find jobs you can realistically get — personalized to you.', cta: 'See Jobs', href: '/jobs' },
              { icon: BookOpen, title: 'Resource Navigator', desc: 'Discover benefits and support you actually qualify for.', cta: 'Explore Resources', href: '/resources' },
            ].map((tool, i) => (
              <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                <Link to={tool.href} onClick={() => trackEvent('tool_card_click', { tool: tool.title })}>
                  <Card className="border rounded-2xl h-full hover:shadow-lg hover:border-secondary/30 transition-all cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/15 transition-colors">
                        <tool.icon className="w-5 h-5 text-secondary" />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-1.5">{tool.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{tool.desc}</p>
                      <span className="text-sm text-secondary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">{tool.cta} <ArrowRight className="w-3.5 h-3.5" /></span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6: CONVERSION ═══ */}
      <section className="py-14 bg-muted/30" data-testid="conversion-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl text-center">
          <motion.div {...fadeIn}>
            <Heart className="w-10 h-10 text-secondary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-3">You Don't Have to Figure This Out Alone</h2>
            <p className="text-base text-muted-foreground mb-6">
              Whether you need legal help, job support, or just someone to point you in the right direction — we're here.
            </p>
            <LeadCaptureButton category="general" resourceName="Landing Page Help Request" label="Get Help Now" variant="default" className="bg-secondary hover:bg-secondary/90 text-white rounded-full px-8 h-12 text-base font-bold" />
            <p className="text-xs text-muted-foreground mt-3">We'll help you understand your next step</p>
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 7: SOCIAL PROOF ═══ */}
      <section className="py-16" data-testid="proof-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <motion.div {...fadeIn} className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">Veterans Are Finding Their Path Forward</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'James R.', branch: 'Army Veteran', quote: 'I had no idea I could upgrade my discharge until I found this. The decoder showed me exactly what to do.' },
              { name: 'Sarah M.', branch: 'Marine Corps Veteran', quote: 'Within a week of using the job board, I had two interviews. The second-chance filter changed everything.' },
              { name: 'Michael C.', branch: 'Navy Veteran', quote: 'I was drowning in confusion. Veteran Passage gave me a clear next step and connected me with legal help.' },
            ].map((t, i) => (
              <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }}>
                <Card className="border rounded-2xl h-full">
                  <CardContent className="p-5">
                    <div className="text-2xl text-secondary mb-2">&ldquo;</div>
                    <p className="text-sm text-foreground leading-relaxed italic mb-4">{t.quote}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold">{t.name[0]}</div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.branch}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 8: FINAL CTA ═══ */}
      <section className="py-16" data-testid="final-cta-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <motion.div {...fadeIn}>
            <div className="text-center rounded-3xl gradient-hero p-10 sm:p-14 text-white shadow-xl">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start Your Next Chapter With Clarity</h2>
              <p className="text-base text-white/85 mb-8 max-w-xl mx-auto">Takes less than 60 seconds to get started.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="rounded-full bg-white text-foreground hover:bg-white/90 font-bold px-8 shadow-lg" onClick={() => trackEvent('final_cta_click', { cta: 'start_passage' })}>
                  <Link to="/signup">Start Your Passage Now</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full border-white/40 text-white hover:bg-white/10 px-8" onClick={() => trackEvent('final_cta_click', { cta: 'see_qualify' })}>
                  <Link to="/dd214">See What You Qualify For</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
