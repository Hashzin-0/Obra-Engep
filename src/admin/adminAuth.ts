import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Isolated OAuth storage: exchanging the admin session never signs the user out of the main app.
export const adminAuthClient = url && publishableKey
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: true,
        storageKey: 'obra-engep-admin-oauth',
      },
    })
  : null;
