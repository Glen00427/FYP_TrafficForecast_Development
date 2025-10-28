// driver-frontend/src/fetchIncidents.js
import { supabase } from './lib/supabaseClient';

// App.js will call this function to fetch incidents
export async function fetchIncidents() {
    const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_dt', { ascending: false }); // newest first

    if (error) {
        console.error('Error fetching incidents:', error.message);
        return [];
    }

    return data || [];
}
