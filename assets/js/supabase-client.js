// Supabase client — shared by every page.
// Publishable key is safe to ship in the frontend; RLS enforces access.
const SUPABASE_URL = 'https://mcmyvlnptqxsgkoxqbhn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qbi_j0Oz_0VC6eoiwWWR0g_CSokt_uo';

// `window.supabase` is the library global from the CDN; keep our client under
// a distinct name to avoid shadowing/redeclaring it.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
