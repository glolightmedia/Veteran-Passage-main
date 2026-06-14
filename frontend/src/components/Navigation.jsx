import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border" data-testid="main-navigation">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group" data-testid="nav-logo">
            <img src="/logo.png" alt="Veteran Passage" className="w-10 h-10 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold" style={{ color: '#2C3E50' }}>Veteran</span>
              <span className="text-xl font-bold" style={{ color: '#7B2D8E' }}>Passage</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="/#founder-section" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">Our Story</a>
            <a href="/#tools-section" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">Tools</a>
            <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">Blog</Link>
            <Link to="/partners" className="text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">Partners</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button asChild variant="ghost" className="rounded-full" data-testid="nav-donate-btn">
              <Link to="/donate" className="text-secondary font-semibold">Donate</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full" data-testid="nav-signin-btn">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="rounded-full bg-secondary hover:bg-secondary/90" data-testid="nav-getstarted-btn">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              <a href="/#founder-section" className="block py-2 text-foreground hover:text-secondary transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>Founder's Story</a>
              <a href="/#tools-section" className="block py-2 text-foreground hover:text-secondary transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>Tools</a>
              <Link to="/blog" className="block py-2 text-foreground hover:text-secondary transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
              <Link to="/partners" className="block py-2 text-foreground hover:text-secondary transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>Partners</Link>
              <div className="pt-4 space-y-3">
                <Button asChild variant="outline" className="w-full rounded-full text-secondary border-secondary/30">
                  <Link to="/donate" onClick={() => setMobileMenuOpen(false)}>Donate</Link>
                </Button>
                <Button asChild variant="outline" className="w-full rounded-full">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                </Button>
                <Button asChild className="w-full rounded-full bg-secondary hover:bg-secondary/90">
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
