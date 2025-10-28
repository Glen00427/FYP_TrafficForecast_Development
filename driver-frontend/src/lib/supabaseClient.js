// driver-frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://umkvacgyqkjgdbijaohd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVta3ZhY2d5cWtqZ2RiaWphb2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MzQ1MTUsImV4cCI6MjA3NzIxMDUxNX0.5PvdpdzMtr6QV8ArCnovMgdJsd1btQ--y7ZAoGORM_k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
