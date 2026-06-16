import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowRight,
  Banknote,
  Bot,
  Briefcase,
  Building2,
  GraduationCap,
  Home,
  Landmark,
  Mail,
  Minus,
  Scale,
  Send,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/utils/analytics';

const API = process.env.REACT_APP_BACKEND_URL;
const SAFETY_NOTICE = 'Veterans Passage provides educational resources and is not a law firm, financial advisor, medical provider, or VA-accredited claims representative.';

const quickStarts = [
  { label: 'Build My Veteran Roadmap', prompt: 'Build my Veteran Roadmap.', category: 'roadmap', action: 'roadmap' },
  { label: 'Find My Benefits', prompt: 'I want to find my veteran benefits.', category: 'benefits' },
  { label: 'Find a Career Path', prompt: 'I want to find a veteran career path.', category: 'careers' },
  { label: 'Start a Veteran Business', prompt: 'I want to start a veteran business.', category: 'business' },
  { label: 'Build Wealth', prompt: 'I want veteran wealth-building resources.', category: 'wealth' },
  { label: 'Education Options', prompt: 'I want education options and GI Bill programs.', category: 'education' },
  { label: 'Housing Resources', prompt: 'I need veteran housing resources.', category: 'housing' },
  { label: 'Upgrade My Discharge', prompt: 'I need discharge upgrade resources.', category: 'second_chance' },
];

const categoryConfig = {
  benefits: {
    title: 'Benefits Navigator',
    icon: Landmark,
    path: '/benefits',
    keywords: ['benefit', 'va', 'disability', 'pact', 'gi bill', 'vre', 'vr&e', 'healthcare', 'state benefit', 'claim'],
    intro: 'A good starting point is the Benefits Navigator. It can help you organize VA benefits, PACT Act, GI Bill, VR&E, healthcare, and state benefit resources.',
    resources: [
      { label: 'Benefits Navigator', href: '/benefits', type: 'Page' },
      { label: 'Veteran benefits guide', href: '/benefits', type: 'Resource category' },
      { label: 'PACT Act and VA benefits topics', href: '/blog', type: 'Article topics' },
    ],
  },
  careers: {
    title: 'Career Center',
    icon: Briefcase,
    path: '/careers',
    keywords: ['job', 'career', 'resume', 'employer', 'remote', 'federal', 'trade', 'hiring', 'work'],
    intro: 'The Career Center is the fastest place to start for veteran-friendly employers, federal jobs, remote jobs, resume resources, and trade careers.',
    resources: [
      { label: 'Career Center', href: '/careers', type: 'Page' },
      { label: 'Veteran jobs board', href: '/jobs', type: 'Resource category' },
      { label: 'Resume and transition articles', href: '/blog', type: 'Article topics' },
    ],
  },
  business: {
    title: 'Business Launch Center',
    icon: Building2,
    path: '/business',
    keywords: ['business', 'llc', 'startup', 'grant', 'funding', 'marketing', 'entrepreneur', 'ai tool'],
    intro: 'For a business goal, start with the Business Launch Center. It points you toward grants, LLC setup resources, funding options, marketing resources, and AI tools.',
    resources: [
      { label: 'Business Launch Center', href: '/business', type: 'Page' },
      { label: 'Veteran business grants', href: '/business', type: 'Resource category' },
      { label: 'Startup funding and LLC setup topics', href: '/blog', type: 'Article topics' },
    ],
  },
  second_chance: {
    title: 'Second Chance Center',
    icon: Scale,
    path: '/second-chance',
    keywords: ['discharge', 'upgrade', 'legal', 'reentry', 'restoration', 'oth', 'benefits restoration', 'record'],
    intro: 'The Second Chance Center is the right starting point for discharge upgrades, veteran legal resources, benefits restoration, and reentry programs.',
    resources: [
      { label: 'Second Chance Center', href: '/second-chance', type: 'Page' },
      { label: 'Discharge upgrade resources', href: '/second-chance', type: 'Resource category' },
      { label: 'Legal resource articles', href: '/blog', type: 'Article topics' },
    ],
  },
  wealth: {
    title: 'Wealth Building Center',
    icon: Banknote,
    path: '/wealth',
    keywords: ['wealth', 'money', 'loan', 'va loan', 'homeownership', 'multifamily', 'invest', 'passive income', 'financial'],
    intro: 'The Wealth Building Center can help you research VA loans, homeownership, multifamily investing basics, financial literacy, and wealth-building resources.',
    resources: [
      { label: 'Wealth Building Center', href: '/wealth', type: 'Page' },
      { label: 'VA loan wealth-building resources', href: '/wealth', type: 'Resource category' },
      { label: 'Financial literacy topics', href: '/blog', type: 'Article topics' },
    ],
  },
  education: {
    title: 'Education Options',
    icon: GraduationCap,
    path: '/education',
    keywords: ['education', 'school', 'college', 'training', 'certificate', 'gi bill', 'degree', 'program'],
    intro: 'For education, start with GI Bill programs, veteran education benefits, high-paying career training, and VR&E-related resources.',
    resources: [
      { label: 'Education Center', href: '/education', type: 'Page' },
      { label: 'GI Bill programs', href: '/education', type: 'Resource category' },
      { label: 'High-paying career training topics', href: '/blog', type: 'Article topics' },
    ],
  },
  housing: {
    title: 'Housing Resources',
    icon: Home,
    path: '/housing',
    keywords: ['housing', 'home', 'rent', 'homeless', 'shelter', 'va loan', 'mortgage', 'first time buyer'],
    intro: 'For housing, start with VA loan benefits, veteran housing assistance, first-time buyer guidance, and emergency housing resources if needed.',
    resources: [
      { label: 'Housing Center', href: '/housing', type: 'Page' },
      { label: 'VA loan first-time buyer resources', href: '/housing', type: 'Resource category' },
      { label: 'Housing assistance topics', href: '/blog', type: 'Article topics' },
    ],
  },
};

