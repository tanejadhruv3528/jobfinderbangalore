import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Building2, Check, CircleAlert, Eye, EyeOff, Loader2, Lock, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { friendlyAuthError } from '@/lib/errors';
import { supabase } from '@/integrations/supabase/client';

const EMAIL_PATTERN = /^[^@\s]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

type Problem = { field?: 'email' | 'password' | 'companyName'; message: string; canResend?: boolean; canSignIn?: boolean };

/** Asks the database whether this email can sign up; null when the check itself fails. */
const checkSignupEmail = async (email: string) => {
  const { data, error } = await supabase.rpc('check_signup_email', { email });
  return error ? null : data;
};

const PERKS = [
  'Free to post, live on the map in seconds',
  'Reach people who live and commute near you',
  'Candidates apply straight to your own link',
];

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  ) : null;

/** Decorative map with a few pins, drawn for the brand panel. */
const BrandMap = () => (
  <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
    <g stroke="hsl(0 0% 100% / 0.12)" strokeWidth="10" fill="none" strokeLinecap="round">
      <path d="M-20 210 C 80 190, 140 120, 230 130 S 360 80, 430 60" />
      <path d="M60 -20 C 90 80, 70 160, 120 320" />
      <path d="M260 -20 C 250 90, 300 170, 290 320" />
    </g>
    <g stroke="hsl(0 0% 100% / 0.06)" strokeWidth="4" fill="none">
      <path d="M-20 80 L 430 110" />
      <path d="M-20 260 L 430 240" />
      <path d="M170 -20 L 190 320" />
      <path d="M340 -20 L 360 320" />
    </g>
    <circle cx="300" cy="200" r="46" fill="hsl(150 40% 40% / 0.18)" />
    {[
      [118, 150, true],
      [232, 112, false],
      [292, 196, false],
      [190, 236, false],
      [338, 92, false],
    ].map(([x, y, big], i) => (
      <g key={i} transform={`translate(${x as number - (big ? 17 : 12)} ${y as number - (big ? 42 : 30)}) scale(${big ? 1 : 0.7})`}>
        <path
          d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8c0 10.6 13.2 22 14.4 23a1.7 1.7 0 0 0 2.2 0c1.2-1 14.4-12.4 14.4-23C32.5 8.3 25.6 1.5 17 1.5Z"
          fill={big ? 'hsl(var(--primary))' : 'hsl(0 0% 100% / 0.9)'}
          stroke="hsl(230 26% 5%)"
          strokeWidth="2.5"
        />
        <circle cx="17" cy="16.5" r="5" fill={big ? '#fff' : 'hsl(230 26% 5%)'} />
      </g>
    ))}
  </svg>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signIn, signUp, resendConfirmation } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/my-jobs';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (login: boolean) => {
    setIsLogin(login);
    setProblem(null);
    setNotice(null);
  };

  // Catch the common mistakes before anything is sent
  const validate = (): Problem | null => {
    const trimmed = email.trim();
    if (!isLogin && companyName.trim().length < 2) return { field: 'companyName', message: 'Enter your company name.' };
    if (!isLogin && companyName.trim().length > 100) return { field: 'companyName', message: 'Keep the company name under 100 characters.' };
    if (!trimmed) return { field: 'email', message: 'Enter your email address.' };
    if (!EMAIL_PATTERN.test(trimmed)) return { field: 'email', message: "That doesn't look like a valid email address. Check for typos." };
    if (!password) return { field: 'password', message: 'Enter your password.' };
    if (!isLogin && password.length < 6) return { field: 'password', message: 'Use at least 6 characters for your password.' };
    if (!isLogin && password.length > 72) return { field: 'password', message: 'Keep your password under 72 characters.' };
    if (!isLogin && password.trim().toLowerCase() === trimmed.toLowerCase())
      return { field: 'password', message: "Your password can't be the same as your email." };
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const invalid = validate();
    setProblem(invalid);
    if (invalid) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const notConfirmed = error.code === 'email_not_confirmed' || /not confirmed/i.test(error.message);
          setProblem({ message: friendlyAuthError(error), canResend: notConfirmed });
        } else {
          toast({ title: 'Welcome back!', description: 'You are signed in.' });
        }
        return;
      }

      // Friendly answers for temporary emails and existing accounts. The database
      // enforces the same rules, so a failed check doesn't block a real sign-up.
      const verdict = await checkSignupEmail(email.trim());
      if (verdict === 'invalid') {
        setProblem({ field: 'email', message: "That doesn't look like a valid email address. Check for typos." });
        return;
      }
      if (verdict === 'disposable') {
        setProblem({ field: 'email', message: "Temporary email addresses aren't allowed. Please use your work or personal email." });
        return;
      }
      if (verdict === 'taken') {
        setProblem({ field: 'email', message: 'An account with this email already exists.', canSignIn: true });
        return;
      }

      const { error, needsConfirmation, alreadyRegistered } = await signUp(email, password, companyName);
      if (error) {
        setProblem({ message: friendlyAuthError(error) });
      } else if (alreadyRegistered) {
        setProblem({ field: 'email', message: 'An account with this email already exists.', canSignIn: true });
      } else if (needsConfirmation) {
        switchMode(true);
        setNotice(`We sent a confirmation link to ${email.trim()}. Click it, then sign in here.`);
      } else {
        toast({ title: 'Account created!', description: 'Your employer account is ready.' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      setProblem({ message: friendlyAuthError(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    const { error } = await resendConfirmation(email);
    setIsLoading(false);
    if (error) {
      setProblem({ message: friendlyAuthError(error), canResend: true });
    } else {
      setProblem(null);
      setNotice(`We sent a new confirmation link to ${email.trim()}. It can take a minute to arrive, so check spam too.`);
    }
  };

  const fieldProblem = (field: Problem['field']) => (problem?.field === field ? problem.message : undefined);

  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-[hsl(230_26%_5%)] lg:flex lg:flex-col">
        <div className="bg-paper-grid absolute inset-0" />
        <div className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]" />
        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Logo />
          <div className="my-auto max-w-md py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">For employers</p>
            <h1 className="mt-4 text-5xl font-bold leading-[1.02] xl:text-6xl">
              Hire people who live <span className="text-gradient">around the corner.</span>
            </h1>
            <ul className="mt-8 space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-[15px] text-foreground/75">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div className="-mx-10 -mb-10 h-64 xl:-mx-14 xl:-mb-14">
            <BrandMap />
          </div>
        </div>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>

        <div className="mx-auto my-auto w-full max-w-[400px] py-10">
          <h2 className="text-4xl font-bold leading-tight">{isLogin ? 'Welcome back' : 'Start hiring nearby'}</h2>
          <p className="mt-2 text-muted-foreground">
            {isLogin ? 'Sign in to manage your job listings.' : 'Create a free employer account in under a minute.'}
          </p>

          <div className="mt-8 grid grid-cols-2 rounded-full bg-secondary p-1" role="tablist">
            {[
              ['Sign in', true],
              ['Create account', false],
            ].map(([label, login]) => (
              <button
                key={label as string}
                type="button"
                role="tab"
                aria-selected={isLogin === login}
                onClick={() => switchMode(login as boolean)}
                className={cn(
                  'h-10 rounded-full text-sm font-semibold transition-all',
                  isLogin === login ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            {!isLogin && (
              <div className="animate-fade-up space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                  aria-invalid={!!fieldProblem('companyName')}
                  aria-describedby={fieldProblem('companyName') ? 'companyName-error' : undefined}
                    placeholder="Acme Pvt Ltd"
                    value={companyName}
                    onChange={(e) => { setCompanyName(e.target.value); setProblem(null); }}
                    className="pl-10"
                    autoComplete="organization"
                    maxLength={100}
                  />
                </div>
                <FieldError id="companyName-error" message={fieldProblem('companyName')} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  aria-invalid={!!fieldProblem('email')}
                  aria-describedby={fieldProblem('email') ? 'email-error' : undefined}
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setProblem(null); }}
                  className="pl-10"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                />
              </div>
              <FieldError id="email-error" message={fieldProblem('email')} />
              {problem?.field === 'email' && problem.canSignIn && (
                <button type="button" onClick={() => switchMode(true)} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  Sign in instead
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  aria-invalid={!!fieldProblem('password')}
                  aria-describedby={fieldProblem('password') ? 'password-error' : undefined}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setProblem(null); }}
                  className="pl-10 pr-11"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  maxLength={72}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError id="password-error" message={fieldProblem('password')} />
            </div>

            {problem && !problem.field && (
              <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p>{problem.message}</p>
                  {problem.canResend && (
                    <button type="button" onClick={handleResend} disabled={isLoading} className="mt-1.5 font-semibold text-primary underline-offset-4 hover:underline">
                      Resend confirmation email
                    </button>
                  )}
                </div>
              </div>
            )}

            {notice && (
              <div role="status" className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <p>{notice}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign in' : 'Create account'}
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Looking for a job?{' '}
            <button type="button" onClick={() => navigate('/')} className="font-semibold text-foreground underline-offset-4 hover:underline">
              Browse the map
            </button>
            . No account needed.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
