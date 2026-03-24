const SUPABASE_URL  = 'https://hznamjsesogmcpxqxcpt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bmFtanNlc29nbWNweHF4Y3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwNTAsImV4cCI6MjA4OTg4MTA1MH0.EOoDbMhrpme9YdGArB1AUpwd298z-E4ov1O5R8YJg0w';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* --- AUTH --- */
async function authSignUp(email, senha) { return await db.auth.signUp({ email, password: senha }); }
async function authSignIn(email, senha) { return await db.auth.signInWithPassword({ email, password: senha }); }
async function authSignOut() { await db.auth.signOut(); }
async function getUser() { 
    const { data: { user }, error } = await db.auth.getUser(); 
    if (error) return null;
    return user; 
}

/* --- EVENTOS --- */
async function criarEvento(campos) {
  const user = await getUser();
  if (!user) return { error: { message: "Você precisa estar logado." } };

  // O erro 400 ocorria porque o banco não reconhecia as colunas ou o formato do objeto.
  // Enviamos como um array [ {...} ] para garantir compatibilidade.
  const { data, error } = await db
    .from('eventos')
    .insert([
      { 
        ...campos, 
        admin_id: user.id 
      }
    ])
    .select()
    .single();

  return { data, error };
}

async function listarEventos() {
  const user = await getUser();
  if (!user) return { data: [] };
  return await db.from('eventos').select('*').eq('admin_id', user.id).order('created_at', { ascending: false });
}

async function getEvento(id) {
  return await db.from('eventos').select('*').eq('id', id).maybeSingle();
}

/* --- JOGADORES --- */
async function listarJogadores(eventoId) {
  return await db.from('jogadores').select('*').eq('evento_id', eventoId).order('created_at', { ascending: true });
}

async function adicionarJogador(eventoId, nome, nivel, goleiro = false) {
  const { data: exist } = await db.from('jogadores').select('id').eq('evento_id', eventoId).ilike('nome', nome.trim()).maybeSingle();
  if (exist) return { error: { message: 'duplicado' } };
  return await db.from('jogadores').insert([{ evento_id: eventoId, nome: nome.trim(), nivel, goleiro }]).select().single();
}

async function atualizarJogador(jogadorId, campos) { 
    return await db.from('jogadores').update(campos).eq('id', jogadorId).select().single(); 
}

async function removerJogador(jogadorId) { 
    return await db.from('jogadores').delete().eq('id', jogadorId); 
}

/* --- UTILITÁRIOS --- */
function gerarId() { return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function formatBRL(v) { return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function renderStars(nivel = 1) { return [1,2,3].map(i => `<span class="star ${i <= nivel ? 'filled' : ''}">★</span>`).join(''); }

function subscreverEvento(eventoId, callback) {
  return db.channel(`jogadores_${eventoId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores', filter: `evento_id=eq.${eventoId}` }, callback)
    .subscribe();
}
