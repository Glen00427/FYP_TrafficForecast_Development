// driver-frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vxistpqjjavwykdsgeur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aXN0cHFqamF2d3lrZHNnZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwODMzNTQsImV4cCI6MjA3NDY1OTM1NH0.2JfYXhZuL6wKEJMZV_LRcFgAr3xguLkgegxr5V7_u1Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
