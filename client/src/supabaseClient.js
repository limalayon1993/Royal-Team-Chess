import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client;

try {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase URL or Anon Key');
    }
    console.log('[SupabaseClient] Init URL:', supabaseUrl);
    console.log('[SupabaseClient] Init Key (Start):', supabaseAnonKey.substring(0, 10) + '...');
    client = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
    console.error('Supabase Initialization Failed:', err);
    // Fallback Mock to allow App to render error states instead of blank screen
    client = {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => ({ error: { message: "Supabase Init Failed" } }),
            signUp: async () => ({ error: { message: "Supabase Init Failed" } }),
            signOut: async () => ({ error: null }),
        },
        from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: "Supabase Init Failed" } }) }) })
        })
    };
}

export const supabase = client;
