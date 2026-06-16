import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, CheckCircle, Circle, Map, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/utils/analytics';

const API = process.env.REACT_APP_BACKEND_URL;
const ALLOWED_ROLES = new Set(['veteran', 'admin', 'superadmin']);

function getCompletedSet(roadmap) {
  return new Set(roadmap?.completed_steps || []);
}

function getNextStep(roadmap) {
  const completed = getCompletedSet(roadmap);
  return (roadmap?.roadmap_steps || []).find((step) => !completed.has(step.id));
}

export default function VeteranRoadmapWidget({ simpleMode = false, maxSteps = 6 }) {
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStep, setUpdatingStep] = useState('');

  const canUseRoadmap = user && ALLOWED_ROLES.has(user.role);
  const completed = useMemo(() => getCompletedSet(roadmap), [roadmap]);
  const nextStep = useMemo(() => getNextStep(roadmap), [roadmap]);
  const steps = roadmap?.roadmap_steps || [];
  const completedCount = completed.size;

  useEffect(() => {
    if (!canUseRoadmap) {
      setLoading(false);
      return;
    }

    let active = true;
    const loadRoadmap = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get(`${API}/api/roadmap`, { withCredentials: true });
        if (active) setRoadmap(data.roadmap || null);
      } catch {
        if (active) setError('Roadmap is unavailable right now.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRoadmap();
    return () => { active = false; };
  }, [canUseRoadmap]);

  if (!canUseRoadmap) return null;

  const toggleStep = async (step) => {
    const nextCompleted = !completed.has(step.id);
    setUpdatingStep(step.id);
    setError('');
    try {
      const { data } = await axios.post(
        `${API}/api/roadmap/complete-step`,
        { step_id: step.id, completed: nextCompleted },
        { withCredentials: true },
      );
      setRoadmap(data.roadmap);
      if (nextCompleted) {
        trackEvent('roadmap_step_completed', { source: 'dashboard_widget' });
        if (data.roadmap?.completion_percentage === 100) {
          trackEvent('roadmap_completed', { source: 'dashboard_widget' });
        }
      }
    } catch {
      setError('Could not update this step. Please try again.');
    } finally {
      setUpdatingStep('');
    }
  };

  return (
    <Card className="border rounded-2xl" data-testid="veteran-roadmap-widget">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <Map className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{simpleMode ? 'Your Roadmap' : 'Veteran Success Roadmap'}</h2>
              <p className="text-sm text-muted-foreground">{simpleMode ? 'One step at a time.' : 'Track your free educational next steps.'}</p>
            </div>
          </div>
          {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" aria-label="Loading roadmap" />}
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && !roadmap && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">No saved roadmap yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open the Veteran Success Assistant and choose Build My Veteran Roadmap to save one to your account.
            </p>
          </div>
        )}

        {roadmap && (
          <>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-foreground">Progress</span>
                <span className="text-muted-foreground">{roadmap.completion_percentage || 0}% complete</span>
              </div>
              <Progress value={roadmap.completion_percentage || 0} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {completedCount} of {steps.length} tasks complete
              </p>
            </div>

            {nextStep && (
              <div className="rounded-xl border bg-secondary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{simpleMode ? 'Start here' : 'Next recommended task'}</p>
                <p className="mt-1 text-sm font-bold text-foreground">{nextStep.title}</p>
                {!simpleMode && <p className="mt-1 text-xs text-muted-foreground">{nextStep.description}</p>}
                <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
                  <Link to={nextStep.action_url} onClick={() => trackEvent('dashboard_next_action_clicked', { type: 'roadmap', source: 'roadmap_widget' })}>
                    {simpleMode ? 'Continue' : (nextStep.action_label || 'Explore Free Resources')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {steps.slice(0, maxSteps).map((step) => {
                const isComplete = completed.has(step.id);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => toggleStep(step)}
                    disabled={Boolean(updatingStep)}
                    className="w-full rounded-xl border bg-background p-3 text-left hover:border-secondary/40 hover:bg-secondary/5 disabled:opacity-60"
                    aria-label={`${isComplete ? 'Mark incomplete' : 'Mark complete'}: ${step.title}`}
                  >
                    <span className="flex items-start gap-3">
                      {isComplete ? (
                        <CheckCircle className="mt-0.5 w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <Circle className="mt-0.5 w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span>
                        <span className="block text-sm font-semibold text-foreground">{step.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{step.category?.replace('_', ' ')}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
