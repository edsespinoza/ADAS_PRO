# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Comandos de Desenvolvimento

```bash
npm run build        # Gera js/supabase-config.js a partir de .env.local (obrigatório antes de abrir no browser)
npm run dev          # Gera config + inicia servidor estático em http://localhost:3000
```

**Primeiro uso:** copiar `.env.example` para `.env.local` e preencher:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SITE_URL=https://adaspro.com.br   # usado pela Edge Function notify (CORS origin)
DEMO_ENABLED=true                 # omitir ou false em produção
```

> `.env.example` já existe no repo como template — `.env.local` nunca deve ser commitado.

`scripts/build-config.js` lê `.env.local` e escreve `js/supabase-config.js`. **Nunca editar `supabase-config.js` manualmente** — sobrescrito a cada build. Se `SUPABASE_URL` ou `SUPABASE_ANON_KEY` estiverem ausentes, o script sai sem sobrescrever o arquivo existente.

`js/supabase-config.js` **não está no `.gitignore`** — é commitado intencionalmente com a anon key (exposta por design; segurança via RLS). Localmente, qualquer execução de `npm run build` o sobrescreve com os valores do `.env.local` (a condição é `NODE_ENV !== 'production'`, não apenas a flag `--dev`). No Vercel (`NODE_ENV=production`), `.env.local` é ignorado e as variáveis do painel são usadas.

`DEMO_ENABLED` padrão é `true` quando a variável não está definida (`DEMO_ENABLED !== 'false'`). Em produção, definir `DEMO_ENABLED=false` no painel do Vercel.

Deploy via Vercel: o `buildCommand` em `vercel.json` é `npm install && npm run build`.

---

## Supabase Edge Functions

**Pré-requisito:** `supabase link --project-ref zqydyyticvtmirjzskly` (uma vez por máquina — já executado se `supabase/.temp/linked-project.json` existir).

```bash
supabase functions deploy <nome-da-função>
```

| Function | Finalidade |
|---|---|
| `approve-user/` | Aprovação/bloqueio/atualização de usuário — actions: `approve \| block \| unblock \| update \| delete \| create` |
| `get-download-url/` | Valida JWT + permissões + `moduleAccess` + `accessLevel`/`downloadLevel` por item (CONTENT_MAP), retorna URL assinada (1h) e registra em `audit_logs` |
| `notify/` | Dispara emails via Resend API — events: `new_user \| user_approved \| ticket_reply` |

A função `notify` requer env vars no Supabase Dashboard → Edge Functions → notify: `RESEND_API_KEY`, `ADMIN_EMAIL`, `SITE_URL`. Ver pendências abertas em `bug.md` (#24).

**CORS:** `approve-user` e `get-download-url` têm CORS hardcoded para `https://adaspro.com.br` — chamadas de `localhost:3000` são bloqueadas pelo browser. Testar via URL de preview do Vercel ou com um proxy. A função `notify` lê o CORS origin do env var `SITE_URL`.

**Sincronização obrigatória:** `CONTENT_MAP` em `supabase/functions/get-download-url/index.ts` deve ser mantido em sincronia com `DEFAULT_CONTENT` em `js/auth.js`. Adicionar um novo PDF requer editar ambos os arquivos e fazer deploy da função — do contrário, o download falha em produção com 404.

---

## SQL e Banco de Dados

**Pré-requisito:** mesmo link acima (`supabase link`).

```bash
supabase db query --linked -f sql/<arquivo>.sql
```

- `rls_policies.sql` — Todas as políticas RLS. **Qualquer mudança de acesso a dados requer atualização aqui.** Inclui `SECURITY DEFINER`: `get_my_role()`, `is_admin()`, `is_superadmin()`. Também cria a tabela `settings` (key/value jsonb — contém `moduleAccess`).
  - `users_update`: `USING` exige `auth.uid() = id OR (public.is_admin() AND public.can_manage_role(role))` — no USING, `role` é a **role atual** da linha, então admin/gestor não alcança linha com role >= à sua; `WITH CHECK` (role **nova**) impede promoção a role >= própria. Mudanças em auth/permissões devem manter essa semântica.
