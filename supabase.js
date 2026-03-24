/* ============================================================
   SUPABASE.JS
   - Auth via SDK (@supabase/supabase-js)
   - Queries via REST fetch direto (mais confiável com RLS)
   ============================================================ */

const SB_URL  = 'https://hznamjsesogmcpxqxcpt.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bmFtanNlc29nbWNweHF4Y3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDUwNTAsImV4cCI6MjA4OTg4MTA1MH0.EOoDbMhrpme9YdGArB1AUpwd298z-E4ov1O5R8YJg0w';

/* SDK só para Auth e Realtime */
const { createClient } = supabase;
const db = createClient(SB_URL, SB_ANON);

/* ── Token da sessão atual ── */
async function _getToken() {
  const { data } = await db.auth.getSession();
  return data?.session?.access_token || null;
}

/* ── Headers base ── */
async function _headers(auth) {
  const h = {
    'Content-Type':  'application/json',
    'apikey':        SB_ANON,
    'Authorization': 'Bearer ' + (auth ? (await _getToken() || SB_ANON) : SB_ANON),
    'Prefer':        'return=representation'
  };
  return h;
}

/* ── Fetch helper ── */
async function _req(method, path, body, auth) {
  try {
    const res = await fetch(SB_URL + '/rest/v1/' + path, {
      method,
      headers: await _headers(auth),
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      console.error('Supabase error', res.status, path, data);
      return { data: null, error: { message: (data?.message || data?.hint || String(res.status)) } };
    }
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

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
  try {
    const { data: { user } } = await db.auth.getUser();
    return user;
  } catch { return null; }
}

/* ============================================================
   EVENTOS — ADMIN (autenticado)
   ============================================================ */
async function criarEvento(campos) {
  const user = await getUser();
  if (!user) return { data: null, error: { message: 'Não autenticado' } };
  const { data, error } = await _req('POST', 'eventos', { ...campos, admin_id: user.id }, true);
  // POST retorna array, pega primeiro
  const item = Array.isArray(data) ? data[0] : data;
  return { data: item, error };
}

async function listarEventos() {
  const user = await getUser();
  if (!user) return { data: [], error: null };
  const { data, error } = await _req('GET',
    'eventos?select=*&admin_id=eq.' + user.id + '&order=created_at.desc',
    null, true);
  return { data: data || [], error };
}

async function atualizarEvento(id, campos) {
  const { data, error } = await _req('PATCH',
    'eventos?id=eq.' + encodeURIComponent(id),
    campos, true);
  const item = Array.isArray(data) ? data[0] : data;
  return { data: item, error };
}

async function deletarEvento(id) {
  const { error } = await _req('DELETE',
    'eventos?id=eq.' + encodeURIComponent(id),
    null, true);
  return { error };
}

/* ============================================================
   EVENTOS — PÚBLICO (sem auth, para lista.html)
   ============================================================ */
async function getEvento(id) {
  const { data, error } = await _req('GET',
    'eventos?select=*&id=eq.' + encodeURIComponent(id),
    null, false);
  const item = Array.isArray(data) ? data[0] : data;
  return { data: item || null, error };
}

/* ============================================================
   JOGADORES — PÚBLICO
   ============================================================ */
async function listarJogadores(eventoId) {
  const { data, error } = await _req('GET',
    'jogadores?select=*&evento_id=eq.' + encodeURIComponent(eventoId) + '&order=created_at.asc',
    null, false);
  return { data: data || [], error };
}

async function adicionarJogador(eventoId, nome, nivel, goleiro) {
  nome = (nome || '').trim();
  if (!nome) return { data: null, error: { message: 'nome vazio' } };

  /* Checa duplicado */
  const { data: exist } = await _req('GET',
    'jogadores?select=id&evento_id=eq.' + encodeURIComponent(eventoId) +
    '&nome=ilike.' + encodeURIComponent(nome),
    null, false);
  if (exist && exist.length > 0) return { data: null, error: { message: 'duplicado' } };

  const { data, error } = await _req('POST', 'jogadores', {
    evento_id:  eventoId,
    nome,
    nivel:      nivel  || 1,
    goleiro:    goleiro || false,
    pago:       false,
    confirmado: true
  }, false);
  const item = Array.isArray(data) ? data[0] : data;
  return { data: item, error };
}

async function removerJogador(jogadorId) {
  const { error } = await _req('DELETE',
    'jogadores?id=eq.' + encodeURIComponent(jogadorId),
    null, false);
  return { error };
}

async function atualizarJogador(jogadorId, campos) {
  const { data, error } = await _req('PATCH',
    'jogadores?id=eq.' + encodeURIComponent(jogadorId),
    campos, false);
  const item = Array.isArray(data) ? data[0] : data;
  return { data: item, error };
}

/* ============================================================
   REALTIME (SDK)
   ============================================================ */
function subscreverEvento(eventoId, callback) {
  return db
    .channel('jog_' + eventoId)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'jogadores',
      filter: 'evento_id=eq.' + eventoId
    }, callback)
    .subscribe();
}

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

function renderStars(nivel) {
  nivel = nivel || 1;
  return [1,2,3].map(i =>
    '<span class="star ' + (i <= nivel ? 'filled' : '') + '">★</span>'
  ).join('');
}

function showToast(msg, tipo) {
  tipo = tipo || 'ok';
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast toast-' + tipo + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

function setLoading(show, msg) {
  const el = document.getElementById('loadingOverlay');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  const txt = el.querySelector('.loading-txt');
  if (txt) txt.textContent = msg || 'Carregando...';
}
