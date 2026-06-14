import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, ArrowLeft, Bookmark, ExternalLink, Lock, Shield } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { benefitsData } from '@/data/benefitsData';
import { useAuth } from '@/context/AuthContext';
import { PageSEO } from '@/components/SEO';
import { getDischargeTier, triageTiers, dischargeTypes } from '@/data/dischargeTypes';

export default function NavigatorPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);

  const questions = [
    {
      id: 'state',
      question: 'What state do you currently reside in?',
      type: 'radio',
      options: [
        { value: 'CA', label: 'California' },
        { value: 'TX', label: 'Texas' },
        { value: 'FL', label: 'Florida' },
        { value: 'NY', label: 'New York' },
        { value: 'other', label: 'Other' }
      ]
    },
    {
      id: 'needs',
      question: 'What are your primary needs? (Select all that apply)',
      type: 'checkbox',
      options: [
        { value: 'legal', label: 'Legal assistance for discharge upgrade' },
        { value: 'employment', label: 'Employment and job training' },
        { value: 'housing', label: 'Housing assistance' },
        { value: 'mental-health', label: 'Mental health support' },
        { value: 'education', label: 'Education and GI Bill' },
        { value: 'healthcare', label: 'Healthcare services' }
      ]
    },
    {
      id: 'situation',
      question: 'Which best describes your current situation?',
      type: 'radio',
      options: [
        { value: 'immediate', label: 'Need immediate assistance (crisis)' },
        { value: 'short-term', label: 'Looking for short-term support' },
        { value: 'long-term', label: 'Planning long-term goals' },
        { value: 'exploring', label: 'Just exploring options' }
      ]
    }
  ];

  const totalSteps = questions.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const handleNext = () => {
    const currentQuestion = questions[step];
    if (!answers[currentQuestion.id] || (Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].length === 0)) {
      toast.error('Please select an answer before continuing');
      return;
    }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      calculateResults();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const calculateResults = () => {
    const needs = answers.needs || [];
    const userTier = getDischargeTier(user?.discharge);
    const matchedBenefits = benefitsData
      .filter(benefit => needs.some(need => benefit.categories.includes(need)))
      .map(benefit => ({
        ...benefit,
        isEligible: (benefit.tiers || ['green', 'yellow', 'blue']).includes(userTier)
      }))
      .sort((a, b) => {
        if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
        return 0;
      });
    setResults(matchedBenefits);
    const eligible = matchedBenefits.filter(b => b.isEligible).length;
    toast.success(`Found ${eligible} eligible resources (${matchedBenefits.length} total)`);
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
    setResults(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto" data-testid="navigator-page">
        <PageSEO path="/navigator" />
        {!results ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="navigator-heading">Benefits Navigator</h1>
              <p className="text-base text-muted-foreground">Answer a few questions to find personalized benefits and resources.</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Step {step + 1} of {totalSteps}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" data-testid="navigator-progress" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border rounded-3xl shadow-sm">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-xl">{questions[step].question}</CardTitle>
                    <CardDescription className="text-sm">
                      {questions[step].type === 'checkbox' ? 'Select all that apply' : 'Choose one option'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {questions[step].type === 'radio' ? (
                      <RadioGroup
                        value={answers[questions[step].id]}
                        onValueChange={(value) => setAnswers({ ...answers, [questions[step].id]: value })}
                      >
                        {questions[step].options.map((option) => (
                          <div key={option.value} className="flex items-center space-x-3 p-3.5 border rounded-xl hover:border-secondary/40 transition-colors cursor-pointer">
                            <RadioGroupItem value={option.value} id={option.value} />
                            <Label htmlFor={option.value} className="flex-1 cursor-pointer text-sm">{option.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        {questions[step].options.map((option) => {
                          const isChecked = answers[questions[step].id]?.includes(option.value) || false;
                          return (
                            <div key={option.value} className="flex items-center space-x-3 p-3.5 border rounded-xl hover:border-secondary/40 transition-colors cursor-pointer">
                              <Checkbox
                                id={option.value}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const current = answers[questions[step].id] || [];
                                  const updated = checked ? [...current, option.value] : current.filter(v => v !== option.value);
                                  setAnswers({ ...answers, [questions[step].id]: updated });
                                }}
                              />
                              <Label htmlFor={option.value} className="flex-1 cursor-pointer text-sm">{option.label}</Label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4">
                      <Button variant="outline" onClick={handleBack} disabled={step === 0} className="rounded-xl" data-testid="navigator-back-btn">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Back
                      </Button>
                      <Button onClick={handleNext} className="rounded-xl bg-secondary hover:bg-secondary/90" data-testid="navigator-next-btn">
                        {step === totalSteps - 1 ? 'Get Results' : 'Next'}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="results-heading">Your Personalized Results</h1>
                  <p className="text-base text-muted-foreground">
                    {results.filter(r => r.isEligible).length} eligible of {results.length} total resources
                  </p>
                </div>
              </div>
              <Button onClick={handleRestart} variant="outline" className="rounded-xl" data-testid="navigator-restart-btn">Start Over</Button>
            </div>

            <div className="space-y-4">
              {results.map((benefit) => (
                <Card key={benefit.id} className={`border rounded-2xl transition-all ${benefit.isEligible ? 'hover:shadow-md' : 'opacity-60 border-dashed'}`} data-testid={`result-${benefit.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CardTitle className="text-lg">{benefit.name}</CardTitle>
                          {benefit.verified && (
                            <Badge variant="secondary" className="rounded-full text-xs">
                              <CheckCircle className="mr-1 w-3 h-3" /> Verified
                            </Badge>
                          )}
                          {!benefit.isEligible && (
                            <Badge variant="outline" className="rounded-full text-xs border-amber-300 text-amber-600">
                              <Lock className="mr-1 w-3 h-3" /> May require upgrade
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">{benefit.organization}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground mb-3">{benefit.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {benefit.categories.map((cat) => (
                        <Badge key={cat} variant="outline" className="rounded-full text-xs">{cat.replace('-', ' ')}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" className="rounded-xl bg-secondary hover:bg-secondary/90">
                        <a href={benefit.url} target="_blank" rel="noopener noreferrer">
                          Visit Website <ExternalLink className="ml-1 w-3 h-3" />
                        </a>
                      </Button>
                      {benefit.phone && (
                        <Button asChild variant="outline" size="sm" className="rounded-xl">
                          <a href={`tel:${benefit.phone}`}>Call Now</a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
