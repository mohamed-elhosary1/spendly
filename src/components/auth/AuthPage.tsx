import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Shield,
  Coins,
} from 'lucide-react';
import { signInUser, signUpUser } from '@/lib/supabase';
import { CurrencyCode } from '@/types';
import { CURRENCY_SYMBOLS } from '@/lib/currency';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
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
          setSuccessMsg('Account created successfully! Signing in...');
          setTimeout(() => {
            onAuthSuccess();
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick test demo account login helper
  const handleDemoSignIn = async () => {
    setEmail('demo@spendly.com');
    setPassword('spendly1234');
    setIsLoading(true);
    setErrorMsg(null);

    // Try signin, if fails, signup then signin
    const signInRes = await signInUser('demo@spendly.com', 'spendly1234');
    if (signInRes.user) {
      setIsLoading(false);
      onAuthSuccess();
      return;
    }

    // Attempt create demo
    const signUpRes = await signUpUser('demo@spendly.com', 'spendly1234', 'Ahmed Demo', 'EGP');
    if (signUpRes.user) {
      setIsLoading(false);
      onAuthSuccess();
      return;
    }

    setIsLoading(false);
    setErrorMsg(signUpRes.error || signInRes.error || 'Demo login failed.');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-emerald-500/10">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Spendly</h1>
          <p className="text-xs text-muted-foreground font-medium">
            Personal Finance Workspace • Online Cloud Sync
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

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
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
                label="Your Full Name"
                placeholder="e.g. Karim Ahmed"
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

          {/* Quick Demo Login Option */}
          <div className="pt-5 mt-5 border-t border-border/70 text-center">
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={isLoading}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Click here to sign in with a 1-click Demo Account
            </button>
          </div>
        </Card>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground text-center">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>Secured with PostgreSQL Row Level Security (RLS)</span>
        </div>
      </div>
    </div>
  );
};
