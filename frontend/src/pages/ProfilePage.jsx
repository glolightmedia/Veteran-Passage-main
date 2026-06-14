import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Save } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { dischargeTypes, branches, getDischargeTier, triageTiers } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    branch: user?.branch || '',
    discharge: user?.discharge || '',
    location: user?.location || ''
  });
  const [loading, setLoading] = useState(false);

  const selectedDischarge = dischargeTypes.find(d => d.value === formData.discharge);
  const tier = getDischargeTier(formData.discharge);
  const tierInfo = triageTiers[tier];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateProfile(formData);
    if (result.success) {
      toast.success('Profile updated successfully!');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto" data-testid="profile-page">
        <PageSEO path="/profile" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="profile-heading">My Profile</h1>
            <p className="text-base text-muted-foreground">Update your information to get better personalized recommendations.</p>
          </div>

          <Card className="border rounded-3xl shadow-sm">
            <CardHeader className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                <User className="w-7 h-7 text-secondary" />
              </div>
              <CardTitle className="text-xl text-center">Profile Information</CardTitle>
              <CardDescription className="text-center text-sm">
                Keep your details up to date for the best experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5" data-testid="profile-form">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="rounded-xl h-11"
                    data-testid="profile-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="rounded-xl h-11 bg-muted/50"
                    data-testid="profile-email-display"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch of Service</Label>
                    <Select value={formData.branch} onValueChange={(value) => setFormData({ ...formData, branch: value })}>
                      <SelectTrigger className="rounded-xl h-11" data-testid="profile-branch-select">
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
                      <SelectTrigger className="rounded-xl h-11" data-testid="profile-discharge-select">
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

                {selectedDischarge && tierInfo && (
                  <div className={`p-3 rounded-xl text-sm ${tierInfo.bgColor} ${tierInfo.color} border ${tierInfo.borderColor}`} data-testid="profile-tier-info">
                    <div className="flex items-center gap-2">
                      <Badge className={`${tierInfo.bgColor} ${tierInfo.color} border-0 rounded-full px-2 py-0.5 text-xs`}>
                        {tierInfo.label}
                      </Badge>
                      <span className="text-xs">{selectedDischarge.description}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="location">Location (City, State)</Label>
                  <Input
                    id="location"
                    placeholder="San Diego, CA"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="rounded-xl h-11"
                    data-testid="profile-location-input"
                  />
                </div>

                <Button type="submit" className="w-full rounded-xl h-11 bg-secondary hover:bg-secondary/90" disabled={loading} data-testid="profile-save-btn">
                  <Save className="mr-2 w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6 border rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Account Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
                  <p className="text-sm font-semibold text-foreground" data-testid="member-since">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Saved Resources</p>
                  <p className="text-sm font-semibold text-foreground" data-testid="saved-count">{user?.saved_resources?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
