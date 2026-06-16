import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, Bookmark, CheckCircle, CircleDot, ExternalLink, Loader2, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/utils/analytics';

const API = process.env.REACT_APP_BACKEND_URL;
const ALLOWED_ROLES = new Set(['veteran', 'admin', 'superadmin']);

const statusLabels = {
  saved: 'Saved',
  applied: 'Started',
  completed: 'Completed',
};

function categoryLabel(category) {
  const labels = {
    benefits: 'Benefits',
    careers: 'Jobs',
    business: 'Business',
    housing: 'Housing',
    education: 'Education',
    wealth: 'Money',
    second_chance: 'Second Chance',
  };
  return labels[category] || (category || '').replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusVariant(status) {
  if (status === 'completed') return 'bg-green-100 text-green-700 border-0';
  if (status === 'applied') return 'bg-blue-100 text-blue-700 border-0';
  if (status === 'saved') return 'bg-secondary/10 text-secondary border-0';
  return 'bg-muted text-muted-foreground border-0';
}

export default function VeteranOpportunityWidget({ maxItems = 6, simpleMode = false }) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [preferredCategory, setPreferredCategory] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const canUseOpportunities = user && ALLOWED_ROLES.has(user.role);
  const visibleOpportunities = useMemo(() => opportunities.slice(0, maxItems), [opportunities, maxItems]);

  const loadOpportunities = useCallback(async () => {
    if (!canUseOpportunities) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`${API}/api/opportunities/recommended`, { withCredentials: true });
      setOpportunities(data.opportunities || []);
      setPreferredCategory(data.preferred_category || '');
    } catch {
      setError('Recommended opportunities are unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [canUseOpportunities]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  if (!canUseOpportunities) return null;

  const updateLocalStatus = (opportunityId, status) => {
    setOpportunities((current) => current.map((item) => (
      item.id === opportunityId ? { ...item, saved_status: status } : item
    )));
    setSelectedOpportunity((current) => (
      current?.id === opportunityId ? { ...current, saved_status: status } : current
    ));
  };

  const saveOpportunity = async (opportunity) => {
    setUpdatingId(opportunity.id);
    setError('');
    try {
      await axios.post(`${API}/api/opportunities/save`, { opportunity_id: opportunity.id }, { withCredentials: true });
      updateLocalStatus(opportunity.id, 'saved');
      trackEvent('opportunity_saved', { source: 'dashboard_widget', category: opportunity.category });
    } catch {
      setError('Could not save this opportunity. Please try again.');
    } finally {
      setUpdatingId('');
    }
  };

  const setOpportunityStatus = async (opportunity, status) => {
    setUpdatingId(opportunity.id);
    setError('');
    try {
      await axios.post(
        `${API}/api/opportunities/status`,
        { opportunity_id: opportunity.id, status },
        { withCredentials: true },
      );
      updateLocalStatus(opportunity.id, status);
      trackEvent(`opportunity_${status}`, { source: 'dashboard_widget', category: opportunity.category });
    } catch {
      setError('Could not update this opportunity. Please try again.');
    } finally {
      setUpdatingId('');
    }
  };

  const openDetails = (opportunity) => {
    setSelectedOpportunity(opportunity);
    trackEvent('opportunity_viewed', { source: 'dashboard_widget', category: opportunity.category });
  };

  const dismissOpportunity = async (opportunity) => {
    setUpdatingId(opportunity.id);
    setError('');
    try {
      await axios.post(
        `${API}/api/opportunities/status`,
        { opportunity_id: opportunity.id, status: 'dismissed' },
        { withCredentials: true },
      );
      setOpportunities((current) => current.filter((item) => item.id !== opportunity.id));
    } catch {
      setError('Could not hide this opportunity. Please try again.');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <>
      <Card className="border rounded-2xl" data-testid="veteran-opportunity-widget">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{simpleMode ? 'Recommended Help' : 'Recommended Opportunities'}</h2>
                <p className="text-sm text-muted-foreground">
                  {simpleMode
                    ? 'A few helpful places to start.'
                    : (preferredCategory ? `Matched to your ${categoryLabel(preferredCategory)} roadmap focus.` : 'Matched to your saved roadmap when available.')}
                </p>
              </div>
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Loading opportunities" />}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {!loading && !error && visibleOpportunities.length === 0 && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">No active opportunities found.</p>
              <p className="mt-1 text-sm text-muted-foreground">Build or update your roadmap to improve recommendations.</p>
            </div>
          )}

          <div className="space-y-3">
            {visibleOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="rounded-xl border bg-background p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-secondary/10 text-secondary border-0">
                        {categoryLabel(opportunity.category)}
                      </Badge>
                      {opportunity.saved_status && (
                        <Badge className={`rounded-full ${statusVariant(opportunity.saved_status)}`}>
                          {statusLabels[opportunity.saved_status]}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-bold text-foreground">{opportunity.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{opportunity.organization}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {!simpleMode && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => openDetails(opportunity)}
                        aria-label={`View details for ${opportunity.title}`}
                      >
                        Details
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => saveOpportunity(opportunity)}
                      disabled={updatingId === opportunity.id || opportunity.saved_status === 'saved'}
                      aria-label={`Save ${opportunity.title}`}
                    >
                      <Bookmark className="w-3.5 h-3.5 mr-1" />
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setOpportunityStatus(opportunity, 'applied')}
                      disabled={updatingId === opportunity.id || opportunity.saved_status === 'applied'}
                      aria-label={`Mark applied for ${opportunity.title}`}
                    >
                      <CircleDot className="w-3.5 h-3.5 mr-1" />
                      Started
                    </Button>
                    {simpleMode ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-full"
                        onClick={() => dismissOpportunity(opportunity)}
                        disabled={updatingId === opportunity.id}
                        aria-label={`Hide ${opportunity.title}`}
                      >
                        Not for me
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full bg-secondary hover:bg-secondary/90"
                        onClick={() => setOpportunityStatus(opportunity, 'completed')}
                        disabled={updatingId === opportunity.id || opportunity.saved_status === 'completed'}
                        aria-label={`Mark completed for ${opportunity.title}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Completed
                      </Button>
                    )}
                  </div>
                  {simpleMode && (
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-xs text-secondary"
                      onClick={() => openDetails(opportunity)}
                      aria-label={`View details for ${opportunity.title}`}
                    >
                      See details
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedOpportunity)} onOpenChange={(open) => { if (!open) setSelectedOpportunity(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          {selectedOpportunity && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-2 text-lg">
                  <Target className="mt-0.5 w-5 h-5 text-secondary shrink-0" />
                  {selectedOpportunity.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-secondary/10 text-secondary border-0">
                    {categoryLabel(selectedOpportunity.category)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {selectedOpportunity.opportunity_type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedOpportunity.description}</p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eligibility tags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedOpportunity.eligibility_tags || []).map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source organization</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{selectedOpportunity.organization}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="rounded-full bg-secondary hover:bg-secondary/90">
                    <a
                      href={selectedOpportunity.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('opportunity_viewed', { source: 'external_link', category: selectedOpportunity.category })}
                    >
                      Open resource <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => saveOpportunity(selectedOpportunity)}>
                    Save <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
