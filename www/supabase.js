const SUPABASE_URL = "https://qmfnnykocjmwemsbinhf.supabase.co";

const SUPABASE_KEY = "TA_CLE_ANON_ICI";

window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
