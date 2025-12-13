import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recoveryMode, setRecoveryMode] = useState(false);

    useEffect(() => {
        let mounted = true;

        // Initialize via Event Listener (more reliable for cached sessions)
        // Initialize via getSession for immediate persistence check, with safety timeout
        // Initialize via getSession for immediate persistence check
        const initializeAuth = async () => {
            try {
                // Standard Supabase Session Check without aggressive timeouts
                const { data, error } = await supabase.auth.getSession();

                if (data?.session) {
                    if (mounted) {
                        console.log('[AuthContext] Session found on init:', data.session.user.email);
                        setSession(data.session);
                        setUser(data.session.user);
                    }
                } else if (error) {
                    throw error;
                }
            } catch (err) {
                console.warn('[AuthContext] Session init failed:', err.message);
            } finally {
                if (mounted) {
                    setLoading(false); // Stop loading regardless of session result
                }
            }
        };

        initializeAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AuthContext] Auth State Change: ${event}`, session?.user?.email);
            // For simplicity, we can just trigger a re-check or duplicate logic.
            // But usually simpler to just update state if we trust initial verify.
            // Given the ZOMBIE issues, let's be safe.

            if (session?.user) {
                // Quick verify again for new sessions
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', session.user.id)
                    .single();

                if (!profile) {
                    console.warn('[AuthStateChange] Profile missing. Attempting auto-fix in background...');
                    // AUTO-FIX (Safe, non-blocking)
                    const serverUrl = 'http://localhost:3000'; // Force Localhost for fixes
                    fetch(`${serverUrl}/api/admin/force-verify-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: session.user.email })
                    }).catch(e => console.error(e));
                }
            }

            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (!session) setLoading(false); // Immediate ready if logout
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email, password, username) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                },
            },
        });
        if (error) throw error;

        // AUTO-VERIFY & FIX ELO
        if (data?.user) {
            setTimeout(async () => {
                // FORCE LOCALHOST for dev environment fixes
                const serverUrl = 'http://localhost:3000';

                try {
                    console.log('[Auth] Auto-verifying email for:', email);
                    await fetch(`${serverUrl}/api/admin/force-verify-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                } catch (e) {
                    console.error('[Auth] Auto-verify failed:', e);
                }

                try {
                    console.log('[Auth] Requesting server to fix ELO for:', username);
                    await fetch(`${serverUrl}/api/fix-elo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username })
                    });
                } catch (e) {
                    console.error('[Auth] Error calling fix-elo API:', e);
                }
            }, 1000);
        }

        return data;
    };

    const signIn = async (email, password) => {
        console.log('[AuthContext] Signing in... (Simple Mode)');

        // Direct call, no timeout race
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        console.log('[AuthContext] Login Result:', { user: data?.user?.id, error });

        if (error) {
            console.error('[AuthContext] Login Failed:', error);
            throw error;
        }

        // Quick Profile Check
        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .single();

            if (!profile) {
                console.warn('[AuthContext] Warning: Profile missing. Server fix might be needed.');
            }
        }

        return data;
    };

    const signOut = async () => {
        console.log('[AuthContext] Signing out...');

        // 1. Attempt Supabase SignOut (Best Effort)
        try {
            // Don't await indefinitely. If network sucks, just kill the session locally.
            const { error } = await Promise.race([
                supabase.auth.signOut(),
                new Promise((resolve) => setTimeout(() => resolve({ error: 'Timeout' }), 2000))
            ]);
            if (error) console.warn('[AuthContext] Supabase signOut warning:', error);
        } catch (e) {
            console.warn('[AuthContext] Supabase signOut exception:', e);
        }

        // 2. Clear Local State only
        console.log('[AuthContext] Clearing Session State...');

        // 3. Reset Internal State
        setSession(null);
        setUser(null);

        // 4. Force Page Reload to ensure a clean slate (sockets, cache, etc)
        window.location.href = '/';
    };

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redirect back to the app
        });
        if (error) throw error;
        return data;
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    };

    const value = {
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        user,
        session,
        loading,
        recoveryMode,
        setRecoveryMode
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
