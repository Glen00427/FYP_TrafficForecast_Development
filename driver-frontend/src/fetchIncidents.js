// driver-frontend/src/fetchIncidents.js
import { supabase } from './lib/supabaseClient';

export async function fetchIncidents() {
    const { data, error } = await supabase
        .from('incidents')
        .select('*');

    if (error) {
        console.error('Error fetching incidents:', error.message);
        return [];
    }

    return data || [];
}