- `audit_logs.sql` — Tabela e triggers de auditoria.
- `storage_setup.sql` — Bucket `materiais` (privado, 50 MB) com RLS.
- `settings_table.sql` — Script standalone da tabela `settings` + RLS (idempotente). A mesma DDL/políticas está em `rls_policies.sql` (executar inteiro mantém tudo consistente).

**`settings` e `moduleAccess`:** configurações globais ficam na tabela `public.settings` (row `key='app'`, value jsonb). `js/auth.js` carrega em `_sbLoadAll`/`_sbLoadMemberData` (merge com localStorage) e `saveSettings()` faz upsert quando `_mode==='supabase'`. RLS: SELECT p/ autenticados, write p/ admin+ (`is_admin_staff`). A autorização de conteúdo (`canViewContent`/`canDownloadContent`/`getContentForUser`) respeita `moduleAccess[cat].enabled` e `moduleAccess[cat].minLevel`; a Edge Function `get-download-url` valida a mesma config server-side. Staff (nível 4) sempre passa.

---

## Stack e Deploy

HTML/CSS/JS estático · Vercel (static hosting)  
Supabase como backend (anon key exposta por design — segurança via RLS obrigatório)  
Vercel Analytics e Speed Insights via `/_vercel/insights/script.js` (presente em todas as páginas, incluindo `email-config.html`)

