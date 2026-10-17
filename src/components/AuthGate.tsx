import React, { useEffect, useState } from 'react';
import { supabase } from '../data/store';
import { SHOP } from '../config/shopBrand';

type AuthState = 'loading' | 'signedOut' | 'signedIn';

interface AuthGateProps {
  /** Rendered once signed in. Gets a sign-out function (undefined when there's no database). */
  children: (signOut?: () => void) => React.ReactNode;
}

/**
 * Keeps the shop app behind the shop's login. Without Supabase configured
 * (local dev) there is nothing to protect, so it renders straight through.
 */
export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(supabase ? 'loading' : 'signedIn');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setState(data.session ? 'signedIn' : 'signedOut'));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? 'signedIn' : 'signedOut');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return <>{children()}</>;
  if (state === 'loading') return null;
  if (state === 'signedOut') return <LoginScreen />;

  const client = supabase;
  return <>{children(() => client.auth.signOut())}</>;
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Wrong email or password.'
          : `Couldn't sign in: ${signInError.message}`
      );
      setBusy(false);
      return;
    }

    // A valid login that hasn't been added to shop_users would see an empty app; say so instead.
    const { data: allowed, error: checkError } = await supabase.rpc('is_shop_user');
    if (checkError || !allowed) {
      await supabase.auth.signOut();
      setError(
        checkError
          ? `Signed in, but couldn't check access: ${checkError.message}`
          : "This login works but hasn't been given access to the shop yet. Add it to shop_users (see docs/shop-setup.md)."
      );
    }
    setBusy(false);
  };

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.logo}>{SHOP.name}</div>
        <p style={styles.sub}>Shop login</p>

        <label style={styles.label}>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoFocus
            required
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
        </label>

        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}

        <button type="submit" style={{ ...styles.button, ...(busy ? { opacity: 0.6 } : {}) }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '32px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--amber)',
  },
  sub: {
    color: 'var(--muted)',
    marginTop: '-8px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  input: {
    minHeight: '60px',
    padding: '0 16px',
    fontSize: '18px',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    outline: 'none',
  },
  error: {
    padding: '12px 14px',
    fontSize: '15px',
    color: 'var(--text)',
    border: '1px solid var(--orange)',
    borderLeft: '4px solid var(--orange)',
    borderRadius: '8px',
  },
  button: {
    minHeight: '60px',
    marginTop: '8px',
    fontSize: '18px',
    fontWeight: 700,
    backgroundColor: 'var(--amber)',
    color: 'var(--text-on-accent)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
