import React, { useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { signInUser, signUpUser, signInWithGoogle } from '@/lib/supabase';
import { CurrencyCode } from '@/types';
import { CURRENCY_SYMBOLS } from '@/lib/currency';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Mascot } from '@/components/ui/Mascot';
import { Modal } from '@/components/ui/Modal';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('EGP');

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOauthGuideOpen, setIsOauthGuideOpen] = useState(false);

  // Email/Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { user, error } = await signInUser(email, password);
        if (error) {
          setErrorMsg(error);
        } else if (user) {
          onAuthSuccess();
        }
      } else {
        const { user, error } = await signUpUser(
          email,
          password,
          displayName.trim() || 'User',
          currency
        );
        if (error) {
          setErrorMsg(error);
        } else if (user) {
          setSuccessMsg('Account created successfully! Launching your workspace...');
          setTimeout(() => {
            onAuthSuccess();
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Flow
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.toLowerCase().includes('provider is not enabled') || error.toLowerCase().includes('unsupported provider')) {
          setErrorMsg(
            'Google Sign-In is awaiting provider activation in your Supabase project. Click "OAuth Setup Guide" below to view the 2-minute setup steps, or sign in using email/password.'
          );
        } else {
          setErrorMsg(error);
        }
        setIsGoogleLoading(false);
      }
      // If no error, browser redirects to Google OAuth consent page
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google OAuth failed to initialize.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-emerald-500/10">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header with Mascot */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <Mascot mood={isLoading || isGoogleLoading ? 'loading' : 'idle'} size="lg" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Spendly</h1>
          <p className="text-xs text-muted-foreground font-medium">
            Personal Finance Workspace • Verified Cloud Sync
          </p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 sm:p-8 shadow-xl border-border/80 backdrop-blur-sm bg-card/95">
          {/* Tabs: Sign In / Create Account */}
          <div className="grid grid-cols-2 p-1 bg-secondary rounded-xl mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Official Google OAuth Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-secondary/70 active:scale-[0.98] transition-all text-xs sm:text-sm font-semibold text-foreground shadow-sm mb-5 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGoogleLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-2.5 text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">
              Or with email
            </span>
            <div className="border-t border-border w-full" />
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex flex-col gap-1.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
              {errorMsg.includes('OAuth Setup Guide') && (
                <button
                  type="button"
                  onClick={() => setIsOauthGuideOpen(true)}
                  className="text-xs font-bold underline text-left mt-1 ms-6 hover:opacity-80"
                >
                  View Google OAuth configuration guide
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                placeholder="e.g. Mohamed Hossam"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {mode === 'signup' && (
              <Select
                label="Default Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                options={Object.keys(CURRENCY_SYMBOLS).map((c) => ({
                  value: c,
                  label: `${c} (${CURRENCY_SYMBOLS[c as CurrencyCode].symbol})`,
                }))}
              />
            )}

            <Button
              type="submit"
              className="w-full font-bold shadow-md shadow-emerald-600/20 mt-2"
              isLoading={isLoading}
            >
              <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
              <ArrowRight className="h-4 w-4 ms-1.5" />
            </Button>
          </form>

          {/* OAuth Setup Info Link */}
          <div className="pt-4 mt-4 border-t border-border/70 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Need help with sign in?</span>
            <button
              type="button"
              onClick={() => setIsOauthGuideOpen(true)}
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <HelpCircle className="h-3 w-3" />
              <span>OAuth Details</span>
            </button>
          </div>
        </Card>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground text-center">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>Secured with PostgreSQL Row Level Security (RLS)</span>
        </div>
      </div>

      {/* Google OAuth Documentation Modal */}
      <Modal
        isOpen={isOauthGuideOpen}
        onClose={() => setIsOauthGuideOpen(false)}
        title="Google OAuth & Authentication Setup"
      >
        <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
          <p>
            Spendly uses genuine <strong className="text-foreground">Supabase Authentication</strong> with standard OAuth 2.0 PKCE flow.
          </p>

          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/80 space-y-2">
            <h4 className="font-bold text-foreground text-xs">To enable Google Sign-In for your Supabase project:</h4>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                Visit the <a href="https://supabase.com/dashboard/project/fdtinjhomdpxzcvfmsev/auth/providers" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline inline-flex items-center gap-0.5">Supabase Auth Providers Dashboard <ExternalLink className="h-2.5 w-2.5" /></a>.
              </li>
              <li>Toggle the <strong>Google</strong> provider to <strong>Enabled</strong>.</li>
              <li>
                Create OAuth 2.0 Client Credentials in the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="h-2.5 w-2.5" /></a>.
              </li>
              <li>
                Add the Authorized Redirect URI shown in your Supabase dashboard:
                <code className="block mt-1 p-1.5 bg-background rounded border text-[11px] font-mono break-all text-foreground select-all">
                  https://fdtinjhomdpxzcvfmsev.supabase.co/auth/v1/callback
                </code>
              </li>
              <li>Paste the <strong>Client ID</strong> and <strong>Client Secret</strong> into Supabase and click Save.</li>
            </ol>
          </div>

          <p>
            Email and password authentication is completely active and tested right now. You can create an account or sign in immediately using any valid email.
          </p>

          <div className="pt-2 flex justify-end">
            <Button size="sm" onClick={() => setIsOauthGuideOpen(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