const fallbackResources = [
  { label: 'Benefits', href: '/benefits', type: 'Page' },
  { label: 'Careers', href: '/careers', type: 'Page' },
  { label: 'Business', href: '/business', type: 'Page' },
  { label: 'Education', href: '/education', type: 'Page' },
  { label: 'Housing', href: '/housing', type: 'Page' },
  { label: 'Wealth', href: '/wealth', type: 'Page' },
  { label: 'Second Chance', href: '/second-chance', type: 'Page' },
];

const roadmapDraftInitial = {
  branch: '',
  state: '',
  employmentStatus: '',
  disabilityStatus: '',
  primaryInterest: '',
};

const roadmapFields = {
  branch: {
    label: 'Branch',
    options: ['Army', 'Navy', 'Air Force', 'Marines', 'Coast Guard', 'Space Force', 'National Guard/Reserve', 'Prefer not to say'],
  },
  employmentStatus: {
    label: 'Employment status',
    options: ['Employed', 'Seeking work', 'Transitioning soon', 'Student or training', 'Self-employed', 'Not currently working', 'Prefer not to say'],
  },
  disabilityStatus: {
    label: 'Disability status',
    options: ['No rating or not sure', '0%', '10-40%', '50-70%', '80-100%', 'Prefer not to say'],
  },
  primaryInterest: {
    label: 'Primary interest',
    options: ['Benefits', 'Career', 'Business', 'Education', 'Housing', 'Wealth', 'Second Chance'],
  },
};

const roadmapFormFields = [
  {
    key: 'branch',
    label: roadmapFields.branch.label,
    placeholder: 'Select branch',
    options: roadmapFields.branch.options,
  },
  {
    key: 'state',
    label: 'State',
    placeholder: 'Example: Texas',
    type: 'input',
    autoComplete: 'address-level1',
  },
  {
    key: 'employmentStatus',
    label: roadmapFields.employmentStatus.label,
    placeholder: 'Select employment status',
    options: roadmapFields.employmentStatus.options,
  },
  {
    key: 'disabilityStatus',
    label: roadmapFields.disabilityStatus.label,
    placeholder: 'Select disability status',
    options: roadmapFields.disabilityStatus.options,
  },
  {
    key: 'primaryInterest',
    label: roadmapFields.primaryInterest.label,
    placeholder: 'Select primary interest',
    options: roadmapFields.primaryInterest.options,
  },
];

const roadmapCenters = [
  { key: 'benefits', label: 'Benefits resources', href: '/benefits', type: 'Roadmap center' },
  { key: 'careers', label: 'Career resources', href: '/careers', type: 'Roadmap center' },
  { key: 'business', label: 'Business resources', href: '/business', type: 'Roadmap center' },
  { key: 'education', label: 'Education resources', href: '/education', type: 'Roadmap center' },
  { key: 'housing', label: 'Housing resources', href: '/housing', type: 'Roadmap center' },
  { key: 'wealth', label: 'Wealth resources', href: '/wealth', type: 'Roadmap center' },
  { key: 'second_chance', label: 'Second chance resources', href: '/second-chance', type: 'Roadmap center' },
];

