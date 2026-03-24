const SUPABASE_URL  = 'https://hznamjsesogmcpxqxcpt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bmFtanNlc29nbWNweHF4Y3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwNTAsImV4cCI6MjA4OTg4MTA1MH0.EOoDbMhrpme9YdGArB1AUpwd298z-E4ov1O5R8YJg0w';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* --- AUTH --- */
async function authSignUp(email, senha) { return await db.auth.signUp({ email, password: senha }); }
async function authSignIn(email, senha) { return await db.auth.signInWithPassword({ email, password: senha }); }
async function authSignOut() { await db.auth.signOut(); }
async function getUser() { const { data: { user } } = await db.auth.getUser(); return user; }

/* --- EVENTOS --- */
async function criarEvento(campos) {
  const user = await getUser();
  if (!user) return { error: { message: "Admin não autenticado" } };
  return await db.from('eventos').insert([{ ...campos, admin_id: user.id }]).select().single();
}

async function listarEventos() {
  const user = await getUser();
  if (!user) return { data: [] };
  return await db.from('eventos').select('*').eq('admin_id', user.id).order('created_at', { ascending: false });
}

async function getEvento(id) {
  // Busca pública (essencial para lista.html não dar erro 400)
  return await db.from('eventos').select('*').eq('id', id).maybeSingle();
}

async function atualizarEvento(id, campos) { return await db.from('eventos').update(campos).eq('id', id).select().single(); }
async function deletarEvento(id) { return await db.from('eventos').delete().eq('id', id); }

/* --- JOGADORES --- */
async function listarJogadores(eventoId) {
  return await db.from('jogadores').select('*').eq('evento_id', eventoId).order('created_at', { ascending: true });
}

async function adicionarJogador(eventoId, nome, nivel, goleiro = false) {
  nome = nome.trim();
  const { data: exist } = await db.from('jogadores').select('id').eq('evento_id', eventoId).ilike('nome', nome).maybeSingle();
  if (exist) return { error: { message: 'duplicado' } };
  return await db.from('jogadores').insert({ evento_id: eventoId, nome, nivel, goleiro }).select().single();
}

async function removerJogador(jogadorId) { return await db.from('jogadores').delete().eq('id', jogadorId); }
async function atualizarJogador(jogadorId, campos) { return await db.from('jogadores').update(campos).eq('id', jogadorId).select().single(); }

/* --- UTILITÁRIOS --- */
function gerarId() { return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function formatBRL(v) { return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function renderStars(nivel = 1) { return [1,2,3].map(i => `<span class="star ${i <= nivel ? 'filled' : ''}">★</span>`).join(''); }

function showToast(msg, tipo = 'ok') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = `toast toast-${tipo} show`;
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function setLoading(show, msg = 'Carregando...') {
  const el = document.getElementById('loadingOverlay');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  const txt = el.querySelector('.loading-txt');
  if (txt) txt.textContent = msg;
}

function subscreverEvento(eventoId, callback) {
  return db.channel(`jogadores_${eventoId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores', filter: `evento_id=eq.${eventoId}` }, callback).subscribe();
}

/* --- LÓGICA DE SORTEIO --- */
function sortearTimesEquilibrado(jogadores, numTimes) {
  const linha = jogadores.filter(j => !j.goleiro);
  const nivel3 = shuffleArr(linha.filter(j => j.nivel === 3));
  const nivel2 = shuffleArr(linha.filter(j => j.nivel === 2));
  const nivel1 = shuffleArr(linha.filter(j => j.nivel === 1));
  const ordenados = [...nivel3, ...nivel2, ...nivel1];

  const totalPrincipal = Math.floor(linha.length / numTimes) * numTimes;
  const principal = ordenados.slice(0, totalPrincipal);
  const sobras = ordenados.slice(totalPrincipal);

  const times = Array.from({ length: numTimes }, (_, i) => ({
    nome: `Time ${String.fromCharCode(65 + i)}`,
    cor: ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2'][i % 6],
    jogadores: [],
    totalEstrelas: 0
  }));

  let direcao = 1, idx = 0;
  principal.forEach((j, pos) => {
    times[idx].jogadores.push(j);
    times[idx].totalEstrelas += (j.nivel || 1);
    if (pos % numTimes === numTimes - 1) direcao *= -1;
    idx = Math.max(0, Math.min(numTimes - 1, idx + direcao));
  });

  return { times, reservas: sobras };
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
