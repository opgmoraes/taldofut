/* =============================================
   LISTA DE FUTEBOL — SCRIPT.JS
   Lógica central compartilhada
   ============================================= */

// ─── STORAGE HELPERS ───────────────────────────────────────────────

/** Retorna todos os eventos salvos */
function getAllEvents() {
  return JSON.parse(localStorage.getItem('futEvents') || '{}');
}

/** Salva todos os eventos */
function saveAllEvents(events) {
  localStorage.setItem('futEvents', JSON.stringify(events));
}

/** Retorna um evento pelo ID */
function getEvent(id) {
  const all = getAllEvents();
  return all[id] || null;
}

/** Salva/atualiza um evento */
function saveEvent(evento) {
  const all = getAllEvents();
  all[evento.id] = evento;
  saveAllEvents(all);
}

/** Gera ID único simples */
function gerarId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ─── FUNÇÕES DE JOGADOR ─────────────────────────────────────────────

/**
 * Adiciona jogador ao evento
 * @param {string} eventoId
 * @param {string} nome
 * @param {number} nivel - 1, 2 ou 3 estrelas
 */
function addPlayer(eventoId, nome, nivel = 1) {
  const evt = getEvent(eventoId);
  if (!evt) return false;

  nome = nome.trim();
  if (!nome) return false;

  // Verifica duplicado
  const existe = evt.jogadores.find(j => j.nome.toLowerCase() === nome.toLowerCase());
  if (existe) return 'duplicado';

  evt.jogadores.push({ nome, pago: false, goleiro: false, nivel });
  saveEvent(evt);
  return true;
}

/**
 * Remove jogador pelo nome
 * @param {string} eventoId
 * @param {string} nome
 */
function removePlayer(eventoId, nome) {
  const evt = getEvent(eventoId);
  if (!evt) return false;
  evt.jogadores = evt.jogadores.filter(j => j.nome !== nome);
  saveEvent(evt);
  return true;
}

/**
 * Alterna status de pagamento
 * @param {string} eventoId
 * @param {string} nome
 */
function togglePagamento(eventoId, nome) {
  const evt = getEvent(eventoId);
  if (!evt) return;
  const jogador = evt.jogadores.find(j => j.nome === nome);
  if (jogador) {
    jogador.pago = !jogador.pago;
    saveEvent(evt);
  }
}

/**
 * Alterna se é goleiro
 * @param {string} eventoId
 * @param {string} nome
 */
function toggleGoleiro(eventoId, nome) {
  const evt = getEvent(eventoId);
  if (!evt) return;
  const jogador = evt.jogadores.find(j => j.nome === nome);
  if (jogador) {
    jogador.goleiro = !jogador.goleiro;
    saveEvent(evt);
  }
}

/**
 * Atualiza o nível (estrelas) de um jogador
 * @param {string} eventoId
 * @param {string} nome
 * @param {number} nivel - 1 a 3
 */
function setNivel(eventoId, nome, nivel) {
  const evt = getEvent(eventoId);
  if (!evt) return;
  const jogador = evt.jogadores.find(j => j.nome === nome);
  if (jogador) {
    jogador.nivel = nivel;
    saveEvent(evt);
  }
}

// ─── SORTEIO ────────────────────────────────────────────────────────

/**
 * Embaralha um array (Fisher-Yates)
 * @param {Array} arr
 * @returns {Array} novo array embaralhado
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sorteia times ignorando goleiros
 * @param {string} eventoId
 * @param {number} numTimes
 * @returns {Array} lista de times [{nome, jogadores}]
 */
function sortearTimes(eventoId, numTimes) {
  const evt = getEvent(eventoId);
  if (!evt) return [];

  const linha = evt.jogadores.filter(j => !j.goleiro);
  if (linha.length < numTimes) return null; // Jogadores insuficientes

  const embaralhados = shuffle(linha);
  const times = Array.from({ length: numTimes }, (_, i) => ({
    nome: `Time ${String.fromCharCode(65 + i)}`, // Time A, B, C...
    cor: CORES_TIMES[i % CORES_TIMES.length],
    jogadores: []
  }));

  embaralhados.forEach((jogador, idx) => {
    times[idx % numTimes].jogadores.push(jogador);
  });

  return times;
}

// Cores para os cards dos times
const CORES_TIMES = [
  '#22a050', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'
];

// ─── UTILITÁRIOS ────────────────────────────────────────────────────

/** Mostra notificação toast */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/** Copia texto para clipboard */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ Link copiado!');
  } catch {
    showToast('⚠️ Não foi possível copiar');
  }
}

/** Renderiza estrelas HTML (somente leitura) */
function renderStars(nivel = 1) {
  let html = '';
  for (let i = 1; i <= 3; i++) {
    html += `<span class="star ${i <= nivel ? 'filled' : ''}">★</span>`;
  }
  return html;
}

/** Formata moeda BRL */
function formatBRL(valor) {
  return parseFloat(valor || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });
}

/** Lê parâmetro da URL */
function getParam(nome) {
  return new URLSearchParams(window.location.search).get(nome);
}
