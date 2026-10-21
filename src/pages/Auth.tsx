import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Building2, Check, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

const PERKS = [
  'Free to post, live on the map in seconds',
  'Reach people who live and commute near you',
  'Candidates apply straight to your own link',
];

/** Decorative map with a few pins, drawn for the brand panel. */
const BrandMap = () => (
  <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
    <g stroke="hsl(var(--ink-foreground) / 0.14)" strokeWidth="10" fill="none" strokeLinecap="round">
      <path d="M-20 210 C 80 190, 140 120, 230 130 S 360 80, 430 60" />
      <path d="M60 -20 C 90 80, 70 160, 120 320" />
      <path d="M260 -20 C 250 90, 300 170, 290 320" />
    </g>
    <g stroke="hsl(var(--ink-foreground) / 0.07)" strokeWidth="4" fill="none">
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
          fill={big ? 'hsl(var(--primary))' : 'hsl(var(--ink-foreground))'}
          stroke="hsl(var(--ink))"
          strokeWidth="2.5"
        />
        <circle cx="17" cy="16.5" r="5" fill={big ? '#fff' : 'hsl(var(--ink))'} />
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
  const { user, signIn, signUp } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/my-jobs';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
        }
      } else {
        const { error, needsConfirmation } = await signUp(email, password, companyName);
        if (error) {
          toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
        } else if (needsConfirmation) {
          toast({
            title: 'Check your email',
            description: 'We sent you a link to confirm your account. Click it, then sign in.',
          });
          setIsLogin(true);
        } else {
          toast({ title: 'Account created!', description: 'Your employer account has been created.' });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink text-ink-foreground lg:flex lg:flex-col">
        <div className="bg-map-grid absolute inset-0" />
        <div className="relative flex h-full flex-col p-10 xl:p-14">
          <Logo inverted />
          <div className="my-auto max-w-md py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">For employers</p>
            <h1 className="mt-4 text-5xl font-bold leading-[1.02] xl:text-6xl">
              Hire people who live around the corner.
            </h1>
            <ul className="mt-8 space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-[15px] text-ink-foreground/80">
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
                onClick={() => setIsLogin(login as boolean)}
                className={cn(
                  'h-10 rounded-full text-sm font-semibold transition-all',
                  isLogin === login ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <div className="animate-fade-up space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    placeholder="Acme Pvt Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10"
                    autoComplete="organization"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-11"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
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
            </div>

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
