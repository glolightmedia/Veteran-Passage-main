import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Compass, BookOpen, User, LogOut, Menu, X, Map, Briefcase, Users, Rocket, Bot, MessageCircle, Heart, FileText, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'DD-214 Decoder', href: '/dd214', icon: FileText },
    { name: 'Pathways', href: '/pathways', icon: Map },
    { name: 'Resources', href: '/resources', icon: BookOpen },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'AI Assistant', href: '/chat', icon: Bot },
    { name: 'Business', href: '/entrepreneur', icon: Rocket },
    { name: 'Donate', href: '/donate', icon: Heart },
    { name: 'Profile', href: '/profile', icon: User }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/3 via-background to-accent/3" data-testid="dashboard-layout">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="sidebar-toggle"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="dashboard-logo">
                <img src="/logo.png" alt="Veteran Passage" className="w-8 h-8 object-contain" />
                <div className="hidden sm:flex items-baseline gap-1">
                  <span className="text-base font-bold" style={{ color: '#2C3E50' }}>Veteran</span>
                  <span className="text-base font-bold" style={{ color: '#7B2D8E' }}>Passage</span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" size="icon" onClick={logout} className="rounded-full" data-testid="logout-btn">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="hidden lg:block w-60 min-h-[calc(100vh-4rem)] border-r border-border bg-background/50">
          <nav className="p-4 space-y-1" data-testid="desktop-sidebar">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
                    isActive(item.href)
                      ? 'bg-secondary text-secondary-foreground shadow-md'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'tween' }}
                className="fixed left-0 top-16 bottom-0 w-60 bg-background border-r border-border z-50 lg:hidden"
              >
                <nav className="p-4 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
                          isActive(item.href)
                            ? 'bg-secondary text-secondary-foreground shadow-md'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
