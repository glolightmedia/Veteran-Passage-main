import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { dischargeTypes, branches } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    branch: '',
    discharge: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(formData);
    if (result.success) {
      toast.success('Welcome to Veteran Passage!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const selectedDischarge = dischargeTypes.find(d => d.value === formData.discharge);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/5 via-background to-accent/5 p-4" data-testid="signup-page">
      <PageSEO path="/signup" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors" data-testid="back-home-link">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>

        <Card className="border shadow-xl rounded-3xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <img src="/logo.png" alt="Veteran Passage" className="w-16 h-16 object-contain" />
            </div>
            <CardTitle className="text-2xl text-center">Join Veteran Passage</CardTitle>
            <CardDescription className="text-center text-sm">
              Start your journey to accessing the benefits and support you deserve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="signup-form">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="rounded-xl h-11"
                    data-testid="signup-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="rounded-xl h-11"
                    data-testid="signup-email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password (min 6 chars)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="rounded-xl h-11"
                  data-testid="signup-password-input"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch of Service</Label>
                  <Select value={formData.branch} onValueChange={(value) => setFormData({ ...formData, branch: value })}>
                    <SelectTrigger className="rounded-xl h-11" data-testid="signup-branch-select">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discharge">Discharge Type</Label>
                  <Select value={formData.discharge} onValueChange={(value) => setFormData({ ...formData, discharge: value })}>
                    <SelectTrigger className="rounded-xl h-11" data-testid="signup-discharge-select">
                      <SelectValue placeholder="Select discharge type" />
                    </SelectTrigger>
                    <SelectContent>
                      {dischargeTypes.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedDischarge && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`p-3 rounded-xl text-sm ${
                    selectedDischarge.tier === 'green' ? 'bg-green-50 text-green-700 border border-green-200' :
                    selectedDischarge.tier === 'yellow' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                  data-testid="discharge-tier-info"
                >
                  {selectedDischarge.description}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Location (City, State)</Label>
                <Input
                  id="location"
                  placeholder="San Diego, CA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="rounded-xl h-11"
                  data-testid="signup-location-input"
                />
              </div>

              <Button type="submit" className="w-full rounded-xl h-11 bg-secondary hover:bg-secondary/90" disabled={loading} data-testid="signup-submit-btn">
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-secondary font-semibold hover:underline" data-testid="login-link">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
