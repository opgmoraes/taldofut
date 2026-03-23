/* ============================================================
   SUPABASE.JS — Config central + helpers de Auth e DB
   Projeto: taldofut | opgmoraes.github.io/taldofut
   ============================================================ */

const SUPABASE_URL  = 'https://hznamjsesogmcpxqxcpt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bmFtanNlc29nbWNweHF4Y3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwNTAsImV4cCI6MjA4OTg4MTA1MH0.EOoDbMhrpme9YdGArB1AUpwd298z-E4ov1O5R8YJg0w';

/* ── Carrega o SDK do Supabase via CDN ── */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ============================================================
   AUTH
   ============================================================ */

async function authSignUp(email, senha) {
  const { data, error } = await db.auth.signUp({ email, password: senha });
  return { data, error };
}

async function authSignIn(email, senha) {
  const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
  return { data, error };
}

async function authSignOut() {
  await db.auth.signOut();
}

async function authResetPassword(email) {
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://opgmoraes.github.io/taldofut/admin.html'
  });
  return { error };
}

async function getUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

/* ============================================================
   EVENTOS
   ============================================================ */

async function criarEvento(campos) {
  const user = await getUser();
  const { data, error } = await db.from('eventos').insert({
    ...campos,
    admin_id: user.id
  }).select().single();
  return { data, error };
}

async function listarEventos() {
  const user = await getUser();
  const { data, error } = await db
    .from('eventos')
    .select('*')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function getEvento(id) {
  const { data, error } = await db.from('eventos').select('*').eq('id', id).single();
  return { data, error };
}

async function atualizarEvento(id, campos) {
  const { data, error } = await db.from('eventos').update(campos).eq('id', id).select().single();
  return { data, error };
}

async function deletarEvento(id) {
  const { error } = await db.from('eventos').delete().eq('id', id);
  return { error };
}

/* ============================================================
   JOGADORES
   ============================================================ */

async function listarJogadores(eventoId) {
  const { data, error } = await db
    .from('jogadores')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

async function adicionarJogador(eventoId, nome, nivel, goleiro = false) {
  nome = nome.trim();
  // Checa duplicado
  const { data: exist } = await db
    .from('jogadores')
    .select('id')
    .eq('evento_id', eventoId)
    .ilike('nome', nome)
    .maybeSingle();
  if (exist) return { error: { message: 'duplicado' } };

  const { data, error } = await db.from('jogadores').insert({
    evento_id: eventoId, nome, nivel, goleiro, pago: false, confirmado: true
  }).select().single();
  return { data, error };
}

async function removerJogador(jogadorId) {
  const { error } = await db.from('jogadores').delete().eq('id', jogadorId);
  return { error };
}

async function atualizarJogador(jogadorId, campos) {
  const { data, error } = await db.from('jogadores').update(campos).eq('id', jogadorId).select().single();
  return { data, error };
}

/* ============================================================
   SORTEIO — lógica equilibrada por estrelas
   ============================================================ */

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sorteia times equilibrados por nível de estrelas.
 * Jogadores que sobram completam um time extra (banco/reserva).
 * @param {Array}  jogadores  - lista completa (inclui goleiros já filtrados fora)
 * @param {number} numTimes
 * @returns {{ times, reservas }}
 */
function sortearTimesEquilibrado(jogadores, numTimes) {
  const linha = jogadores.filter(j => !j.goleiro);
  if (linha.length === 0) return { times: [], reservas: [] };

  // Ordena por nível desc, embaralha dentro do mesmo nível (snake draft)
  const nivel3 = shuffleArr(linha.filter(j => j.nivel === 3));
  const nivel2 = shuffleArr(linha.filter(j => j.nivel === 2));
  const nivel1 = shuffleArr(linha.filter(j => j.nivel === 1));
  const ordenados = [...nivel3, ...nivel2, ...nivel1];

  // Quantos cabem nos times principais
  const totalPrincipal = Math.floor(linha.length / numTimes) * numTimes;
  const principal = ordenados.slice(0, totalPrincipal);
  const sobras    = ordenados.slice(totalPrincipal);

  // Monta times via snake draft (equilibra estrelas)
  const times = Array.from({ length: numTimes }, (_, i) => ({
    nome: `Time ${String.fromCharCode(65 + i)}`,
    cor: CORES_TIMES[i % CORES_TIMES.length],
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

  // Sobras formam time extra
  let reservas = [];
  if (sobras.length > 0) {
    if (sobras.length >= 2) {
      times.push({
        nome: `Time ${String.fromCharCode(65 + numTimes)}`,
        cor: CORES_TIMES[numTimes % CORES_TIMES.length],
        jogadores: sobras,
        totalEstrelas: sobras.reduce((s, j) => s + (j.nivel || 1), 0),
        extra: true
      });
    } else {
      reservas = sobras;
    }
  }

  return { times, reservas };
}

const CORES_TIMES = [
  '#16a34a','#2563eb','#d97706','#dc2626',
  '#7c3aed','#0891b2','#ea580c','#db2777'
];

/* ============================================================
   UTILITÁRIOS GLOBAIS
   ============================================================ */

function gerarId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function getParam(nome) {
  return new URLSearchParams(window.location.search).get(nome);
}

function formatBRL(v) {
  return parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderStars(nivel = 1) {
  return [1,2,3].map(i => `<span class="star ${i <= nivel ? 'filled' : ''}">★</span>`).join('');
}

function showToast(msg, tipo = 'ok') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast toast-${tipo} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function setLoading(show, msg = 'Carregando...') {
  const el = document.getElementById('loadingOverlay');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  const txt = el.querySelector('.loading-txt');
  if (txt) txt.textContent = msg;
}

/* ── Realtime subscription helper ── */
function subscreverEvento(eventoId, callback) {
  return db
    .channel(`jogadores_${eventoId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'jogadores',
      filter: `evento_id=eq.${eventoId}`
    }, callback)
    .subscribe();
}
