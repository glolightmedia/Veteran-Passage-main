import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function IntakePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.intake_completed) { navigate('/dashboard'); return; }
    axios.get(`${API}/api/intake/questions`, { withCredentials: true })
      .then(r => { setQuestions(r.data.questions); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, navigate]);

  const q = questions[step];
  const progress = questions.length ? ((step + 1) / questions.length) * 100 : 0;

  const selectAnswer = (value) => {
    setAnswers({ ...answers, [q.id]: value });
  };

  const next = () => {
    if (!answers[q.id] && !q.optional) { toast.error('Please select an answer'); return; }
    if (step < questions.length - 1) setStep(step + 1);
    else submit();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/intake/complete`, { answers }, { withCredentials: true });
      toast.success("You're all set! Let's find your path.");
      navigate('/dashboard');
    } catch { toast.error('Something went wrong'); }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-secondary border-t-transparent" /></div>;

  const getOptions = () => {
    if (!q) return [];
    return q.options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-accent/5 flex items-center justify-center p-4" data-testid="intake-page">
      <div className="w-full max-w-xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <img src="/logo.png" alt="Veteran Passage" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Let's find your path</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick questions to personalize your experience</p>
        </motion.div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground">Question {step + 1} of {questions.length}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" data-testid="intake-progress" />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          {q && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border shadow-lg rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-4" data-testid="intake-question">{q.question}</h2>
                  {q.optional && <p className="text-xs text-muted-foreground mb-3">Optional — skip if unsure</p>}

                  <div className="grid grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto" data-testid="intake-options">
                    {getOptions().map((opt) => {
                      const isSelected = answers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => selectAnswer(opt.value)}
                          className={`p-3 rounded-xl text-left text-sm font-medium border-2 transition-all ${
                            isSelected
                              ? 'bg-secondary text-white border-secondary shadow-md'
                              : 'bg-background text-foreground border-border hover:border-secondary/40'
                          }`}
                          data-testid={`option-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-5">
                    <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-xl" data-testid="intake-back">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    {q.optional && !answers[q.id] && (
                      <Button variant="ghost" size="sm" onClick={() => { setAnswers({...answers, [q.id]: 'unknown'}); next(); }} className="rounded-xl text-muted-foreground">
                        Skip
                      </Button>
                    )}
                    <Button size="sm" onClick={next} className="rounded-xl bg-secondary hover:bg-secondary/90" disabled={submitting} data-testid="intake-next">
                      {submitting ? 'Saving...' : step === questions.length - 1 ? 'Get My Path' : 'Next'}
                      {step === questions.length - 1 ? <CheckCircle className="w-4 h-4 ml-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-4">Takes about 30 seconds. Your data is private.</p>
      </div>
    </div>
  );
}
