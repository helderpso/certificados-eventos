
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.1/+esm';

// Substitua estas variáveis pelas credenciais do seu projeto Supabase
// Em produção, estas viriam de process.env.SUPABASE_URL e process.env.SUPABASE_ANON_KEY
const supabaseUrl = 'https://seu-projeto.supabase.co';
const supabaseAnonKey = 'sua-chave-anonima';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
