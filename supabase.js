const SUPABASE_URL  = 'https://hznamjsesogmcpxqxcpt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bmFtanNlc29nbWNweHF4Y3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwNTAsImV4cCI6MjA4OTg4MTA1MH0.EOoDbMhrpme9YdGArB1AUpwd298z-E4ov1O5R8YJg0w';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* --- AUTH --- */
async function getUser() { 
    const { data: { user } } = await db.auth.getUser(); 
    return user; 
}

/* --- EVENTOS --- */
async function criarEvento(campos) {
  const user = await getUser();
  if (!user) return { error: { message: "Não logado" } };
  return await db.from('eventos').insert([{ ...campos, admin_id: user.id }]).select().single();
}

async function listarEventos() {
  const user = await getUser();
  if (!user) return { data: [] };
  return await db.from('eventos').select('*').eq('admin_id', user.id).order('created_at', { ascending: false });
}

// ESTA FUNÇÃO É A QUE FAZ A TELA DO JOGADOR FUNCIONAR
async function getEvento(id) {
  if (!id) return { error: { message: "ID ausente" } };
  return await db.from('eventos')
    .select('*')
    .eq('id', id)
    .maybeSingle(); 
}

/* --- JOGADORES --- */
async function listarJogadores(eventoId) {
  return await db.from('jogadores')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true });
}

async function adicionarJogador(eventoId, nome, nivel, goleiro = false) {
  return await db.from('jogadores')
    .insert([{ evento_id: eventoId, nome: nome.trim(), nivel, goleiro }])
    .select()
    .single();
}

async function removerJogador(jogadorId) { 
    return await db.from('jogadores').delete().eq('id', jogadorId); 
}

/* --- UTILITÁRIOS --- */
function gerarId() { return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function formatBRL(v) { return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function subscreverEvento(eventoId, callback) {
  return db.channel(`jogadores_${eventoId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores', filter: `evento_id=eq.${eventoId}` }, callback)
    .subscribe();
}
