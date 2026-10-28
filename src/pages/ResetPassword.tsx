import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleAlert, Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/brand/Logo';
import { friendlyAuthError } from '@/lib/errors';

/** Where the emailed reset link lands: Supabase signs the visitor in from the link, then they pick a new password. */
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // The link's token is read from the URL on load; give it a moment before calling the link dead
  useEffect(() => {
    if (loading || user) return;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get('error_code') || hash.get('error')) {
      setLinkExpired(true);
      return;
    }
    const timer = setTimeout(() => setLinkExpired(true), 2500);
    return () => clearTimeout(timer);
  }, [loading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setProblem('Use at least 6 characters for your new password.');
    if (password.length > 72) return setProblem('Keep your password under 72 characters.');
    if (password !== confirm) return setProblem("The two passwords don't match.");
    if (user && password.trim().toLowerCase() === user.email.toLowerCase())
      return setProblem("Your password can't be the same as your email.");

    setProblem(null);
    setIsSaving(true);
    const { error } = await updatePassword(password);
    setIsSaving(false);
    if (error) {
      setProblem(friendlyAuthError(error));
      return;
    }
    toast({ title: 'Password updated', description: 'You are signed in with your new password.' });
    navigate('/my-jobs', { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-5 py-6 sm:px-10">
      <Logo />
      <div className="mx-auto my-auto w-full max-w-[400px] py-10">
        <KeyRound className="h-6 w-6 text-primary" aria-hidden="true" />

        {!user && linkExpired ? (
          <>
            <h1 className="mt-6 text-4xl font-bold leading-tight">This link has expired</h1>
            <p className="mt-2 text-muted-foreground">
              Reset links work once and only for a short time. Ask for a new one and use the latest email.
            </p>
            <Button size="lg" className="mt-8 w-full" asChild>
              <Link to="/auth?mode=forgot">
                Send a new link
                <ArrowRight />
              </Link>
            </Button>
          </>
        ) : !user ? (
          <div className="mt-10 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking your reset link…
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-4xl font-bold leading-tight">Choose a new password</h1>
            <p className="mt-2 text-muted-foreground">
              For <span className="font-semibold text-foreground">{user.email}</span>
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setProblem(null); }}
                    className="pl-10 pr-11"
                    autoComplete="new-password"
                    maxLength={72}
                    autoFocus
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

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Repeat new password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setProblem(null); }}
                    className="pl-10"
                    autoComplete="new-password"
                    maxLength={72}
                  />
                </div>
              </div>

              {problem && (
                <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {problem}
                </p>
              )}

              <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <>Save new password<ArrowRight /></>}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
