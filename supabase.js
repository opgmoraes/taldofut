const SUPABASE_URL  = 'https://hznamjsesogmcpxqxcpt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bmFtanNlc29nbWNweHF4Y3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwNTAsImV4cCI6MjA4OTg4MTA1MH0.EOoDbMhrpme9YdGArB1AUpwd298z-E4ov1O5R8YJg0w';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── UI HELPERS ─────────────────────────────────────────────────── */

function setLoading(show, txt = 'Carregando...') {
  const el = document.getElementById('loadingOverlay');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  const t = el.querySelector('.loading-txt');
  if (t) t.textContent = txt;
}

function showToast(msg, tipo = 'ok') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast show toast-' + tipo;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

function renderStars(nivel = 1) {
  let html = '';
  for (let i = 1; i <= 3; i++)
    html += `<span class="star ${i <= nivel ? 'filled' : ''}">★</span>`;
  return html;
}

/* ── AUTH ────────────────────────────────────────────────────────── */

async function getUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

async function authSignIn(email, senha) {
  return await db.auth.signInWithPassword({ email, password: senha });
}

async function authSignUp(email, senha) {
  return await db.auth.signUp({ email, password: senha });
}

async function authResetPassword(email) {
  return await db.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://opgmoraes.github.io/taldofut/admin.html'
  });
}

async function authSignOut() {
  return await db.auth.signOut();
}

/* ── EVENTOS ─────────────────────────────────────────────────────── */

async function criarEvento(campos) {
  const user = await getUser();
  if (!user) return { error: { message: 'Não logado' } };
  return await db.from('eventos').insert([{ ...campos, admin_id: user.id }]).select().single();
}

async function listarEventos() {
  const user = await getUser();
  if (!user) return { data: [] };
  return await db.from('eventos').select('*').eq('admin_id', user.id).order('created_at', { ascending: false });
}

async function getEvento(id) {
  if (!id) return { error: { message: 'ID ausente' } };
  return await db.from('eventos').select('*').eq('id', id).maybeSingle();
}

async function atualizarEvento(id, campos) {
  return await db.from('eventos').update(campos).eq('id', id);
}

async function deletarEvento(id) {
  return await db.from('eventos').delete().eq('id', id);
}

/* ── JOGADORES ───────────────────────────────────────────────────── */

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

async function atualizarJogador(id, campos) {
  return await db.from('jogadores').update(campos).eq('id', id);
}

async function removerJogador(jogadorId) {
  return await db.from('jogadores').delete().eq('id', jogadorId);
}

/* ── REALTIME ────────────────────────────────────────────────────── */

function subscreverEvento(eventoId, callback) {
  return db.channel(`jogadores_${eventoId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'jogadores',
      filter: `evento_id=eq.${eventoId}`
    }, callback)
    .subscribe();
}

/* ── SORTEIO ─────────────────────────────────────────────────────── */

const CORES_TIMES = [
  '#22a050', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'
];

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sorteia times equilibrados por nível de estrelas.
 * Retorna { times: [...], reservas: [...] }
 */
function sortearTimesEquilibrado(jogadores, numTimes) {
  const linha = jogadores.filter(j => !j.goleiro);

  // Separa por nível e embaralha cada grupo
  const por_nivel = { 3: [], 2: [], 1: [] };
  linha.forEach(j => (por_nivel[j.nivel || 1] || por_nivel[1]).push(j));
  [3, 2, 1].forEach(n => (por_nivel[n] = _shuffle(por_nivel[n])));

  // Fila: nível 3 → 2 → 1 (distribui os mais fortes primeiro)
  const fila = [...por_nivel[3], ...por_nivel[2], ...por_nivel[1]];

  const times = Array.from({ length: numTimes }, (_, i) => ({
    nome: `Time ${String.fromCharCode(65 + i)}`,
    cor: CORES_TIMES[i % CORES_TIMES.length],
    jogadores: [],
    totalEstrelas: 0,
    extra: false
  }));

  const porTime = Math.floor(fila.length / numTimes);
  const jogNormais = fila.slice(0, porTime * numTimes);
  const reservas   = fila.slice(porTime * numTimes);

  // Distribui em snake draft (1→N→1) para equilibrar estrelas
  let dir = 1, idx = 0;
  jogNormais.forEach(j => {
    times[idx].jogadores.push(j);
    times[idx].totalEstrelas += j.nivel || 1;
    idx += dir;
    if (idx >= numTimes) { idx = numTimes - 1; dir = -1; }
    else if (idx < 0)    { idx = 0;             dir =  1; }
  });

  // Se sobrar jogadores, cria times extras de 1 em 1
  const extras = [];
  reservas.forEach((j, i) => {
    if (!extras[i]) extras[i] = {
      nome: `Time ${String.fromCharCode(65 + numTimes + i)}`,
      cor: CORES_TIMES[(numTimes + i) % CORES_TIMES.length],
      jogadores: [], totalEstrelas: 0, extra: true
    };
    extras[i].jogadores.push(j);
    extras[i].totalEstrelas += j.nivel || 1;
  });

  return { times: [...times, ...extras], reservas: [] };
}

/* ── UTILITÁRIOS ─────────────────────────────────────────────────── */

function gerarId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function formatBRL(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getParam(nome) {
  return new URLSearchParams(window.location.search).get(nome);
}