const interestToCenter = {
  Benefits: 'benefits',
  Career: 'careers',
  Business: 'business',
  Education: 'education',
  Housing: 'housing',
  Wealth: 'wealth',
  'Second Chance': 'second_chance',
};

const initialMessage = {
  role: 'assistant',
  text: 'Hi, I can help you find the right Veterans Passage resources faster. Choose a quick start or describe your goal.',
  resources: fallbackResources.slice(0, 4),
};

function findCategory(text) {
  const normalized = text.toLowerCase();
  let best = { key: 'benefits', score: 0 };
  Object.entries(categoryConfig).forEach(([key, config]) => {
    const score = config.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > best.score) best = { key, score };
  });
  return best.score > 0 ? best.key : 'overview';
}

function buildAssistantReply(text, explicitCategory) {
  const categoryKey = explicitCategory || findCategory(text);
  if (categoryKey === 'overview') {
    return {
      role: 'assistant',
      text: 'I can help you narrow this down. The most common starting points are benefits, careers, business, education, housing, wealth-building, and second-chance resources.',
      resources: fallbackResources,
      category: 'overview',
    };
  }

  const config = categoryConfig[categoryKey];
  return {
    role: 'assistant',
    text: `${config.intro} I can point you to educational resources and next-step pages, but I cannot predict claim outcomes, provide legal advice, provide medical advice, or make financial guarantees.`,
    resources: config.resources,
    category: categoryKey,
  };
}

function roadmapPriority(centerKey, draft) {
  let priority = interestToCenter[draft.primaryInterest] === centerKey ? 3 : 1;
  if (centerKey === 'careers' && ['Seeking work', 'Transitioning soon', 'Not currently working'].includes(draft.employmentStatus)) priority += 2;
  if (centerKey === 'benefits' && !['No rating or not sure', 'Prefer not to say'].includes(draft.disabilityStatus)) priority += 2;
  if (centerKey === 'education' && ['Student or training', 'Transitioning soon'].includes(draft.employmentStatus)) priority += 1;
  if (centerKey === 'business' && draft.employmentStatus === 'Self-employed') priority += 1;
  return priority;
}

function roadmapWhy(centerKey, draft) {
  const stateNote = draft.state ? ` You can also look for state-specific resources in ${draft.state}.` : '';
  const why = {
    benefits: `Start here to organize VA benefits, PACT Act, GI Bill, VR&E, healthcare, and state benefit research.${stateNote}`,
    careers: `Use this center to compare veteran-friendly employers, federal jobs, remote work, resume support, and trade paths based on your employment goal.`,
    business: `Use this path for veteran entrepreneur education, grants research, startup funding options, LLC setup resources, marketing basics, and business tools.`,
    education: `Use this path to compare GI Bill programs, career training, certificates, degree options, and education benefits research.`,
    housing: `Use this path to research VA loan benefits, homeownership education, housing assistance, and first-time buyer resources.`,
    wealth: `Use this path for financial literacy, VA loan wealth-building education, budgeting, and responsible long-term planning resources.`,
    second_chance: `Use this path for discharge upgrade education, veteran legal resource directories, benefits restoration topics, and reentry support.`,
  };
  return why[centerKey];
}

function roadmapNextStep(centerKey) {
  const steps = {
    benefits: 'Make a list of documents you already have, then review benefit categories before contacting official or accredited help.',
    careers: 'Pick one target role and gather a resume, DD-214 details if available, and three transferable military skills.',
    business: 'Write a one-paragraph business idea, target customer, and first offer before researching funding.',
    education: 'Choose one career outcome first, then compare programs by cost, credential value, time, and support.',
    housing: 'Review affordability, housing assistance options, and VA loan basics before contacting any lender.',
    wealth: 'Start with budget, debt, savings, and risk education before making investment or property decisions.',
    second_chance: 'Gather records and review qualified legal aid resources; do not treat this as legal advice.',
  };
  return steps[centerKey];
}

