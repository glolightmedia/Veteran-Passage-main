import { Link } from 'react-router-dom';
import { Twitter, Facebook, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground/5 border-t border-border" data-testid="footer">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Veteran Passage" className="w-9 h-9 object-contain" />
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold" style={{ color: '#2C3E50' }}>Veteran</span>
                <span className="text-lg font-bold" style={{ color: '#7B2D8E' }}>Passage</span>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Empowering veterans of all discharges to navigate benefits, careers, and civilian life with dignity.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-muted-foreground hover:text-secondary transition-colors text-sm">Features</Link></li>
              <li><Link to="/" className="text-muted-foreground hover:text-secondary transition-colors text-sm">How It Works</Link></li>
              <li><Link to="/" className="text-muted-foreground hover:text-secondary transition-colors text-sm">Stories</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/donate" className="text-muted-foreground hover:text-secondary transition-colors text-sm">Donate</Link></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors text-sm">Help Center</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors text-sm">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4 text-secondary" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-colors" aria-label="Facebook">
                <Facebook className="w-4 h-4 text-secondary" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4 text-secondary" />
              </a>
              <a href="mailto:support@veteranpassage.org" className="w-10 h-10 rounded-lg bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center transition-colors" aria-label="Email">
                <Mail className="w-4 h-4 text-secondary" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Veteran Passage. All rights reserved. Built with care for those who served.
          </p>
        </div>
      </div>
    </footer>
  );
}
