# Google OAuth & Supabase Authentication Setup Guide for Spendly

This document outlines the required credentials and configuration steps to activate Google Sign-In with Supabase Auth for Spendly.

---

## 1. Architecture Overview

Spendly utilizes **Supabase Auth** with standard **OAuth 2.0 Authorization Code Flow with PKCE**.
The client initiates authentication by calling:
```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin + window.location.pathname,
  },
});
```

When authenticated, Google redirects back to Supabase's secure Auth server (`/auth/v1/callback`), which validates the token, creates or restores the user record in `auth.users`, triggers Row Level Security policies, and redirects back to Spendly.

---

## 2. Google Cloud Platform (GCP) Configuration

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project or create a new project named **Spendly**.
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   - **User Type**: External
   - **App name**: Spendly
   - **User support email**: your developer email
   - **Developer contact information**: your developer email
   - **Scopes**: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
4. Navigate to **APIs & Services** > **Credentials**:
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - **Application type**: Web application.
   - **Name**: `Spendly Web App`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (Vite dev server)
     - `https://mohamed-elhosary1.github.io` (GitHub Pages production)
   - **Authorized redirect URIs**:
     - `https://fdtinjhomdpxzcvfmsev.supabase.co/auth/v1/callback`
5. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 3. Supabase Project Configuration

1. Navigate to the [Supabase Dashboard](https://supabase.com/dashboard/project/fdtinjhomdpxzcvfmsev/auth/providers).
2. Under **Auth Providers**, locate **Google**:
   - Toggle **Enable Sign in with Google** to **ON**.
   - **Client ID**: Paste Client ID from GCP.
   - **Client Secret**: Paste Client Secret from GCP.
   - Click **Save**.
3. Under **URL Configuration** in the Supabase Auth settings:
   - **Site URL**: `https://mohamed-elhosary1.github.io/spendly/`
   - **Redirect URLs**:
     - `http://localhost:5173/*`
     - `http://localhost:5173`
     - `https://mohamed-elhosary1.github.io/spendly/*`
     - `https://mohamed-elhosary1.github.io/spendly`

---

## 4. Security & Isolation

- Google Client Secrets are stored securely in the Supabase backend and are **never exposed** in the frontend client.
- When a user signs in via Google, their record in `auth.users` receives a unique UUID.
- Spendly's PostgreSQL Row Level Security (RLS) policies immediately enforce that all financial records (`transactions`, `monthly_budgets`, `wishlist_items`, `savings_goals`, `recurring_transactions`) are strictly accessible only by `auth.uid() = user_id`.
