import { supabase } from './src/services/supabaseClient';

async function check() {
    const { data, error } = await supabase
        .from('campaigns_dispara_lead_saas_02')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

check();