function buildVeteranRoadmap(draft) {
  const rankedCenters = roadmapCenters
    .map((center, index) => ({
      ...center,
      order: index,
      priority: roadmapPriority(center.key, draft),
      why: roadmapWhy(center.key, draft),
      nextStep: roadmapNextStep(center.key),
    }))
    .sort((a, b) => b.priority - a.priority || a.order - b.order);

  return {
    summary: `Built from your branch, state, employment status, disability status, and primary interest. This is an educational roadmap, not an eligibility decision or professional advice.`,
    topFocus: rankedCenters[0]?.label || 'Benefits resources',
    sections: rankedCenters,
  };
}

function ResourceLink({ item, onClick }) {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className="block rounded-lg border bg-background p-3 hover:border-secondary/40 hover:bg-secondary/5 transition-colors"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">{item.type}</span>
      <span className="mt-1 flex items-center justify-between gap-3 text-sm font-bold text-foreground">
        {item.label}
        <ArrowRight className="w-4 h-4 shrink-0" />
      </span>
    </Link>
  );
}

function normalizeRoadmapSections(roadmap) {
  const source = roadmap.sections || roadmap.roadmap_steps || [];
  return source.map((section) => ({
    key: section.key || section.id || section.title,
    label: section.label || section.title,
    href: section.href || section.action_url,
    type: section.type || 'Roadmap step',
    priority: section.priority || 1,
    why: section.why || section.description,
    nextStep: section.nextStep || section.next_step || section.description,
  }));
}

