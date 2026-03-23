# ⚽ TAL DO FUT — Guia de Configuração

## 📁 Estrutura de arquivos

```
taldofut/
├── index.html    ← Página inicial
├── admin.html    ← Painel do admin (requer login)
├── lista.html    ← Área do jogador (link público)
├── style.css     ← Estilos
├── supabase.js   ← Config + toda a lógica de banco
├── SETUP.sql     ← Script para criar as tabelas
└── LEIA-ME.md    ← Este arquivo
```

---

## 🗄️ PASSO 1 — Rodar o SQL no Supabase

1. Acesse seu projeto: https://supabase.com/dashboard
2. No menu lateral: **SQL Editor**
3. Clique em **"New query"**
4. Cole o conteúdo do arquivo `SETUP.sql`
5. Clique em **Run** (▶️)

Isso cria as tabelas `eventos` e `jogadores` com todas as regras de segurança.

---

## ⚙️ PASSO 2 — Ativar Realtime

Para que a lista atualize ao vivo em todos os dispositivos:

1. No Supabase: **Database → Replication**
2. Em "Tables", marque ✅ `jogadores` e ✅ `eventos`
3. Salve

---

## 🔐 PASSO 3 — Configurar Auth

1. No Supabase: **Authentication → URL Configuration**
2. Em **Site URL**: `https://opgmoraes.github.io`
3. Em **Redirect URLs**: adicione `https://opgmoraes.github.io/taldofut/admin.html`
4. Em **Authentication → Settings**: desative "Confirm email" para facilitar (toggle OFF)

---

## 🐙 PASSO 4 — Subir para o GitHub Pages

1. Vá no repositório: https://github.com/opgmoraes/taldofut (ou crie)
2. Faça upload de todos os arquivos da pasta `taldofut/`
3. Vá em **Settings → Pages → Branch: main → Save**
4. Seu site estará em: **https://opgmoraes.github.io/taldofut/**

---

## 📱 COMO USAR NO DIA A DIA

### Admin:
1. Acesse `https://opgmoraes.github.io/taldofut/admin.html`
2. Crie sua conta com email + senha
3. Crie um evento, copie o link gerado
4. Mande o link no grupo do WhatsApp
5. Gerencie pagamentos, sorteie times e publique para os jogadores

### Jogadores:
- Abrem o link recebido
- Digitam o nome, escolhem nível ⭐ e se são goleiros
- Confirmam presença
- Veem a lista, times sorteados e QR Code do Pix

---

## ✨ FUNCIONALIDADES

- 🔐 Auth com email/senha + recuperação de senha
- 👥 Lista em tempo real (todos veem ao mesmo tempo)
- ⭐ Nível de jogador (1-3 estrelas)
- 🧤 Jogadores podem se marcar como goleiros
- 🎲 Sorteio equilibrado por nível + times extras para os que sobram
- 📢 Admin publica times para os jogadores verem
- 💰 QR Code Pix gerado automaticamente
- 📲 Lembrete via WhatsApp com um clique
- ⚠️ Alerta de lista com poucos jogadores
- ✅ Confirmação de presença
- ⏱ Contagem regressiva para o jogo
- 🔄 Atualização em tempo real (Supabase Realtime)
