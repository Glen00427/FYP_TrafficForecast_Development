// second supabase testing for incidents from LTA
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL_SECOND = "https://vxistpqjjavwykdsgeur.supabase.co";
const SUPABASE_KEY_SECOND = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aXN0cHFqamF2d3lrZHNnZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwODMzNTQsImV4cCI6MjA3NDY1OTM1NH0.2JfYXhZuL6wKEJMZV_LRcFgAr3xguLkgegxr5V7_u1Y";

export const supabase_second = createClient(SUPABASE_URL_SECOND, SUPABASE_KEY_SECOND);
