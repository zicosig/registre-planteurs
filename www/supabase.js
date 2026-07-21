// Connexion Supabase Registre Planteurs

const SUPABASE_URL = "https://qmfnnykocjmwemsbinhf.supabase.co";

const SUPABASE_KEY = "sb_publishable_GfjFAsmjicRFYwIBRfsNwg_Cs2xKm1v";


window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
