
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.1/+esm';

// Configurações do projeto Supabase fornecidas pelo utilizador
const supabaseUrl = 'https://olpqtbhelgpgkepaajek.supabase.co';
const supabaseAnonKey = 'sb_publishable_s3uqbp0yWV--qXdNc5AHkQ_YRRYO1RI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
