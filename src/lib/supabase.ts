import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return (window as any).ENV[key] || '';
  }
  return import.meta.env[key] || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Use placeholders if not configured to avoid client initialization errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

