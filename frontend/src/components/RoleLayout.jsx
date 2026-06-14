import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoleLayout({ navItems, roleLabel, roleColor, children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background" data-testid="role-layout">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="role-sidebar-toggle"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Veteran Passage" className="w-7 h-7 object-contain" />
              <span className="text-sm font-bold" style={{ color: '#2C3E50' }}>Veteran</span>
              <span className="text-sm font-bold" style={{ color: '#7B2D8E' }}>Passage</span>
            </Link>
            <span className={`hidden sm:inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor}`} data-testid="role-badge">
              {roleLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-foreground">{user?.full_name}</p>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="icon" onClick={logout} className="rounded-full h-8 w-8" data-testid="role-logout-btn">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="hidden lg:block w-56 min-h-[calc(100vh-3.5rem)] border-r border-border bg-muted/20">
          <nav className="p-3 space-y-0.5" data-testid="role-sidebar">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  data-testid={`role-nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm ${
                    isActive(item.href)
                      ? 'bg-secondary text-secondary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
                transition={{ type: 'tween' }}
                className="fixed left-0 top-14 bottom-0 w-56 bg-background border-r border-border z-50 lg:hidden"
              >
                <nav className="p-3 space-y-0.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm ${
                          isActive(item.href)
                            ? 'bg-secondary text-secondary-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
