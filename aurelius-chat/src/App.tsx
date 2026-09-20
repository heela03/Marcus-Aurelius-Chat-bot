import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowUp,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Feather,
  Leaf,
  Menu,
  Moon,
  RotateCcw,
  ScrollText,
  Send,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  principle?: string;
  isFallback?: boolean;
};

const meditations = [
  {
    label: 'On the present moment',
    text: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
    reference: 'Meditations, 12.36',
  },
  {
    label: 'On difficult people',
    text: 'The best revenge is to be unlike him who performed the injury.',
    reference: 'Meditations, 6.6',
  },
  {
    label: 'On the work at hand',
    text: 'Do every act of your life as though it were the very last act of your life.',
    reference: 'Meditations, 2.5',
  },
];

const prompts = [
  'I keep replaying a conversation I regret.',
  'How do I act when the outcome is not mine to control?',
  'I feel behind in my life. What should I do today?',
];

const fallbackCounsel = (question: string) => {
  const lower = question.toLowerCase();
  const normalized = lower.replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  if (['hi', 'hello', 'hey', 'hey there', 'hi there', 'hello there', 'good morning', 'good afternoon', 'good evening'].includes(normalized)) {
    return {
      answer: 'Hello. What is on your mind?',
      source: 'Stoic reflection',
      principle: 'The present moment',
    };
  }
  if (lower.includes('regret') || lower.includes('conversation')) {
    return {
      answer:
        'You cannot change the words already spoken, but you can choose what you do next. Ask what was yours to repair. If an apology is needed, make it plainly. If not, let the conversation teach you instead of punishing you. Take one honest step, then leave the rest behind.',
      source: 'Broader Stoic reflection',
      principle: 'The discipline of action',
    };
  }
  if (lower.includes('behind') || lower.includes('today')) {
    return {
      answer:
        '“Behind” is a judgment, not a fact. Set it down for today. Choose one task that belongs to you now and do it without comparing your pace with anyone else’s. A life is not repaired in one grand gesture. It returns to its course through the next deliberate act.',
      source: 'Inspired by Meditations',
      principle: 'The discipline of perception',
    };
  }
  return {
    answer:
      'Separate the event from the story your mind has added to it. The event may be outside your control, but your judgment and next action are still yours. Ask: what useful, honest thing can I do in the next hour? Do that without waiting for the world to become easier.',
    source: 'Inspired by Meditations',
    principle: 'The dichotomy of control',
  };
};

function BrandMark() {
  return (
    <motion.div
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--sidebar-primary)/.5)] bg-[hsl(var(--sidebar-primary)/.13)] text-[hsl(var(--sidebar-primary))]"
      initial={{ rotate: -12, scale: 0.86, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 170, damping: 16, delay: 0.12 }}
      whileHover={{ rotate: 18, scale: 1.08 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        <Sun className="h-5 w-5" strokeWidth={1.6} />
      </motion.div>
      <span className="absolute inset-[7px] rounded-full border border-[hsl(var(--sidebar-primary)/.35)]" />
    </motion.div>
  );
}