function RoadmapCard({ roadmap, onResourceClick }) {
  const sections = normalizeRoadmapSections(roadmap);
  const topFocus = roadmap.topFocus || sections[0]?.label || 'Benefits resources';
  const summary = roadmap.summary || `Saved to your account. Progress: ${roadmap.completion_percentage || 0}% complete. This is an educational roadmap, not an eligibility decision or professional advice.`;

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border bg-background p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Veteran Roadmap</p>
        <p className="mt-1 text-sm font-bold text-foreground">Start with {topFocus}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{summary}</p>
      </div>
      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.key} className="rounded-xl border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{section.label}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{section.why}</p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary/10 px-2 py-1 text-[10px] font-bold text-secondary">
                {section.priority >= 3 ? 'Start' : 'Explore'}
              </span>
            </div>
            <p className="mt-2 text-xs text-foreground leading-relaxed">
              <span className="font-semibold">Next step:</span> {section.nextStep}
            </p>
            <ResourceLink
              item={{ label: section.label, href: section.href, type: section.type }}
              onClick={() => onResourceClick({ label: section.label, href: section.href, type: section.type }, 'roadmap')}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VeteranSuccessAssistant() {
  const { user, isAuthenticated } = useAuth();
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const closeButtonRef = useRef(null);
  const launcherRef = useRef(null);
  const minimizedLauncherRef = useRef(null);
  const firstQuickStartRef = useRef(null);
  const shouldRestoreFocusRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem('vp_success_assistant_minimized') === 'true'
  ));
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([initialMessage]);
  const [leadOffered, setLeadOffered] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [roadmapDraft, setRoadmapDraft] = useState(roadmapDraftInitial);
  const [roadmapError, setRoadmapError] = useState('');
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [savedRoadmap, setSavedRoadmap] = useState(null);
  const [roadmapFetchState, setRoadmapFetchState] = useState('idle');
  const savedRoadmapAnnouncedRef = useRef(false);
  const roadmapErrorId = 'assistant-roadmap-error';

  const showLeadPrompt = leadOffered && !leadSubmitted;
  const categories = useMemo(() => Object.entries(categoryConfig), []);

  const getDialogFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    return Array.from(dialogRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
  }, []);

  const focusAssistant = useCallback(() => {
    const focusTarget = textareaRef.current || closeButtonRef.current || firstQuickStartRef.current;
    focusTarget?.focus({ preventScroll: true });
  }, []);

  const restoreLauncherFocus = useCallback(() => {
    const focusTarget = (minimized ? minimizedLauncherRef.current : launcherRef.current)
      || document.querySelector('button[aria-label="Open Veteran Success Assistant"]');
    focusTarget?.focus({ preventScroll: true });
    shouldRestoreFocusRef.current = false;
  }, [minimized]);

  const restoreLauncherFocusSoon = useCallback((useMinimizedLauncher) => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      const focusTarget = (useMinimizedLauncher ? minimizedLauncherRef.current : launcherRef.current)
        || document.querySelector('button[aria-label="Open Veteran Success Assistant"]');
      focusTarget?.focus({ preventScroll: true });
      shouldRestoreFocusRef.current = false;
    }, 100);
  }, []);

  const closeAssistant = useCallback(() => {
    shouldRestoreFocusRef.current = true;
    setOpen(false);
    restoreLauncherFocusSoon(false);
    trackEvent('assistant_closed', { source: 'floating_widget' });
  }, [restoreLauncherFocusSoon]);

  const minimizeAssistant = useCallback(() => {
    shouldRestoreFocusRef.current = true;
    setMinimized(true);
    setOpen(false);
    restoreLauncherFocusSoon(true);
    if (typeof window !== 'undefined') localStorage.setItem('vp_success_assistant_minimized', 'true');
    trackEvent('assistant_minimized', { source: 'floating_widget' });
  }, [restoreLauncherFocusSoon]);

  useEffect(() => {
    if (open) {
      focusAssistant();
      const timeoutId = window.setTimeout(focusAssistant, 50);
      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [open, focusAssistant]);

  useEffect(() => {
    if (open) return;
    if (!shouldRestoreFocusRef.current) return;
    requestAnimationFrame(restoreLauncherFocus);
    const timeoutId = window.setTimeout(restoreLauncherFocus, 50);
    return () => window.clearTimeout(timeoutId);
  }, [open, minimized, restoreLauncherFocus]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAssistant();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getDialogFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!dialogRef.current?.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeAssistant, getDialogFocusableElements]);

  const openAssistant = () => {
    setOpen(true);
    setMinimized(false);
    if (typeof window !== 'undefined') localStorage.setItem('vp_success_assistant_minimized', 'false');
    trackEvent('assistant_opened', { source: 'floating_widget' });
  };

  const loadSavedRoadmap = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedRoadmap(null);
      setRoadmapFetchState('ready');
      return null;
    }

    setRoadmapFetchState('loading');
    try {
      const { data } = await axios.get(`${API}/api/roadmap`, { withCredentials: true });
      const roadmap = data.roadmap || null;
      setSavedRoadmap(roadmap);
      setRoadmapFetchState('ready');
      return roadmap;
    } catch {
      setRoadmapFetchState('error');
      return null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    loadSavedRoadmap().then((roadmap) => {
      if (!active || !roadmap || savedRoadmapAnnouncedRef.current) return;
      savedRoadmapAnnouncedRef.current = true;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I found your saved Veteran Roadmap. You can continue it from here or track progress on your dashboard.',
          roadmap,
          category: 'roadmap',
        },
      ]);
    });
    return () => { active = false; };
  }, [open, loadSavedRoadmap]);

  const submitPrompt = (text, category, promptLabel) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = buildAssistantReply(trimmed, category);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }, reply]);
    setInput('');
    setLeadOffered(true);
    trackEvent(category ? 'assistant_prompt_selected' : 'assistant_message_sent', {
      prompt: promptLabel,
      category: reply.category,
      source: 'floating_widget',
    });
  };

  const startRoadmapFlow = async () => {
    const existingRoadmap = savedRoadmap || await loadSavedRoadmap();
    if (existingRoadmap) {
      setRoadmapOpen(false);
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: 'Build My Veteran Roadmap' },
        {
          role: 'assistant',
          text: 'You already have a saved Veteran Roadmap. Here it is so you can keep moving instead of starting over.',
          roadmap: existingRoadmap,
          category: 'roadmap',
        },
      ]);
      trackEvent('assistant_saved_roadmap_viewed', { source: 'floating_widget' });
      return;
    }

    setRoadmapOpen(true);
    setRoadmapDraft(roadmapDraftInitial);
    setRoadmapError('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: 'Build My Veteran Roadmap' },
      {
        role: 'assistant',
        text: isAuthenticated
          ? 'I can build and save a free educational roadmap from five basics. I will not give legal, medical, financial, or VA claims advice.'
          : 'I can build a free educational roadmap from five basics. Sign in to save it to your account. I will not give legal, medical, financial, or VA claims advice.',
        category: 'roadmap_intro',
      },
    ]);
    trackEvent('assistant_roadmap_started', { source: 'floating_widget' });
  };

  const updateRoadmapDraft = (field, value) => {
    setRoadmapDraft((prev) => ({ ...prev, [field]: value }));
    if (roadmapError) setRoadmapError('');
  };

  const submitRoadmap = async (event) => {
    event.preventDefault();
    const missing = Object.entries(roadmapDraft).filter(([, value]) => !value.trim()).map(([key]) => key);
    if (missing.length > 0) {
      setRoadmapError('Please complete every field to build your roadmap.');
      return;
    }

    setRoadmapLoading(true);
    try {
      let roadmap;
      if (isAuthenticated) {
        const { data } = await axios.post(`${API}/api/roadmap/create`, {
          branch: roadmapDraft.branch,
          state: roadmapDraft.state,
          employment_status: roadmapDraft.employmentStatus,
          disability_status: roadmapDraft.disabilityStatus,
          primary_interest: roadmapDraft.primaryInterest,
        }, { withCredentials: true });
        roadmap = data.roadmap;
        setSavedRoadmap(roadmap);
        trackEvent('roadmap_created', { source: 'floating_widget' });
      } else {
        roadmap = buildVeteranRoadmap(roadmapDraft);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: isAuthenticated
            ? 'Your free Veteran Roadmap is saved. Use it as an educational starting point and verify details with official, qualified, or accredited sources when needed.'
            : 'Your free Veteran Roadmap is ready for this session. Sign in to save progress across visits.',
          roadmap,
          category: 'roadmap',
        },
      ]);
      setRoadmapOpen(false);
      setLeadOffered(true);
      trackEvent('assistant_roadmap_generated', {
        source: 'floating_widget',
        saved: Boolean(isAuthenticated),
      });
    } catch {
      setRoadmapError('Roadmap generation failed. Please try again.');
      toast.error('Could not build the roadmap. Please try again.');
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleResourceClick = (item, category) => {
    trackEvent('assistant_resource_category_clicked', {
      label: item.label,
      href: item.href,
      type: item.type,
      category,
    });
  };

  const handleLeadAttempt = async () => {
    trackEvent('assistant_email_signup_attempt', {
      authenticated: Boolean(isAuthenticated),
      source: 'veteran_success_assistant',
    });

    if (!isAuthenticated || !user) return;

    try {
      await axios.post(`${API}/api/intelligence/request-help`, {
        category: 'updates',
        resource_name: 'Veteran Success Assistant Updates',
        message: 'Requested free veteran resource updates from the assistant.',
      }, { withCredentials: true });
      setLeadSubmitted(true);
      trackEvent('lead_submitted', { source: 'veteran_success_assistant', category: 'updates' });
      toast.success('You are on the update list.');
    } catch {
      toast.error('Could not save the update request. You can still explore resources.');
    }
  };

  if (!open && minimized) {
    return (
      <Button
        ref={minimizedLauncherRef}
        type="button"
        onClick={openAssistant}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-secondary hover:bg-secondary/90 shadow-lg h-12 px-4"
        aria-label="Open Veteran Success Assistant"
      >
        <Bot className="w-5 h-5 mr-2" />
        Ask
      </Button>
    );
  }

  return (
    <>
      {!open && (
        <Button
          ref={launcherRef}
          type="button"
          onClick={openAssistant}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-secondary hover:bg-secondary/90 shadow-lg h-14 px-5"
          aria-label="Open Veteran Success Assistant"
        >
          <Bot className="w-5 h-5 mr-2" />
          Veteran Success Assistant
        </Button>
      )}

      {open && (
        <aside
          ref={dialogRef}
          className="fixed bottom-3 right-3 left-3 sm:left-auto z-40 sm:w-[390px] max-h-[calc(100vh-1.5rem)] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Veteran Success Assistant"
        >
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Veteran Success Assistant</p>
                <p className="text-xs text-muted-foreground">Friendly resource navigator</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={minimizeAssistant} className="p-2 rounded-lg hover:bg-muted" aria-label="Minimize assistant">
                <Minus className="w-4 h-4" />
              </button>
              <button ref={closeButtonRef} type="button" onClick={closeAssistant} className="p-2 rounded-lg hover:bg-muted" aria-label="Close assistant">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 bg-amber-50 border-b text-xs text-amber-900 leading-relaxed">
            {SAFETY_NOTICE}
          </div>

          <div className="p-4 border-b">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Quick start</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickStarts.map((prompt, index) => (
                <button
                  ref={index === 0 ? firstQuickStartRef : null}
                  key={prompt.label}
                  type="button"
                  onClick={() => (prompt.action === 'roadmap' ? startRoadmapFlow() : submitPrompt(prompt.prompt, prompt.category, prompt.label))}
                  className="shrink-0 rounded-full border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-secondary/40 hover:bg-secondary/5"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
            {roadmapFetchState === 'loading' && (
              <p className="mt-2 text-xs text-muted-foreground">Checking for your saved roadmap...</p>
            )}
            {roadmapFetchState === 'error' && (
              <p className="mt-2 text-xs text-red-600">Saved roadmap lookup is unavailable. You can still browse resources.</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[88%] rounded-2xl p-3 text-sm leading-relaxed ${
                  message.role === 'user' ? 'bg-secondary text-white rounded-br-md' : 'bg-muted/50 border text-foreground rounded-bl-md'
                }`}>
                  <p>{message.text}</p>
                  {message.resources?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.resources.map((item) => (
                        <ResourceLink
                          key={`${item.href}-${item.label}`}
                          item={item}
                          onClick={() => handleResourceClick(item, message.category)}
                        />
                      ))}
                    </div>
                  )}
                  {message.roadmap && (
                    <RoadmapCard roadmap={message.roadmap} onResourceClick={handleResourceClick} />
                  )}
                </div>
              </div>
            ))}

            {roadmapOpen && (
              <form onSubmit={submitRoadmap} className="rounded-xl border bg-background p-3 space-y-3" data-testid="assistant-roadmap-form">
                <div>
                  <p className="text-sm font-bold text-foreground">Build My Veteran Roadmap</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Free educational recommendations only. This does not predict benefits, claims, legal outcomes, medical needs, or financial returns.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {roadmapFormFields.map((field) => (
                    <label key={field.key} className="text-xs font-semibold text-foreground">
                      {field.label}
                      {field.type === 'input' ? (
                        <input
                          value={roadmapDraft[field.key]}
                          onChange={(event) => updateRoadmapDraft(field.key, event.target.value)}
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal"
                          placeholder={field.placeholder}
                          autoComplete={field.autoComplete}
                          aria-invalid={Boolean(roadmapError)}
                          aria-describedby={roadmapError ? roadmapErrorId : undefined}
                          aria-required="true"
                        />
                      ) : (
                        <select
                          value={roadmapDraft[field.key]}
                          onChange={(event) => updateRoadmapDraft(field.key, event.target.value)}
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-normal"
                          aria-invalid={Boolean(roadmapError)}
                          aria-describedby={roadmapError ? roadmapErrorId : undefined}
                          aria-required="true"
                        >
                          <option value="">{field.placeholder}</option>
                          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      )}
                    </label>
                  ))}
                </div>
                {roadmapError && <p id={roadmapErrorId} role="alert" className="text-xs font-semibold text-red-600">{roadmapError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="rounded-full bg-secondary hover:bg-secondary/90" disabled={roadmapLoading}>
                    {roadmapLoading ? 'Building...' : 'Generate Roadmap'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setRoadmapOpen(false)} disabled={roadmapLoading}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {showLeadPrompt && (
              <div className="rounded-xl border bg-secondary/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-secondary" />
                  <p className="text-sm font-bold text-foreground">Would you like free veteran resource updates?</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  This never blocks access to resources. {isAuthenticated ? 'We can save the request to your account email.' : 'Create a free account to receive updates.'}
                </p>
                {isAuthenticated ? (
                  <Button type="button" size="sm" className="rounded-full bg-secondary hover:bg-secondary/90" onClick={handleLeadAttempt}>
                    Send Me Updates
                  </Button>
                ) : (
                  <Button asChild size="sm" className="rounded-full bg-secondary hover:bg-secondary/90" onClick={handleLeadAttempt}>
                    <Link to="/signup">Get Veteran Updates</Link>
                  </Button>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Browse centers</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Link
                      key={key}
                      to={config.path}
                      onClick={() => trackEvent('assistant_cta_click', { cta: 'browse_center', category: key, href: config.path })}
                      className="rounded-lg border px-3 py-2 text-xs font-semibold hover:border-secondary/40 hover:bg-secondary/5 flex items-center gap-2"
                    >
                      <Icon className="w-3.5 h-3.5 text-secondary" />
                      {config.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <form
            className="p-3 border-t flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitPrompt(input);
            }}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tell me your goal..."
              rows={1}
              className="min-h-10 max-h-24 resize-none rounded-xl text-sm"
              aria-label="Ask the Veteran Success Assistant"
            />
            <Button type="submit" className="rounded-xl bg-secondary hover:bg-secondary/90 h-10 px-3" disabled={!input.trim()} aria-label="Send message">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </aside>
      )}
    </>
  );
}
