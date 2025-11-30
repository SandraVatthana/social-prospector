import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ceozrxjpwwtxufkqrghr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlb3pyeGpwd3d0eHVma3FyZ2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NDU1ODAsImV4cCI6MjA4MDAyMTU4MH0.Z8k3PY5pkIa1JWs-2m7hM10deSMUsPe3FhOmFjuxs_8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