`vercel.json` aplica redirects 308 e rewrites para todas as páginas (sem extensão `.html`). Também define 7 headers de segurança globais: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` e `X-XSS-Protection`. O CSP **hardcoda** `zqydyyticvtmirjzskly.supabase.co` — qualquer troca de projeto Supabase exige atualizar o CSP também.

**Nota:** `email-config.html` não está na lista de redirects/rewrites do `vercel.json` — acessada com extensão `.html` ou pelo link no sidebar dos painéis.

---

## Arquitetura de páginas

| Página | Proteção | Role mínimo |
|---|---|---|
| `index.html` | pública | — |
| `login.html` | pública | — |
| `reset-password.html` | pública | — |
| `mfa-verify.html` | pública | — |
| `membros.html` | protegida | `membro` |
| `admin.html` | protegida | `admin` |
| `superadmin.html` | protegida | `superadmin` |
| `email-config.html` | protegida | `admin` |

Páginas protegidas chamam `AUTH.init()` e depois `AUTH.requireAuth(role)` no `<script>` inicial — redirecionam para `login.html` se não houver sessão válida. A ordem de carregamento de scripts nos painéis é sempre: `supabase.min.js` → `supabase-config.js` → `auth.js` → script inline da página.

`js/supabase.min.js` é o SDK armazenado localmente (CDN removido para eliminar timeout de 30s+ em modo offline).

**`email-config.html`** — página de preview e gerenciamento dos templates de email transacional da função `notify` (new_user / user_approved / ticket_reply). Renderiza os templates inline para inspeção visual; não envia emails diretamente. A verificação de auth aceita dois formatos de sessão: `{userId,role,expiresAt}` (formato ADAS PRO) e `{access_token,expires_at}` (formato Supabase SDK). Necessário porque a página é acessível tanto em modo offline quanto online.

---

## Módulo AUTH (js/auth.js)

IIFE exposto como `window.AUTH`. É o único ponto de acesso a sessão, roles e dados de usuários/tickets.

**Dois modos de operação:**

1. **supabase** (primário): usa `SUPABASE_CONFIG` de `js/supabase-config.js`. O bloco completo (`getSession` + `_sbLoadUser` + `_sbLoadAll`) está envolvido num `Promise.race` de 5 s. Se falhar, reseta `_sbConfigured=false` e restaura sessão do `localStorage`.
2. **local/offline** (fallback): ativado por timeout ou ausência de config. Carrega dados do `localStorage` com seeds de dev. Exibe banner laranja via `AUTH.isOfflineMode()`.

**Segurança:** O flag `_sbConfigured` impede que sessão forjada no `localStorage` seja aceita quando Supabase está configurado — não remover.

**Fallback local no login Supabase:** quando Supabase está configurado e `signInWithPassword` retorna erro, **nenhum** fallback local é concedido no login (nem membros, nem roles privilegiadas) — impede bypass das credenciais reais. Sessões locais são exclusivas do modo offline (Supabase ausente). O fallback local para roles privilegiadas permanece apenas no fluxo offline e em casos de indisponibilidade de rede (onde `_sbConfigured` fica `true` mas o acesso via `localStorage` é o único caminho — sessão revalidada contra o hash local).

**Hierarquia de roles** (numérica — `hasRole(userRole, required)` compara os níveis):

```
superadmin (4) > admin (3) > gestor (2) > membro (1)
```

**Dados embutidos em `auth.js` (linhas 30–79):**
- `CATEGORIES` — 12 categorias ADAS com ícones emoji
- `DEFAULT_CONTENT` — 22 PDFs com metadados completos (id, categoria, título, `accessLevel`, `downloadLevel`, tamanho, páginas, modelos suportados). Todos têm `filePath: null` nos seeds — o `filePath` real é definido após upload via painel admin e fica persistido no estado da aplicação (localStorage em modo local, Supabase em modo online).
- `PLANS` — 4 planos (Free R$0 / Módulo R$47 / Pro R$97 / Premium R$197)
- Qualquer mudança nos planos ou catálogo exige editar esses objetos em `auth.js`

**Chaves `localStorage` usadas por auth.js:**

| Chave | Conteúdo |
|---|---|
| `adaspro_session` | Sessão cacheada — evita redirect loop quando Supabase está inacessível |
| `adaspro_users` | Usuários (modo local) |
| `adaspro_tickets` | Tickets de suporte |
| `adaspro_notifications` | Notificações |
| `adaspro_content` | Conteúdo/PDFs |
| `adaspro_articles` | Artigos editoriais |
| `adaspro_bulletins` | Boletins técnicos |
| `adaspro_settings` | Configurações |

**Senhas de seed offline** (linhas 199–200):
- `_DEMO_SA_PASS = 'ADAS_OFFLINE_SA_2026'` (superadmin)
- `_DEMO_AD_PASS = 'ADAS_OFFLINE_AD_2026'` (admin)

Esses valores devem ser **sempre diferentes** das senhas reais de produção no Supabase. Nunca atingidas em produção com Supabase acessível — não remover sem testar o modo offline.

**Padrão de fallback nas ações admin:** `_sbDirectUpdate()` tenta a Edge Function primeiro e faz fallback direto via cliente Supabase (coberto pela RLS) se a função falhar.

**Auditoria:** `AUTH.logAudit(action, targetId, details)` registra ações admin na tabela `audit_logs` do Supabase (usa `try/catch` com `await` — não `.catch()` puro).

---

## Fluxo de autenticação entre páginas

```
index.html → login.html
               ↓ doLogin() / cadastro
           AUTH.init() + AUTH.login()
               ↓ Supabase verifica getAuthenticatorAssuranceLevel()
  aal1 com MFA ativo → mfa-verify.html (AUTH.verifyMFA())
               ↓ role retornado
  membro → membros.html
  admin  → admin.html
  superadmin → superadmin.html
               ↓ esqueceu senha
           reset-password.html → Supabase email → onAuthStateChange(PASSWORD_RECOVERY)
```

O redirect pós-login usa o role da sessão. Páginas de painel verificam `AUTH.getSession()` no carregamento — se null, redirecionam para `login.html`. O `_pendingMfaUser` armazena o user da sessão parcial aal1 durante o fluxo MFA.

**reset-password.html:** usa `AUTH.onAuthStateChange()` escutando evento `PASSWORD_RECOVERY` como método principal (PKCE do Supabase v2). Fallback de parse manual do `#hash` mantido para links legados.

