import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, ExternalLink, CheckCircle, SlidersHorizontal, Shield, AlertTriangle, Lock } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { benefitsData } from '@/data/benefitsData';
import { useAuth } from '@/context/AuthContext';
import { getDischargeTier, triageTiers, dischargeTypes } from '@/data/dischargeTypes';
import { PageSEO } from '@/components/SEO';
import { LeadCaptureButton } from '@/components/LeadCaptureButton';
import { LegalFastLane } from '@/components/LegalFastLane';

const TIER_ICONS = { green: Shield, yellow: AlertTriangle, blue: Lock };

export default function ResourcesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const userTier = getDischargeTier(user?.discharge);
  const tierInfo = triageTiers[userTier];
  const TierIcon = TIER_ICONS[userTier] || Shield;

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'legal', label: 'Legal Assistance' },
    { value: 'employment', label: 'Employment' },
    { value: 'housing', label: 'Housing' },
    { value: 'mental-health', label: 'Mental Health' },
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Healthcare' }
  ];

  // Filter resources based on triage tier + search + category
  const filteredResources = benefitsData
    .map(resource => {
      const tiers = resource.tiers || ['green', 'yellow', 'blue'];
      const isEligible = tiers.includes(userTier);
      return { ...resource, isEligible };
    })
    .filter(resource => {
      if (!showAll && !resource.isEligible) return false;
      const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           resource.organization.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || resource.categories.includes(categoryFilter);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Eligible first, then promoted, then alphabetical
      if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
      return 0;
    });

  const eligibleCount = filteredResources.filter(r => r.isEligible).length;
  const restrictedCount = filteredResources.filter(r => !r.isEligible).length;

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="resources-page">
        <PageSEO path="/resources" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="resources-heading">Resource Directory</h1>
          <p className="text-base text-muted-foreground">Resources filtered for your discharge type and eligibility.</p>
        </motion.div>

        {/* Triage Tier Banner */}
        {user?.discharge && tierInfo && (
          <Card className={`border-2 rounded-2xl ${tierInfo.borderColor}`} data-testid="triage-banner">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tierInfo.bgColor}`}>
                  <TierIcon className={`w-5 h-5 ${tierInfo.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge className={`${tierInfo.bgColor} ${tierInfo.color} border-0 rounded-full px-2.5 py-0.5 text-xs font-semibold`}>
                      {tierInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {dischargeTypes.find(d => d.value === user.discharge)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tierInfo.description}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-foreground">{eligibleCount} eligible</p>
                  {restrictedCount > 0 && showAll && <p className="text-xs text-muted-foreground">{restrictedCount} restricted</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <LegalFastLane />

        {/* Search, Filter, and Show All toggle */}
        <Card className="border rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl"
                  data-testid="resources-search-input"
                />
              </div>
              <div className="relative">
                <SlidersHorizontal className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 rounded-xl pl-10 w-full md:w-44" data-testid="resources-filter-select">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 px-2">
                <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} data-testid="show-all-toggle" />
                <Label htmlFor="show-all" className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">Show all tiers</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredResources.length}</span> resources
        </p>

        {/* Resources */}
        <div className="space-y-3">
          {filteredResources.map((resource, index) => {
            const tiers = resource.tiers || [];
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
              >
                <Card className={`border rounded-2xl transition-all ${resource.isEligible ? 'hover:shadow-md' : 'opacity-60 border-dashed'}`} data-testid={`resource-${resource.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CardTitle className="text-lg">{resource.name}</CardTitle>
                          {resource.verified && (
                            <Badge variant="secondary" className="rounded-full text-xs">
                              <CheckCircle className="mr-1 w-3 h-3" /> Verified
                            </Badge>
                          )}
                          {!resource.isEligible && (
                            <Badge variant="outline" className="rounded-full text-xs border-amber-300 text-amber-600" data-testid={`restricted-badge-${resource.id}`}>
                              <Lock className="mr-1 w-3 h-3" /> May require upgrade
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">{resource.organization}</CardDescription>
                      </div>
                      {/* Tier dots */}
                      <div className="flex gap-1 shrink-0" data-testid={`tier-dots-${resource.id}`}>
                        {['green', 'yellow', 'blue'].map(t => (
                          <div
                            key={t}
                            className={`w-2.5 h-2.5 rounded-full ${
                              tiers.includes(t)
                                ? t === 'green' ? 'bg-green-500' : t === 'yellow' ? 'bg-amber-500' : 'bg-blue-500'
                                : 'bg-gray-200'
                            }`}
                            title={`${t} tier: ${tiers.includes(t) ? 'eligible' : 'not eligible'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground mb-3">{resource.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {resource.categories.map((cat) => (
                        <Badge key={cat} variant="outline" className="rounded-full text-xs">{cat.replace('-', ' ')}</Badge>
                      ))}
                    </div>
                    {resource.eligibility && (
                      <div className="mb-3 p-2.5 bg-muted/50 rounded-xl">
                        <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Eligibility:</span> {resource.eligibility}</p>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button asChild size="sm" className="rounded-xl bg-secondary hover:bg-secondary/90">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          Visit Website <ExternalLink className="ml-1 w-3 h-3" />
                        </a>
                      </Button>
                      {resource.phone && (
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <a href={`tel:${resource.phone}`}>Call Now</a>
                        </Button>
                      )}
                      <LeadCaptureButton category={resource.categories?.[0] || 'general'} resourceName={resource.name} label="Connect With Provider" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredResources.length === 0 && (
          <Card className="border rounded-2xl">
            <CardContent className="p-10 text-center">
              <p className="text-base text-muted-foreground" data-testid="no-results-message">No resources found. Try adjusting your search or filters.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
