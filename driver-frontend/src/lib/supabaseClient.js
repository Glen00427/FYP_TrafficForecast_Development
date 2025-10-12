import { createClient } from "@supabase/supabase-js";

// 🔒 For prototyping only: hardcode public (anon) creds.
const SUPABASE_URL = "https://wesscwzrsuyiqdeccysm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc3Njd3pyc3V5aXFkZWNjeXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzEwOTMsImV4cCI6MjA3MzE0NzA5M30.5BRLFWRcKaQlNUpOPRwVjP51M3kXaDH4YadqwY5Qmx0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
