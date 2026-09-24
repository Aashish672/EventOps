import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, Mail } from 'lucide-react';

export const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-50)' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '1.5rem', textAlign: 'center' }}>
                    {isSignUp ? 'Create an Account' : 'Sign in to EventOps'}
                </h2>

                {error && (
                    <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', border: '1px solid var(--gray-200)', borderRadius: '4px', fontSize: '0.875rem' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <KeyRound size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', border: '1px solid var(--gray-200)', borderRadius: '4px', fontSize: '0.875rem' }}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                        {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    style={{ width: '100%', textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
            </div>
        </div>
    );
};
