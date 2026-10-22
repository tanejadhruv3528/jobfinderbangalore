// Turns raw Supabase, Auth and network errors into messages a visitor can act on.
// The raw text still goes to the console for debugging.

type ErrorLike = { message?: string; code?: string; status?: number };

const pick = (error: unknown): ErrorLike =>
  typeof error === 'object' && error !== null ? (error as ErrorLike) : { message: String(error ?? '') };

const isOffline = (message: string) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) ||
  /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message);

export const OFFLINE_MESSAGE = "You seem to be offline. Check your internet connection and try again.";
export const GENERIC_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';

/** Errors from signing in, signing up or resending the confirmation email. */
export const friendlyAuthError = (error: unknown): string => {
  const { message = '', code, status } = pick(error);
  const text = message.toLowerCase();

  if (isOffline(message)) return OFFLINE_MESSAGE;
  if (code === 'invalid_credentials' || text.includes('invalid login credentials'))
    return "That email and password don't match. Check for typos and try again.";
  if (code === 'email_not_confirmed' || text.includes('email not confirmed'))
    return 'Please confirm your email first. Click the link we sent you, or resend it below.';
  if (code === 'user_already_exists' || code === 'email_exists' || text.includes('already registered'))
    return 'An account with this email already exists. Sign in instead.';
  if (code === 'weak_password' || text.includes('password should'))
    return 'That password is too weak. Use a longer one that mixes letters and numbers.';
  if (code === 'email_address_invalid' || text.includes('invalid format') || text.includes('is invalid'))
    return "That doesn't look like a valid email address.";
  if (status === 429 || code?.startsWith('over_') || text.includes('rate limit'))
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (code === 'signup_disabled') return 'New sign-ups are paused right now. Please try again later.';
  // Our database rules (temporary email or an alias of an existing account) surface as this
  if (text.includes('database error saving new user'))
    return "We couldn't create this account. Use your own work email, or sign in if you already have an account.";
  return GENERIC_MESSAGE;
};

/** Errors from reading, posting or deleting jobs. */
export const friendlyDataError = (error: unknown, action: 'load' | 'post' | 'delete'): string => {
  const { message = '', code, status } = pick(error);
  const text = message.toLowerCase();

  if (isOffline(message)) return OFFLINE_MESSAGE;
  if (status === 401 || code === 'PGRST301' || text.includes('jwt'))
    return 'Your session has expired. Please sign in again.';
  if (code === '42501' || text.includes('row-level security') || text.includes('permission denied'))
    return action === 'delete'
      ? "You can only delete jobs you posted."
      : 'Your session has expired. Please sign in again.';
  if (code === '23514' || code === '22001' || text.includes('check constraint') || text.includes('too long'))
    return 'Some details are too long or in the wrong format. Please check the form and try again.';
  if (text.includes('not found or not yours')) return 'This job was already removed, or it belongs to another account.';
  return {
    load: "We couldn't load jobs right now. Please refresh the page.",
    post: "We couldn't post your job. Please try again in a moment.",
    delete: "We couldn't delete this job. Please try again.",
  }[action];
};