function AmbientSunstone({ active, loading }: { active: boolean; loading: boolean }) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(pointerY, { stiffness: 80, damping: 20 });
  const orbitX = useTransform(smoothX, [-1, 1], [-10, 10]);
  const orbitY = useTransform(smoothY, [-1, 1], [-8, 8]);

  return (
    <motion.div
      className="pointer-events-auto fixed right-[5vw] top-[16vh] z-0 hidden h-52 w-52 lg:block"
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerX.set((event.clientX - bounds.left) / bounds.width * 2 - 1);
        pointerY.set((event.clientY - bounds.top) / bounds.height * 2 - 1);
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      <motion.div
        className="absolute inset-6 rounded-full border border-[hsl(var(--primary)/.12)]"
        animate={{ rotate: 360, scale: loading ? [1, 1.08, 1] : 1 }}
        transition={{
          rotate: { duration: 26, repeat: Infinity, ease: 'linear' },
          scale: { duration: 2.4, repeat: loading ? Infinity : 0, ease: 'easeInOut' },
        }}
        style={{ x: orbitX, y: orbitY }}
      />
      <motion.div
        className="absolute inset-12 rounded-full bg-[radial-gradient(circle_at_35%_30%,hsl(var(--primary)/.25),hsl(var(--primary)/.06)_42%,transparent_70%)]"
        animate={{
          opacity: active ? [0.45, 0.8, 0.45] : 0.38,
          scale: active ? [1, 1.12, 1] : 1,
        }}
        transition={{ duration: loading ? 1.7 : 4.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ x: orbitX, y: orbitY }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_24px_hsl(var(--primary)/.65)]"
        animate={{ scale: active ? [1, 1.45, 1] : 1 }}
        transition={{ duration: 2.1, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function MarkedLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">
      <span className="h-px w-5 bg-[hsl(var(--primary)/.65)]" />
      {children}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isWriting = source.toLowerCase().includes('meditations');
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.11em] ${
        isWriting
          ? 'border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]'
          : 'border-[hsl(var(--accent)/.27)] bg-[hsl(var(--accent)/.08)] text-[hsl(var(--accent))]'
      }`}
      data-testid="badge-answer-source"
    >
      {isWriting ? <BookOpen className="h-3 w-3" /> : <Leaf className="h-3 w-3" />}
      {source}
    </div>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <section className="animate-rise-in flex min-h-[min(560px,calc(100dvh-250px))] flex-col justify-center py-10 sm:py-16">
      <div className="mb-8 flex items-center gap-4 text-[hsl(var(--primary))]">
        <div className="h-px w-12 bg-[hsl(var(--primary)/.55)]" />
        <span className="font-mono text-[10px] uppercase tracking-[.2em]">A quiet beginning</span>
      </div>
      <div className="max-w-3xl">
        <h1 className="font-serif text-4xl leading-[1.12] tracking-[-.035em] text-[hsl(var(--foreground))] sm:text-6xl lg:text-[4.65rem]">
          Ask what is
          <br />
          <em className="text-[hsl(var(--primary))]">truly yours.</em>
        </h1>
        <p className="mt-7 max-w-lg text-[15px] leading-7 text-[hsl(var(--muted-foreground))] sm:text-base">
          A private conversation for difficult questions, grounded in the writings of Marcus Aurelius and the wider Stoic practice of living well.
        </p>
      </div>
      <div className="mt-12 grid max-w-3xl gap-2.5 sm:grid-cols-3">
        {prompts.map((prompt, index) => (
          <motion.button
            className="group flex min-h-[100px] flex-col justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.56)] p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.58)] hover:bg-[hsl(var(--card))]"
            data-testid={`button-prompt-${index}`}
            key={prompt}
            onClick={() => onPrompt(prompt)}
            type="button"
            whileHover={{ y: -4, rotate: index === 1 ? 0.4 : index === 0 ? -0.4 : 0.3 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
          >
            <span className="font-serif text-[13px] leading-5 text-[hsl(var(--foreground)/.8)]">{prompt}</span>
            <ArrowUp className="h-3.5 w-3.5 rotate-45 text-[hsl(var(--primary))] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function MeditationCard({ meditation, onUse }: { meditation: typeof meditations[number]; onUse: (text: string) => void }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.63)] p-5 shadow-[0_16px_40px_hsl(28_28%_28%/.05)] sm:p-6">
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-[hsl(var(--primary)/.12)]" />
      <div className="absolute -right-2 -top-4 h-16 w-16 rounded-full border border-[hsl(var(--primary)/.1)]" />
      <MarkedLabel>Daily meditation</MarkedLabel>
      <p className="relative max-w-2xl font-serif text-lg leading-8 text-[hsl(var(--foreground))] sm:text-xl">
        “{meditation.text}”
      </p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{meditation.reference}</span>
        <button
          className="group inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.13em] text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--foreground))]"
          data-testid="button-use-meditation"
          onClick={() => onUse(`Help me reflect on this passage: “${meditation.text}”`)}
          type="button"
        >
          Sit with this <ArrowUp className="h-3 w-3 rotate-45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </section>
  );
}

function AssistantMessage({ message }: { message: Message }) {
  return (
    <motion.article
      className="grid grid-cols-[34px_minmax(0,1fr)] gap-3.5 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-4"
      data-testid={`message-assistant-${message.id}`}
      initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
    >
      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--primary)/.42)] bg-[hsl(var(--primary)/.09)] text-[hsl(var(--primary))] sm:h-9 sm:w-9">
        <Feather className="h-4 w-4" strokeWidth={1.4} />
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--foreground))]">Marcus, in counsel</span>
          {message.source && <SourceBadge source={message.source} />}
        </div>
        <div className="max-w-2xl font-serif text-[16px] leading-8 text-[hsl(var(--foreground)/.88)] sm:text-[17px]">
          {message.content}
        </div>
        {message.principle && (
          <div className="mt-5 flex max-w-xl items-start gap-2 border-l-2 border-[hsl(var(--primary)/.5)] pl-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Practice</span>
            <span className="font-mono text-[10px] uppercase tracking-[.13em] text-[hsl(var(--primary))]">{message.principle}</span>
          </div>
        )}
        {message.isFallback && (
          <div className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">
            <CircleHelp className="h-3 w-3" /> Local reflection · service unavailable
          </div>
        )}
      </div>
    </motion.article>
  );
}

function UserMessage({ message }: { message: Message }) {
  return (
    <motion.article
      className="flex justify-end"
      data-testid={`message-user-${message.id}`}
      initial={{ opacity: 0, x: 16, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
    >
      <div className="max-w-[88%] rounded-2xl rounded-br-sm border border-[hsl(var(--primary)/.16)] bg-[hsl(var(--primary)/.1)] px-4 py-3.5 text-[14px] leading-6 text-[hsl(var(--foreground)/.9)] sm:max-w-[72%] sm:px-5">
        {message.content}
      </div>
    </motion.article>
  );
}

function LoadingMessage() {
  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-3.5 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-4" data-testid="status-loading">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.06)] sm:h-9 sm:w-9">
        <Feather className="h-4 w-4 animate-breathe text-[hsl(var(--primary))]" />
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse-soft" />
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse-soft [animation-delay:180ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse-soft [animation-delay:360ms]" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Considering</span>
      </div>
    </div>
  );
}

function Counsel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const meditation = meditations[0];

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  const setPrompt = (prompt: string) => {
    setDraft(prompt);
    composerRef.current?.focus();
  };

  const clearConversation = () => {
    if (messages.length === 0) return;
    if (window.confirm('Clear this conversation and return to a quiet page?')) {
      setMessages([]);
      setError('');
    }
  };

  const submitQuestion = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || isLoading) return;
    const userMessage: Message = { id: `u-${Date.now()}`, role: 'user', content: question };
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/counsel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });
      if (!response.ok) throw new Error(`Counsel returned ${response.status}`);
      const result = (await response.json()) as { answer?: string; source?: string; principle?: string };
       const answer = result.answer;
       if (!answer) throw new Error('The counsel was empty');
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
           content: answer,
          source: result.source || 'Broader Stoic reflection',
          principle: result.principle,
        },
      ]);
    } catch {
      const local = fallbackCounsel(question);
      setError('The counsel service is resting. A local reflection is here so the question need not wait.');
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: local.answer,
          source: local.source,
          principle: local.principle,
          isFallback: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion();
    }
  };

  return (
    <div className="journal-grain min-h-[100dvh] bg-[hsl(var(--background))]">
      <AmbientSunstone active={draft.length > 0 || messages.length > 0} loading={isLoading} />
      <div className="flex min-h-[100dvh]">
        <aside className="hidden w-[276px] shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] lg:flex">
          <div className="flex items-center gap-3 px-8 pb-10 pt-8">
            <BrandMark />
            <div>
              <div className="font-serif text-[17px] tracking-[-.02em] text-[hsl(var(--sidebar-foreground))]">Aurelius</div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.52)]">Stoic counsel</div>
            </div>
          </div>
          <div className="flex-1 px-6">
            <div className="rounded-xl border border-[hsl(var(--sidebar-primary)/.19)] bg-[hsl(var(--sidebar-primary)/.06)] p-4">
              <div className="flex items-center gap-2 text-[hsl(var(--sidebar-primary))]">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-mono text-[10px] uppercase tracking-[.16em]">The practice</span>
              </div>
              <p className="mt-3 font-serif text-[13px] leading-6 text-[hsl(var(--sidebar-foreground)/.76)]">
                Attend to what is yours. Meet the rest with steadiness.
              </p>
            </div>
            <div className="mt-10">
              <div className="mb-4 px-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.4)]">This space</div>
              <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-[hsl(var(--sidebar-foreground)/.88)]">
                <ScrollText className="h-4 w-4 text-[hsl(var(--sidebar-primary))]" strokeWidth={1.5} />
                <span className="text-[12px]">Private conversation</span>
              </div>
              <div className="mt-1 flex items-center gap-3 rounded-lg px-2 py-2.5 text-[hsl(var(--sidebar-foreground)/.55)]">
                <Moon className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-[12px]">A slower way of seeing</span>
              </div>
            </div>
          </div>
          <div className="border-t border-[hsl(var(--sidebar-border))] px-8 py-6">
            <p className="font-serif text-[12px] italic leading-5 text-[hsl(var(--sidebar-foreground)/.5)]">“The soul becomes dyed with the colour of its thoughts.”</p>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.35)]">Meditations, 5.16</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-[hsl(var(--border)/.8)] px-5 sm:px-8 lg:px-12">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                className="rounded-lg p-2 text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
                data-testid="button-open-menu"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </button>
              <div className="font-serif text-[17px]">Aurelius</div>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
              <span className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">A private field journal</span>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <span className="hidden font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))] sm:inline">Dawn edition · 06:42</span>
              <button
                className="group inline-flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-35"
                data-testid="button-clear-conversation"
                disabled={messages.length === 0}
                onClick={clearConversation}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear journal</span>
              </button>
            </div>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="Navigation">
              <button className="absolute inset-0 bg-[hsl(var(--foreground)/.3)]" data-testid="button-close-menu-backdrop" onClick={() => setMobileOpen(false)} type="button">
                <span className="sr-only">Close navigation</span>
              </button>
              <aside className="relative flex h-full w-[290px] flex-col bg-[hsl(var(--sidebar))] p-7 text-[hsl(var(--sidebar-foreground))] shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><BrandMark /><span className="font-serif text-lg">Aurelius</span></div>
                  <button className="rounded-lg p-2 hover:bg-[hsl(var(--sidebar-accent))]" data-testid="button-close-menu" onClick={() => setMobileOpen(false)} type="button"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-12 rounded-xl border border-[hsl(var(--sidebar-primary)/.19)] bg-[hsl(var(--sidebar-primary)/.06)] p-4">
                  <div className="flex items-center gap-2 text-[hsl(var(--sidebar-primary))]"><Sparkles className="h-3.5 w-3.5" /><span className="font-mono text-[10px] uppercase tracking-[.16em]">The practice</span></div>
                  <p className="mt-3 font-serif text-[13px] leading-6 text-[hsl(var(--sidebar-foreground)/.76)]">Attend to what is yours. Meet the rest with steadiness.</p>
                </div>
              </aside>
            </div>
          )}

          <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col px-5 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border)/.55)] py-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Counsel</span>
                <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground)/.6)]" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground)/.7)]">{messages.length ? `${messages.length} entries` : 'No entries yet'}</span>
            </div>

            <div className="flex-1">
              {messages.length === 0 ? (
                <EmptyState onPrompt={setPrompt} />
              ) : (
                <motion.section
                  className="mx-auto max-w-3xl space-y-8 py-10 sm:py-14"
                  data-testid="message-history"
                  layout
                >
                  <div className="mb-10 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[hsl(var(--border))]" />
                    <span className="font-mono text-[9px] uppercase tracking-[.19em] text-[hsl(var(--muted-foreground))]">Today</span>
                    <div className="h-px flex-1 bg-[hsl(var(--border))]" />
                  </div>
                  <AnimatePresence initial={false} mode="popLayout">
                    {messages.map((message) => message.role === 'user' ? <UserMessage key={message.id} message={message} /> : <AssistantMessage key={message.id} message={message} />)}
                    {isLoading && <LoadingMessage />}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </motion.section>
              )}
            </div>

            {messages.length === 0 && <MeditationCard meditation={meditation} onUse={setPrompt} />}

            <div className="sticky bottom-0 z-10 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background))_23%)] pb-5 pt-8 sm:pb-8">
              {error && (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-[hsl(var(--primary)/.24)] bg-[hsl(var(--primary)/.07)] px-3.5 py-3 text-[12px] leading-5 text-[hsl(var(--foreground)/.75)]" data-testid="status-error">
                  <div className="flex gap-2"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]" />{error}</div>
                  <button className="shrink-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="button-dismiss-error" onClick={() => setError('')} type="button"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <form className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.94)] p-2 shadow-[0_12px_35px_hsl(28_28%_28%/.07)] transition-colors focus-within:border-[hsl(var(--primary)/.62)]" data-testid="form-counsel" onSubmit={submitQuestion}>
                <motion.textarea
                  aria-label="Your question"
                  className="block max-h-36 min-h-[56px] w-full resize-none bg-transparent px-3 pb-9 pt-2 text-[14px] leading-6 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/.72)] focus:outline-none sm:px-4"
                  data-testid="input-question"
                  disabled={isLoading}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="What is weighing on you?"
                  ref={composerRef}
                  rows={2}
                  value={draft}
                  animate={{ minHeight: draft.length > 90 ? 76 : 56 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                />
                <div className="absolute bottom-3 left-4 font-mono text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground)/.7)]">
                  <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
                  <span className="sm:hidden">A question, honestly asked</span>
                </div>
                <motion.button
                  aria-label="Send question"
                  className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                  data-testid="button-send-question"
                  disabled={!draft.trim() || isLoading}
                  type="submit"
                  whileHover={{ scale: 1.06, rotate: -3 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {isLoading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </motion.button>
              </form>
              <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground)/.62)]">For reflection, not prescription · Your words stay in this conversation</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Counsel} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;