import { createClient } from '@supabase/supabase-js';

// Configuration: Try process.env or hardcoded fallbacks
const supabaseUrl = process.env.SUPABASE_URL || 'https://dhrqdmlirqxxqdixliox.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocnFkbWxpcnF4eHFkaXhsaW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTM4MzUsImV4cCI6MjA4MTE2OTgzNX0.dMouZCxCe-T4k46A6-cVZDhCWZ1THXV6UszqugyRHPg';

if (!supabaseAnonKey) {
  console.warn("Supabase Anon Key is missing.");
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);