import { createClient } from "@supabase/supabase-js";

// 🔒 For prototyping only: hardcode public (anon) creds.
const SUPABASE_URL = "https://wesscwzrsuyiqdeccysm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc3Njd3pyc3V5aXFkZWNjeXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzEwOTMsImV4cCI6MjA3MzE0NzA5M30.5BRLFWRcKaQlNUpOPRwVjP51M3kXaDH4YadqwY5Qmx0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// second supabase testing for incidents from LTA
const SUPABASE_URL_SECOND = "https://vxistpqjjavwykdsgeur.supabase.co";
const SUPABASE_KEY_SECOND = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aXN0cHFqamF2d3lrZHNnZXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA4MzM1NCwiZXhwIjoyMDc0NjU5MzU0fQ.GRM1XlBOGpcm8Wh4CqmbdCudEwDp97RVOzvxeanrxYs";

export const supabase_second = createClient(SUPABASE_URL_SECOND, SUPABASE_KEY_SECOND);
