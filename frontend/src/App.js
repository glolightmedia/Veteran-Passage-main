import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/utils/analytics';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import NavigatorPage from '@/pages/NavigatorPage';
import ResourcesPage from '@/pages/ResourcesPage';
import ProfilePage from '@/pages/ProfilePage';
import PathwaysPage from '@/pages/PathwaysPage';
import JobsPage from '@/pages/JobsPage';
import MentorshipPage from '@/pages/MentorshipPage';
import EntrepreneurPage from '@/pages/EntrepreneurPage';
import ChatbotPage from '@/pages/ChatbotPage';
import ForumPage from '@/pages/ForumPage';
import DonatePage from '@/pages/DonatePage';
import DonateThankYou from '@/pages/DonateThankYou';
import IntakePage from '@/pages/IntakePage';
import DD214DecoderPage from '@/pages/DD214DecoderPage';
import BarterPage from '@/pages/BarterPage';
import PartnersPage from '@/pages/PartnersPage';
import BlogHomePage from '@/pages/BlogHomePage';
import BlogArticlePage from '@/pages/BlogArticlePage';
// Admin
import SuperAdminPage from '@/pages/admin/SuperAdminPage';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminResources from '@/pages/admin/AdminResources';
import AdminReports from '@/pages/admin/AdminReports';
// Provider
import ProviderDashboard from '@/pages/provider/ProviderDashboard';
import ProviderListings from '@/pages/provider/ProviderListings';
import ProviderPromotions from '@/pages/provider/ProviderPromotions';
// Developer
import DeveloperConsole from '@/pages/developer/DeveloperConsole';
import DeveloperDocs from '@/pages/developer/DeveloperDocs';
import { Toaster } from '@/components/ui/sonner';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="loading-spinner">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="Veteran Passage" className="w-16 h-16 animate-pulse" />
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-secondary border-t-transparent" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user === false) return <Navigate to="/login" />;
  return children;
}

function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user === false) return <Navigate to="/login" />;
  // superadmin accesses everything
  if (user.role === 'superadmin') return children;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && user !== false) return <Navigate to="/dashboard" />;
  return children;
}

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => { trackEvent('page_view', { path: location.pathname }); }, [location.pathname]);
  return null;
}

function AppRoutes() {
  const { themeMode } = useAuth();

  return (
    <div className={`App ${themeMode === 'kindling' ? 'theme-kindling' : ''}`}>
      <PageViewTracker />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/donate" element={<DonatePage />} />
        <Route path="/donate/thank-you" element={<DonateThankYou />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/blog" element={<BlogHomePage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

        {/* Customer (all authenticated users) */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/intake" element={<ProtectedRoute><IntakePage /></ProtectedRoute>} />
        <Route path="/navigator" element={<ProtectedRoute><NavigatorPage /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/pathways" element={<ProtectedRoute><PathwaysPage /></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
        <Route path="/mentorship" element={<ProtectedRoute><MentorshipPage /></ProtectedRoute>} />
        <Route path="/entrepreneur" element={<ProtectedRoute><EntrepreneurPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
        <Route path="/forum" element={<ProtectedRoute><ForumPage /></ProtectedRoute>} />
        <Route path="/dd214" element={<ProtectedRoute><DD214DecoderPage /></ProtectedRoute>} />
        <Route path="/barter" element={<ProtectedRoute><BarterPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<RoleRoute roles={['admin']}><SuperAdminPage /></RoleRoute>} />
        <Route path="/admin/users" element={<RoleRoute roles={['admin']}><AdminUsers /></RoleRoute>} />
        <Route path="/admin/resources" element={<RoleRoute roles={['admin']}><AdminResources /></RoleRoute>} />
        <Route path="/admin/reports" element={<RoleRoute roles={['admin', 'moderator']}><AdminReports /></RoleRoute>} />

        {/* Provider */}
        <Route path="/provider" element={<RoleRoute roles={['partner', 'admin']}><ProviderDashboard /></RoleRoute>} />
        <Route path="/provider/listings" element={<RoleRoute roles={['partner', 'admin']}><ProviderListings /></RoleRoute>} />
        <Route path="/provider/promotions" element={<RoleRoute roles={['partner', 'admin']}><ProviderPromotions /></RoleRoute>} />

        {/* Developer */}
        <Route path="/developer" element={<RoleRoute roles={['developer', 'admin']}><DeveloperConsole /></RoleRoute>} />
        <Route path="/developer/docs" element={<RoleRoute roles={['developer', 'admin']}><DeveloperDocs /></RoleRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