---

## Scripts e CSS da landing page

**JS:**
- `js/animations.js` — `typeWriter()`, `animateProgressBars()`, `dramaticCounter()` — funções globais chamadas inline no HTML
- `js/app.js` — scroll reveal via `IntersectionObserver`, navbar, FAQ accordion, counter animation (`[data-target][data-suffix]`), formulário de contato → WhatsApp (`wa.me/5511947591115`)

**Nota:** `animations.js` define funções para animação de radar/câmera ADAS, mas **não há elementos HTML correspondentes** no `index.html` — apenas os contadores de stats no hero funcionam.

**CSS:**
- `css/style.css` — estilos da landing page (`index.html`, `login.html`, `reset-password.html`, `mfa-verify.html`)
- `css/auth.css` — estilos compartilhados dos painéis protegidos (`admin.html`, `membros.html`, `superadmin.html`, `email-config.html`)

---

## Estrutura dos painéis

**`admin.html`** — seções da sidebar: Gestão / Conteúdo / Sistema. A seção de usuários (`pageUsuarios`) tem 3 abas: "Todos os Membros", "Aprovações" (com contador de pendentes) e "Equipe". Upload de PDFs disponível via dropzone no modal "Adicionar/Editar material" — chama `AUTH.uploadFile(file, path)`, gera slug do título, salva no Storage como `{categoria}/{slug}.pdf`.

**`membros.html`** — inclui aba de Boletins Técnicos (`pageBoletins`) com 4 tipos (Novidade/Atualização/Alerta/Procedimento), filtros por tipo, modal `bltModal` e funções `filterBulletins()`, `openBulletin()`, `markBulletinRead()`.

**`superadmin.html`** — inclui painel editorial (`page-editorial`) com abas Boletins/Artigos, sub-abas por status, `modalEditor` com toolbar WYSIWYG e autosave de 30s, `drawerNewUser` slide-in para criação de usuários com confirmação por e-mail digitado.

---

## Assets

- `assets/downloads/` — 23 PDFs organizados em subpastas por marca (`honda/`, `toyota/`, `nissan/`, `ford/`, `chineses/`, `demo/`, etc.). **Não deletar — substituir mantendo os nomes de arquivo.** Os `filePath` em `DEFAULT_CONTENT` (auth.js) referenciam esses caminhos.
- `assets/img/` — imagens dos sistemas ADAS (ACC, BSM, CMBS, LKA, etc.)

---

## Rastreador de tarefas

`bug.md` é o changelog oficial do projeto. Contém o histórico de bugs, fixes, decisões de arquitetura e **pendências manuais** que requerem ação fora do código. Sempre verificar antes de alterar fluxos de autenticação, segurança ou emails.

---

## Skills pré-processados (redução de tokens)

Verificar `memory/iem_tracker.md` para saber quais skills existem. Sempre preferir ler o skill antes do arquivo bruto.

| Skill | Cobre |
|---|---|
| `adas-rules` | Regras de negócio — roles, planos, permissões, RLS, invariantes críticos |
| `adas-edge-functions` | 3 Edge Functions — approve-user, get-download-url, notify |
| `adas-landing` | `index.html` — seções, hero, brands, CSS tokens |
| `adas-auth` | `js/auth.js` — modelos de dados, roles, fluxo offline |
| `adas-membros` | `membros.html` |
| `adas-admin` | `admin.html` |
| `adas-superadmin` | `superadmin.html` |

---

## IEM — Índice de Eficiência do Modelo

Fórmula e thresholds definidos no global `CLAUDE.md`. Salvar resultados em `memory/iem_tracker.md`.

---

## Testes

Não há testes automatizados neste projeto. Verificação manual via browser (dev server em `localhost:3000`) ou URL de preview do Vercel.

