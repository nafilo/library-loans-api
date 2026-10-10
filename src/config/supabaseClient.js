import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key || url.includes('YOUR_PROJECT_REF') || key.includes('YOUR_SUPABASE')) {
    throw new Error('Isi SUPABASE_URL dan SUPABASE_KEY di .env / Vercel Environment Variables.');
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return client;
}
