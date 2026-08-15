# ADAS PRO — Controle de Tarefas e Melhorias

**Projeto:** ADAS PRO Platform  
**Última atualização:** 2026-08-15 (Módulo Ajuda reformulado + fix cache #84)  
**Responsável:** AutoTech Service

---

## LEGENDA

| Status | Símbolo |
|--------|---------|
| Pendente | `[ ]` |
| Em andamento | `[~]` |
| Concluído | `[x]` |
| Bloqueado | `[!]` |

---

## 🔴 CRÍTICO — Resolver antes de qualquer uso em produção

- [x] **#01 — RLS Supabase: bloquear acesso direto ao banco via anonKey** ✅ 2026-04-27
  - Script executado via CLI: `supabase db query --linked -f sql/rls_policies.sql`
  - 3 funções auxiliares SECURITY DEFINER criadas: `get_my_role()`, `is_admin()`, `is_superadmin()`
  - RLS ativo nas 3 tabelas: `users`, `tickets`, `notifications` — 12 políticas no total
  - Regra geral: usuário acessa apenas seus próprios dados; admin+ acessa tudo; DELETE em users só para superadmin
  - Arquivo: `sql/rls_policies.sql`, `js/auth.js`

- [x] **#02 — Remover senhas hardcoded do auth.js** ✅ 2026-04-25
  - Senhas de produção removidas. Seed local usa `_DEMO_AD_PASS` / `_DEMO_SA_PASS` com valores claramente diferentes dos de produção.
  - Arquivo: `js/auth.js`

- [x] **#03 — Eliminar bypass de sessão via localStorage** ✅ 2026-04-25
  - Flag `_sbConfigured` impede que sessão forjada no localStorage seja aceita quando Supabase está configurado.
  - Arquivo: `js/auth.js`

- [x] **#04 — Proteger modo Demo em produção** ✅ 2026-04-25
  - Botões de demo ocultos por padrão. Só aparecem com `SUPABASE_CONFIG.demoEnabled = true`.
  - Arquivo: `login.html`, `js/supabase-config.js`

---

## 🟠 ALTA — Resolver antes de lançamento público

- [x] **#05 — Remover firebase-config.js** ✅ 2026-04-25
  - Arquivo deletado. Nenhuma referência encontrada nos HTMLs.
  - **Pendente manual:** Revogar chaves no console Firebase → console.firebase.google.com

- [x] **#06 — Corrigir XSS — sanitizar innerHTML dinâmico** ✅ 2026-04-25
  - `welcomeMessage` e `membershipNote` convertidos para `textContent` / DOM seguro.
  - Arquivo: `membros.html`

- [x] **#07 — Validar campo 'level' no registro** ✅ 2026-04-25
  - Whitelist `VALID_LEVELS` adicionada. Valor inválido substituído por `'tecnico'`.
  - Arquivo: `js/auth.js`

- [x] **#08 — Rate limiting persistente** ✅ 2026-04-25
  - Persistência em `localStorage`. Janela: 10 min, limite: 5 tentativas.
  - Arquivo: `js/auth.js`

- [x] **#09 — Headers de segurança via vercel.json** ✅ 2026-04-25
  - CSP, X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-XSS-Protection.
  - Arquivo: `vercel.json`

---

## 🟡 MÉDIO — Melhorias de qualidade e robustez

- [x] **#10 — Corrigir lógica de hasRole() para role undefined** ✅ 2026-04-25
  - Arquivo: `js/auth.js`

- [x] **#11 — Remover enumeração de usuários no registro** ✅ 2026-04-25
  - Mensagem genérica em ambos os fluxos.
  - Arquivo: `js/auth.js`

- [x] **#12 — Validação de permissões de conteúdo no servidor (RLS no Storage)** ✅ 2026-04-27
  - Edge Function `get-download-url` deployada via CLI em 2026-04-27.
  - Valida JWT, verifica `permissions[]` server-side, retorna URL assinada (1h). Registra em `audit_logs`.

---

## 🟢 MELHORIAS — Funcionalidades e infraestrutura

- [x] **#80 — Seção Ajuda no Superadmin (subpastas Guia / Versões / Orientações)** ✅ 2026-08-15
  - Novo item "Ajuda" na sidebar (seção Suporte) → `#page-ajuda` com 3 subpastas: 📖 Guia de Uso (roles, planos, aprovação, biblioteca, editorial, tickets/MFA), 🔄 Versões & Changelog (histórico da plataforma) e 🛡️ Orientações & FAQ (segurança, regras operacionais, perguntas frequentes em accordions).
  - **Arquivo:** `superadmin.html`

- [x] **#81 — Botão "Exemplo" no Conteúdo Editorial (seed de teste)** ✅ 2026-08-15
  - Botão "🧪 Exemplo" ao lado de "+ Novo" popula conteúdo de demonstração via `seedEditorialDemo()` (3 boletins — procedimento publicado, atualização publicada, alerta rascunho — e 3 artigos — 2 publicados, 1 rascunho) usando `AUTH.addBulletin`/`addArticle`. Persistido no localStorage do browser (design atual do editorial). Confirma antes de duplicar se já existir conteúdo.
  - **+ Link "👁 Ver publicações"** no toolbar editorial → abre `membros.html?page=boletins` em nova aba (deep-link na aba Boletins do membro).
  - **+ `renderBulletinsDynamic()` no membros.html**: a aba Boletins do membro agora renderiza os boletins publicados do painel editorial (fallback para os cards estáticos quando não há conteúdo publicado).
  - **Arquivos:** `superadmin.html`, `membros.html`

- [x] **#13 — Sistema de ambientes dev/prod** ✅ 2026-04-25
  - `package.json` + `scripts/build-config.js`. Variáveis via Vercel Environment Variables.
  - `.env.example` e `.gitignore` atualizados.

- [x] **#14 — Supabase Edge Function para aprovação de usuários** ✅ 2026-04-27
  - `supabase/functions/approve-user/index.ts` deployada via CLI em 2026-04-27.
  - Valida JWT, verifica role no banco, executa com `service_role`. Suporta: `approve`, `block`, `unblock`, `update`.

- [x] **#15 — Auditoria de ações admin — tabela audit_logs** ✅ 2026-04-27
  - `sql/audit_logs.sql` executado via CLI em 2026-04-27. Tabela criada com índices + RLS.
  - `AUTH.logAudit(action, targetId, details)` ativo no `js/auth.js`.

- [x] **#16 — Autenticação 2FA para admin e superadmin** ✅ 2026-04-25
  - `mfa-verify.html` criado com OTP 6 dígitos.
  - **Pendente manual:** Configurar MFA obrigatório no Supabase Dashboard para contas admin/superadmin.

- [x] **#17 — Upload real de PDFs para Supabase Storage** ✅ 2026-04-27
  - `sql/storage_setup.sql` executado via CLI em 2026-04-27. Bucket `materiais` privado (50MB) com RLS.
  - **Pendente:** Implementar UI de upload no `admin.html`.

- [x] **#18 — Dashboard com métricas reais do Supabase** ✅ 2026-04-25
  - 4 queries paralelas ao Supabase. Fallback para `AUTH.getStats()` se indisponível.

- [x] **#19 — Notificações por email via Resend** ✅ 2026-04-27 / template redesenhado ✅ 2026-04-30
  - `supabase/functions/notify/index.ts` deployada via CLI em 2026-04-27.
  - **Template HTML redesenhado em 2026-04-30:** 3 eventos com identidade visual distinta:
    - `new_user` → acento `#FF6B35` (alert orange) — para admin, estilo alerta de ação
    - `user_approved` → acento `#06A77D` (success green) — para membro, estilo confirmação
    - `ticket_reply` → acento `#00B4D8` (tech cyan) — estilo painel técnico
  - Tipografia: `Georgia` (display) + `Courier New` (dados técnicos/IDs) — identidade automotiva
  - Preview text invisível por evento, estrutura `<table>` compatível com Outlook/Gmail
  - **Pendente manual:** Configurar env vars no Supabase Dashboard → Functions → notify:
    - `RESEND_API_KEY`
    - `ADMIN_EMAIL`
    - `SITE_URL`
  - **Pendente:** Fazer re-deploy após redesign: `supabase functions deploy notify`

- [x] **#20 — Recuperação de senha via Supabase Auth** ✅ 2026-04-25
  - `reset-password.html` criado. `AUTH.resetPassword()` e `AUTH.updatePassword()` implementados.

- [x] **#21 — Corrigir fluxo de aprovação de usuários no painel admin** ✅ 2026-04-27
  - **Causa raiz:** Edge Function `approve-user` não deployada → aprovações falhavam silenciosamente.
  - **Fix `js/auth.js`:** Helper `_sbDirectUpdate()` adicionado. Todas as ações admin tentam a Edge Function e fazem fallback direto via cliente Supabase (coberto pela RLS).
  - **Fix `admin.html`:** `saveUserPerms()` usa `approveUser` (com `approvedAt`/`approvedBy`) para usuários `pending`, e `unblockUser` para os demais.

- [x] **#22 — Corrigir erro `.catch is not a function` no logAudit** ✅ 2026-04-27
  - **Causa raiz:** Supabase JS v2 retorna `PostgrestFilterBuilder` nas queries `.from()` — objeto thenable mas sem `.catch()` nativo.
  - **Fix `js/auth.js`:** `logAudit()` convertido de `.catch(() => {})` para `try/catch` com `await`. Confirmado funcionando em produção.
  - Arquivo: `js/auth.js` — função `logAudit()`

---

## ⚠️ PENDÊNCIAS MANUAIS RESTANTES

| # | Prioridade | Ação | Onde |
|---|-----------|------|------|
| A | 🔴 Alta | Revogar token Supabase CLI usado em 2026-04-27 | supabase.com/dashboard/account/tokens |
| B | 🟠 Alta | Revogar chaves Firebase antigas | console.firebase.google.com |
| C | 🟠 Alta | Configurar env vars da função `notify`: `RESEND_API_KEY`, `ADMIN_EMAIL`, `SITE_URL` | Supabase Dashboard → Edge Functions → notify |
| D | 🟡 Médio | Ativar TOTP obrigatório para admin/superadmin no Supabase Dashboard — código pronto, só falta ativar | Supabase Dashboard → Auth → MFA Policy → Enforce for roles |
| F | 🟠 Alta | Trocar senhas de produção no Supabase Auth (AutoTech@ADAS2026! e Admin@ADAS2026! foram expostas no histórico do código) | Supabase Dashboard → Authentication → Users |
| E | 🟡 Médio | Implementar UI de upload de PDFs no `admin.html` | Código — próxima sessão |
| G | 🟠 Alta | Definir `DEMO_ENABLED=false` para desligar o modo demo no login de produção (verificado ativo em 2026-08-15) | Vercel Dashboard → Project → Settings → Environment Variables |

---

## 🔜 PRÓXIMOS TRABALHOS (backlog)

- [x] **#23 — UI de upload de PDFs no admin.html** ✅ 2026-04-28
  - Dropzone no modal "Adicionar/Editar material" com input PDF, progress bar e exibição do caminho salvo
  - `AUTH.uploadFile(file, path)` chamado de forma async; slug gerado do título (normalizado, sem acentos)
  - Path no Storage: `{categoria}/{slug}.pdf` (ex: `honda/honda-lkas-tipo-3.pdf`)
  - Badge "⬆ Storage" aparece na tabela da Biblioteca para materiais com `filePath` salvo
  - Arquivo: `admin.html`

- [x] **#26 — Corrigir acesso do superadmin à plataforma online** ✅ 2026-04-28
  - **Causa raiz 1:** Usuário `superadmin@adaspro.com.br` criado manualmente no Supabase sem campos obrigatórios (`email_verified`, tokens auth) — causava erro 500 no GoTrue durante login
  - **Fix Supabase:** Usuário recriado via Admin API; `public.users` reinserido com novo UUID `f358aafc-b359-4255-934a-fd82b012c40f`
  - **Causa raiz 2:** `superadmin.html` usava `AUTH.init().then(async session =>` — `init()` resolve com `undefined`, nunca com sessão — sempre redirecionava para login
  - **Fix `superadmin.html`:** Padrão corrigido para `AUTH.init().then(async () => { const session = AUTH.requireAuth('superadmin'); }` — igual a `admin.html` e `membros.html`
  - **Fix `js/auth.js`:** `_seedDefaultUsersLocal()` força-atualiza email, passwordHash e status dos seeds a cada carga (elimina cache desatualizado)
  - Senhas produção: superadmin `AutoTech@ADAS2026!` / admin `Admin@ADAS2026!`

- [x] **#27 — Melhorias de hierarquia nas telas de gerenciamento de acesso** ✅ 2026-04-28
  - **admin.html:** badges de role com cores (🛡️ Admin laranja / ⚙️ Gestor azul / 👤 Membro cinza), avatares coloridos por nível, seletor hierárquico visual no modal (substitui `<select>` simples), descrição de cada função, indicador de nível (Nível 1–3)
  - **superadmin.html:** painel de distribuição hierárquica (4 cards com contagem por role), coluna de nível com barra visual de 4 quadrados preenchidos por nível, ícones de role nos badges, botões de promoção com setas ↑↓ e destino explícito, ordenação por hierarquia na tabela
  - `promoteUser()` e `removeAccess()` corrigidos para usar `AUTH.updateUserRole` e `AUTH.blockUser` (antes usavam localStorage direto via `AUTH.getState()` inexistente)

- [x] **#30 — Login superadmin falha com "E-mail ou senha incorretos" em modo Supabase** ✅ 2026-04-29
  - **Causa raiz:** Sistema detecta Supabase configurado (`SUPABASE_CONFIG` válido) e redireciona 100% dos logins para `_sb.auth.signInWithPassword()`. O seed local `superadmin@adaspro.com.br` nunca é criado no Supabase Auth — existe apenas no localStorage — logo o Supabase rejeita com erro 400.
  - **Fix `js/auth.js`:** Bloco `if (error)` no path Supabase agora tenta fallback local antes de retornar erro: carrega `_loadFromLocalStorage()` + `_seedDefaultUsersLocal()`, verifica `checkHash()` e role (`superadmin|admin|gestor`). Se passar, cria sessão local e retorna `ok:true`.
  - **Credenciais locais:** `superadmin@adaspro.com.br` / `LocalDemo@SuperAdmin` — `admin@adaspro.com.br` / `LocalDemo@Admin`
  - Arquivo: `js/auth.js` — função `login()`, bloco `if (error)` do path Supabase

- [x] **#31 — Melhorias UI membros.html — Aba Tickets + Boletins Técnicos** ✅ 2026-04-29
  - **Aba Meus Tickets:** header HUD com filtros por status (Todos/Abertos/Em andamento/Resolvidos + contadores), cards `tkt-card-item` com barra lateral de prioridade colorida, número `TKT-NNN`, status badges monospace, estado vazio com arte SVG animada
  - **Modal ticketViewer:** redesenhado — `.tv-box`, avatares iniciais, timeline de mensagens membro/mentor com classes `msg-member`/`msg-admin`, indicador "aguardando resposta" animado, contador de caracteres no reply
  - **Nova aba Boletins Técnicos (`pageBoletins`):** 4 tipos com identidade visual distinta (Novidade verde / Atualização azul / Alerta vermelho / Procedimento roxo), filtros por tipo, badge `NOVO` pulsante, cards com stripe colorida e chips de marca, 4 boletins demo populados
  - **Modal `bltModal`:** header colorido por tipo, conteúdo formatado, seção "Modelos afetados", botão "Marcar como lido"
  - **Sidebar:** item "Boletins técnicos" adicionado na seção "Comunicados"
  - **JS adicionado:** `filterTickets()`, `filterBulletins()`, `openBulletin()`, `closeBulletin()`, `markBulletinRead()`; `loadMeusTickets()` e `openTicketViewer()` refatorados para novo HTML
  - Arquivo: `membros.html`

- [x] **#29 — Superadmin: Gerenciamento de Usuários + Conteúdo Editorial + Boletim Técnico** ✅ 2026-04-29
  - **Parte 1** ✅ 2026-04-28 — `js/auth.js`: novas chaves `ARTICLES_KEY`/`BULLETINS_KEY`; CRUD completo de artigos e boletins com numeração `BT-YYYY-NNN`; `createUserDirect()` com role/status/permissions
  - **Parte 2** ✅ 2026-04-29 — `superadmin.html`: `page-editorial` com abas Boletins/Artigos + sub-abas Todos/Rascunhos/Publicados/Arquivados + tabela densa com busca
  - **Parte 3** ✅ 2026-04-29 — `superadmin.html`: `modalEditor` 90% viewport com toolbar WYSIWYG, painel de metadados lateral, preview toggle e autosave 30s
  - **Parte 4** ✅ 2026-04-29 — `superadmin.html`: `drawerNewUser` slide-in com todos os campos; botão "+ Novo Usuário" conectado ao drawer; botão 🗑 em cada linha (membro/gestor/admin) chama `openDeleteUserConfirm()` com typed confirmation por e-mail

- [x] **#32 — Fallback local superadmin: "E-mail ou senha incorretos"** ✅ 2026-04-29
  - **Causa raiz:** `_DEMO_SA_PASS` estava definido como `LocalDemo@SuperAdmin` mas o usuário usa `AutoTech@ADAS2026!`. Quando Supabase falha → fallback verifica o hash local → senhas divergem → erro.
  - **Fix `js/auth.js`:** `_DEMO_SA_PASS` atualizado para `AutoTech@ADAS2026!`; `_DEMO_AD_PASS` para `Admin@ADAS2026!`. Condição de re-hash agora verifica se o hash existente ainda bate com a senha atual (`checkHash`) — se não bater, recalcula e salva.
  - Arquivo: `js/auth.js` — `_seedDefaultUsersLocal()`

- [x] **#33 — Fluxo MFA + Reset de senha: correções e melhorias** ✅ 2026-04-29
  - **MFA redirect ausente:** `login.html` sempre ia direto ao dashboard mesmo com MFA ativado. Fix: `AUTH.login()` agora checa `getAuthenticatorAssuranceLevel()` — se `nextLevel === 'aal2'` e sessão ainda em `aal1`, retorna `{ok:false, msg:'mfa_required'}`. `login.html` intercepta e redireciona para `mfa-verify.html`.
  - **Role nulo pós-MFA:** `verifyMFA()` lia `user_metadata.role` que é `null` (roles em `public.users`). Fix: após verificação OTP, chama `_sbLoadUser()` para buscar role real do DB, constrói sessão completa e salva em `_currentSession`. `_pendingMfaUser` armazena o user da sessão parcial aal1.
  - **reset-password.html token:** parsing manual de `#hash` falha com PKCE (Supabase v2). Fix: usa `AUTH.onAuthStateChange()` escutando evento `PASSWORD_RECOVERY` como método principal. Fallback de hash mantido para links legados. Aguarda 3s antes de mostrar "link inválido".
  - **mfa-verify.html visual:** redesenhado — shield SVG animado com rings pulsantes, inputs OTP com separador visual 3|3, timer TOTP 30s com aviso `warn` abaixo de 5s, navegação por teclado (setas + Backspace), shake animation em erro, hint de app autenticador.
  - **AUTH.onAuthStateChange()** exposto no objeto público para reset-password.html consumir.
  - Arquivos: `js/auth.js`, `login.html`, `mfa-verify.html`, `reset-password.html`

- [x] **#35 — Corrigir loop infinito ao navegar para admin.html** ✅ 2026-04-30
  - **Causa raiz:** `_sbLoadUser()` e `_sbLoadAll()` faziam queries no banco sem timeout — quando offline após `getSession()` retornar sessão válida (cache local Supabase), travavam indefinidamente causando loop `admin→login→admin`
  - **Fix 1 — `js/auth.js`:** todo o bloco Supabase envolvido num único `Promise.race` de 5s (IIFE async interna)
  - **Fix 2 — `js/auth.js`:** catch reseta `_sbConfigured=false` e chama `_readSessionCache()` para restaurar sessão localStorage
  - **Fix 3 — CDN removido:** `js/supabase.min.js` local substitui `cdn.jsdelivr.net` em todas as páginas (eliminava bloqueio de 30s+ aguardando CDN offline)

- [x] **#34 — Auditoria de segurança completa (verificação de vulnerabilidades)** ✅ 2026-05-01
  - Auditoria OWASP Top 10 executada em todos os arquivos com agente especializado
  - **Fixes aplicados em código:**
    - `supabase-config.js`: `demoEnabled` alterado de `true` → `false` (bloqueio de acesso demo em produção)
    - `supabase-config.js`: bloco `seeds` com senhas reais de produção em texto claro **removido** completamente
    - `js/auth.js`: `_DEMO_SA_PASS` e `_DEMO_AD_PASS` — senhas de produção substituídas por valores offline-only distintos (`ADAS_OFFLINE_SA_2026` / `ADAS_OFFLINE_AD_2026`); dependência de `SUPABASE_CONFIG.seeds` removida
    - `email-config.html`: `updateTestForm()` refatorada de `innerHTML` template string para DOM API (`createElement`/`textContent`/`setAttribute`) — elimina vetor XSS
  - **Riscos residuais (requerem ação manual):**
    - IDOR: controle de acesso 100% no frontend via localStorage — mitigação depende de RLS ativo no Supabase (já configurado via #01) + Edge Functions validando JWT
    - Rate limiting bypassável no cliente — mitigação server-side requer Edge Function (backlog)
    - CSP com `unsafe-inline` — scripts inline demais para remover sem refatoração maior (backlog)
    - API key Resend em localStorage (email-config.html) — aceitar o risco até implementar backend proxy
    - Senhas de produção Supabase devem ser trocadas para garantir que não coincidam com nenhum valor anterior exposto
  - Referência: https://owasp.org/www-project-top-ten/

- [~] **#24 — Ativar e testar emails transacionais (Resend)** ⏳ Em andamento — 2026-04-30
  - **Página de configuração criada:** `email-config.html` — modo offline + online
  - **Botão adicionado:** sidebar do `admin.html` e `superadmin.html` → "✉️ E-mails Transacionais"
  - **Modo offline:** salva credenciais em localStorage, pré-visualiza os 3 templates no navegador
  - **Modo online:** dispara email real via Edge Function `/functions/v1/notify` com `Authorization: Bearer {token}`
  - **Fixes aplicados (2026-04-30):**
    - `js/supabase.min.js` — SDK baixado localmente (192kb); CDN removido de 6 páginas → carregamento offline instantâneo
    - `js/auth.js` `_doInit()` — toda a sequência (`getSession` + `_sbLoadUser` + `_sbLoadAll`) num único `Promise.race` de 5s; catch reseta `_sbConfigured=false` + restaura sessão via `_readSessionCache()`
    - `email-config.html` `checkAuth()` — aceita formato ADAS PRO `{userId,role,expiresAt}` E formato Supabase SDK `{access_token,expires_at}`; antes só aceitava ADAS PRO → derrubava página em modo online
    - `superadmin.html` `showPage()` — adicionado trigger de `loadEditorialStats()` + `renderEditorialTable()` ao abrir editorial; antes ficava preso em "Carregando..."

  **Decisão do pré-projeto (registrada em 2026-04-27):**
  - Provedor escolhido: **Resend API** (não SendGrid / não SMTP próprio)
  - Implementação: Edge Function `supabase/functions/notify/index.ts` — já deployada
  - Remetente configurado: `noreply@adaspro.com.br`
  - Template HTML já pronto: design ADAS PRO (header `#1B2B4D`, botão `#FF6B35`)

  **3 eventos implementados na função:**
  | Evento | Destinatário | Assunto |
  |--------|-------------|---------|
  | `new_user` | Admin (`ADMIN_EMAIL`) | `[ADAS PRO] Novo cadastro: {nome}` |
  | `user_approved` | Usuário aprovado | `[ADAS PRO] Seu acesso foi aprovado!` |
  | `ticket_reply` | Usuário do ticket | `[ADAS PRO] Resposta no ticket: {título}` |

  **Pendências para ativar:**
  - [ ] Criar conta Resend em resend.com e gerar `RESEND_API_KEY`
  - [ ] Verificar domínio `adaspro.com.br` no Resend (DNS TXT/DKIM)
  - [ ] Configurar 3 env vars no Supabase Dashboard → Edge Functions → notify:
    - `RESEND_API_KEY` = chave gerada no Resend
    - `ADMIN_EMAIL` = superadmin@adaspro.com.br
    - `SITE_URL` = https://adaspro.com.br
  - [ ] Testar evento `new_user`: fazer cadastro demo → verificar inbox admin
  - [ ] Testar evento `user_approved`: aprovar usuário demo → verificar inbox usuário
  - [ ] Testar evento `ticket_reply`: responder ticket → verificar inbox membro
  - [ ] Confirmar que `approve-user` Edge Function dispara `notify` ao aprovar usuário

  **Arquivo:** `supabase/functions/notify/index.ts`

- [x] **#25 — Melhorias visuais da landing page** ✅ 2026-04-28
  - Painel visual ADAS fictício removido do hero (não representa o negócio)
  - Hero mantido layout centrado original, sem alteração estrutural

- [x] **#28 — Reorganização UX do painel admin** ✅ 2026-04-28
  - Sidebar simplificada: seções Gestão / Conteúdo / Sistema; item "Pendentes" removido; item "Membros" unificado
  - `pageUsuarios` transformado em 3 abas: 👥 Todos os Membros / ⏳ Aprovações (com contador) / 🛡️ Equipe
  - Conteúdo de `pagePendentes` absorvido na aba Aprovações; gestores/equipe movidos da aba Configurações para aba Equipe
  - Aba "Gestores" removida de Configurações (IDs duplicados eliminados)
  - Aba "Níveis" removida de Controle de Acesso; filtro de categoria adicionado à lista de tickets
  - `switchMembrosTab()` adicionado; `updateBadges()` atualiza contador da aba Aprovações
  - Widget "Usuários pendentes" no dashboard ganhou botão "Ver todos" que abre diretamente a aba Aprovações
  - Arquivos: `admin.html`

- [x] **#37 — Revisão técnica + UI/UX geral do projeto** ✅ 2026-05-01
  - Auditoria executada por agentes especializados (técnico + UI/UX)
  - **Fixes aplicados em código:**
    - `vercel.json`: `cdn.jsdelivr.net` removido da CSP `script-src` (nenhum script usa CDN externo)
    - `email-config.html`: Vercel Analytics + Speed Insights adicionados (era a única página sem)
    - `css/style.css`: contraste de textos corrigido — `.brands-label` `.4→.65`, `.brand-item` `.35→.6`, `.form-disclaimer` `.35→.55`, `.footer-col a` `.45→.65` (WCAG AA)
    - `css/style.css`: FAQ `max-height: 400px → 800px` — evita truncamento de respostas longas
  - **Pendências de conteúdo (requerem ação do usuário):**
    - [ ] **Foto real do mentor** — seção `#sobre` tem placeholder "Sua foto aqui" → crítico para credibilidade
    - [ ] **Preços reais dos planos** — seção `#servicos` mostra "Consulte" em todos os planos → impacta conversão
    - [ ] **Depoimentos reais com foto/avatar** — textuais atualmente, vídeo ou foto aumenta 2-3x conversão
  - **Verificado e OK:** Scripts na ordem correta em todas as páginas, links internos sem quebra, funções JS todas definidas, nenhum CDN externo, FAQ accordion funcional, responsividade em grade, formulários com autocomplete correto

- [ ] **#36 — Ativar MFA (TOTP) obrigatório para admin e superadmin**
  - **Pré-requisito:** Código 100% pronto — `mfa-verify.html`, `AUTH.verifyMFA()`, redirect automático em `login.html` e persistência de sessão via `sessionStorage` já implementados
  - **Passo 1 — Ativar TOTP no Supabase Dashboard:**
    - Supabase Dashboard → Authentication → Sign In / MFA
    - Ativar "Time-based One-Time Password (TOTP)"
  - **Passo 2 — Configurar o Google Authenticator na conta superadmin:**
    - Logar em `adaspro.com.br` com a conta `superadmin@adaspro.com.br`
    - Acessar perfil / configurações de segurança → "Configurar autenticador"
    - Escanear QR code com Google Authenticator ou Authy
    - Confirmar com o primeiro código gerado
  - **Passo 3 — Repetir para a conta admin:**
    - Mesma sequência com `admin@adaspro.com.br`
  - **Passo 4 — Testar o fluxo completo:**
    - Login como admin → deve redirecionar automaticamente para `mfa-verify.html`
    - Inserir código TOTP de 6 dígitos → deve entrar no `admin.html`
    - Testar código errado → deve exibir shake + erro e limpar os campos
    - Testar código expirado → mesmo comportamento
  - **Passo 5 (opcional) — Forçar MFA para todos os admins novos:**
    - Supabase Dashboard → Authentication → MFA → "Enforce MFA" → selecionar roles admin/superadmin
  - **Observação:** Membros comuns **não precisam** de MFA — atrito desnecessário para o perfil de risco deles
  - **Arquivos já prontos:** `mfa-verify.html`, `js/auth.js` (funções `verifyMFA`, `login`), `login.html`

---

## 🔴 CRÍTICO — Auditoria VoltAgent 2026-05-04

- [x] **#38 — [F-01] Edge Function `approve-user` não implementa `action:'create'`** ✅ 2026-05-05
  - **Fix aplicado (opção A):** `action:'create'` implementado como path independente (antes do guard `targetId`).
  - Usa `supabaseAdmin.auth.admin.createUser()` + insert em `public.users`. Rollback automático: se insert falhar, deleta o usuário do Auth.
  - Validação de role: apenas superadmin pode criar contas admin/superadmin.
  - Retorna `{ ok: true, data: { userId } }` — compatível com `auth.js:828`.
  - Auditoria registrada com `action:'create_user'` em `audit_logs`.
  - **Arquivo:** `supabase/functions/approve-user/index.ts:52–98`
  - **Deploy necessário:** `supabase functions deploy approve-user`

---

## 🟠 ALTA — Auditoria VoltAgent 2026-05-04

- [x] **#39 — [C-01] Race condition pós-timeout no `Promise.race` de `_doInit()`** ✅ 2026-05-05
  - **Fix:** Flag `let _cancelled = false` declarado antes do timeout. `setTimeout` seta `_cancelled = true` antes de rejeitar. 4 checkpoints `if (_cancelled) return` adicionados na IIFE: após `getSession()`, após `_sbLoadUser()`, após `_sbLoadAll/MemberData`, antes de `signOut()`.
  - **Arquivo:** `js/auth.js:332–360`

- [x] **#40 — [F-02] MFA bypass: `mfa-verify.html` não valida AAL real da sessão Supabase** ✅ 2026-05-05
  - **Fix 1 — `auth.js:1108`:** `fallbackUid` substituído: de `sessionStorage.getItem('adaspro_mfa_uid')` para `_pendingMfaUser?.id` — elimina vetor de XSS injection; `removeItem` mantido para limpeza.
  - **Fix 2 — `auth.js:1210`:** `getMfaLevel()` adicionado ao export público — chama `_sb.auth.mfa.getAuthenticatorAssuranceLevel()`; retorna `null` em modo local/offline.
  - **Fix 3 — `mfa-verify.html:260`:** Guard expandido para `async`; chama `AUTH.getMfaLevel()` — rejeita AAL2 (redireciona ao painel correto) e rejeita `!= aal1` (redireciona ao login); `null` cai no comportamento anterior (modo offline).
  - **Arquivos:** `js/auth.js:1107–1108` · `js/auth.js:1210–1214` · `mfa-verify.html:260–282`

- [x] **#41 — [F-03 + F-11] Fallback local de admin bypassa Supabase Auth + `_sbDirectUpdate` bypassa validação de role** ✅ 2026-05-05
  - **Fix F-03 — `auth.js:437`:** Quando Supabase configurado e `localUser.role` é privilegiado (superadmin/admin/gestor), retorna `"Sistema de autenticação temporariamente indisponível"` em vez de aceitar seed offline. Membros comuns mantêm o fallback (login sem conta Supabase válida é de baixo risco).
  - **Fix F-11 — `auth.js:727–781`:** `_sbDirectUpdate` removido como fallback de `approveUser`, `blockUser`, `unblockUser` e `updateUserRole` — todas fail-safe com `console.error` + `return false`. `updateUserPermissions` mantém fallback (permissions não são escalada de privilégios; não mencionado no bug).
  - **Arquivo:** `js/auth.js:437–455` · `js/auth.js:727–781`

- [x] **#42 — [F-07] `email-config.html` não verifica role no branch Supabase** ✅ 2026-05-05
  - **Causa raiz confirmada:** O Supabase SDK overwrite `SESSION_KEY` com formato próprio (`access_token`, sem `role`) a cada auto-refresh de token — o branch Supabase do guard antigo passava qualquer usuário com token válido.
  - **Fix:** Adicionados `supabase.min.js`, `supabase-config.js` e `auth.js` ao `<head>` (ordem correta). IIFE `checkAuth()` (14 linhas) substituída por `AUTH.init().then(() => { AUTH.requireAuth('admin'); })` — verifica role via DB em ambos os modos. `SESSION_KEY` mantido para leitura cosmética do nome do usuário e obtenção do token para a Edge Function.
  - **Arquivo:** `email-config.html:264–266` (scripts) · `email-config.html:562–565` (guard)

- [x] **#43 — [C-02 + F-09] Falhas de `logAudit` silenciadas em `auth.js` e nas Edge Functions** ✅ 2026-05-05
  - **Fix `auth.js:1129`:** `catch (_) {}` → `catch (e) { console.error('[AUTH] logAudit falhou:', action, e.message); }`
  - **Fix `get-download-url:93–104`:** `.catch(() => {})` → fail-safe: desestrutura `{ error: logErr }`; se log falhar → `console.error` + retorna HTTP 500 — download bloqueado sem registro de auditoria.
  - **Fix `approve-user:92–96`** (path `create`): `.catch(() => {})` → `if (createLogErr) console.error(...)` — admin actions não bloqueiam, apenas logam.
  - **Fix `approve-user:144–149`** (path geral): `.catch(() => {})` → `if (logErr) console.error(...)`.
  - **Deploy necessário:** `supabase functions deploy get-download-url` · `supabase functions deploy approve-user`
  - **Arquivos:** `js/auth.js:1129` · `supabase/functions/get-download-url/index.ts:93–104` · `supabase/functions/approve-user/index.ts:92–96,144–149`

- [x] **#44 — [C-03 + C-04] Bug no singleton `init()` + `getSession()` sem await init** ✅ 2026-05-05
  - **Fix C-03 — `auth.js:388`:** `.catch(err => { _initPromise = null; throw err; })` removido — `_initPromise` persiste mesmo após rejeição, impedindo inits paralelos com estado competindo. `AUTH.reset()` adicionado ao export para retry explícito quando necessário.
  - **Fix C-04 — `auth.js:624`:** `console.warn('[AUTH] getSession() chamado antes de init()...')` adicionado se `_initPromise` for null — detecta uso incorreto em dev sem quebrar a API síncrona nem exigir refatoração de todos os callers.
  - **Arquivo:** `js/auth.js:388` · `js/auth.js:624` · `js/auth.js:1201` (export `reset`)

---

## 🟡 MÉDIO — Auditoria VoltAgent 2026-05-04

- [x] **#45 — [F-04 / M-01] `hashSimple` não é bcrypt — substituir por PBKDF2 no fallback local** ✅ 2026-05-07
  - `hashSimple` convertida em alias async para `hashPassword` (PBKDF2, 100k iter, SHA-256).
  - `checkHash` removeu branch `$2a$` — hashes legados FNV/DJB2 rejeitados, re-login obrigatório.
  - `_localRegister`, `createUserDirect`, `seedDemoData` atualizados para `await hashPassword()`.
  - **Arquivo:** `js/auth.js`

- [~] **#46 — [F-05 / L-05] CSP `unsafe-inline` — migrar event handlers inline para `addEventListener`** ⚠️ Parcial 2026-05-07
  - **Validado por ambos os agents.**
  - `'unsafe-inline'` em `script-src` e `style-src` neutraliza toda proteção XSS da CSP.
  - **Fase 1 concluída:** `login.html`, `mfa-verify.html`, `reset-password.html` migrados para `js/login.js`, `js/mfa-verify.js`, `js/reset-password.js`. Todos os inline handlers convertidos para `addEventListener`. CSS `.auth-back`, `.demo-btn-admin`, `.demo-btn-membro` adicionados a `auth.css`.
  - **Fase 2 pendente:** `admin.html` (79 handlers, 54 em template strings), `membros.html` (51 handlers, 32 dinâmicos), `superadmin.html` (113 handlers, 51 dinâmicos), `email-config.html` (19 handlers, 9 dinâmicos). Handlers em strings JS exigem event delegation — refatoração de alta complexidade.
  - **CSP update:** depende da conclusão da Fase 2. Atualizar `vercel.json` script-src para remover `'unsafe-inline'` apenas após migrar todos os 262 handlers restantes.
  - **Arquivos Fase 2:** `admin.html` · `membros.html` · `superadmin.html` · `email-config.html` · `vercel.json:27`

- [x] **#47 — [F-06] `RESEND_API_KEY` armazenada em localStorage plaintext** ✅ 2026-06-09
  - Exfiltrável via XSS — permite spam e phishing via domínio `adaspro.com.br`.
  - **Fix:** API key não é mais persistida em nenhum storage — exigida a cada sessão. Aviso de segurança explícito adicionado abaixo do campo. Cleanup automático via `beforeunload`.
  - **Arquivo:** `email-config.html`

- [x] **#48 — [M-03 + M-04 + M-06] Correções menores no sistema de rate limiting e notificações** ✅ 2026-05-07
  - **M-03:** Mensagem "Aguarde 15 minutos" com janela real de 10 min — corrigido para "10 minutos" (`auth.js`).
  - **M-04:** Chaves `adaspro_rl_*` expiradas nunca removidas do localStorage — adicionado `localStorage.removeItem(key)` quando entrada expirada (`auth.js:_checkRateLimit`).
  - **M-06:** `clearAllNotifs` usava `.neq('id', '__none__')` artificial — substituído por `.eq('user_id', _session?.userId)` (`auth.js`).

- [x] **#49 — [M-08 + M-09 + M-10] Dead code em animations.js e observers paralelos em app.js** ✅ 2026-05-07
  - **M-08:** Removido bloco `animateProgressBars()` e observer `.dramatic-section` do DOMContentLoaded em `animations.js` — sem elementos HTML correspondentes. Funções `animateProgressBars` e `dramaticCounter` preservadas para uso futuro.
  - **M-09:** `animateCounter` agora guarda `el.dataset.animated = '1'` antes de executar — previne dupla animação quando `revealObserver` e `counterObserver` observam o mesmo elemento (`app.js`).
  - **M-10:** `AUTH.getSession()` em `app.js` agora executado dentro de `AUTH.init().then()` — garante sessão carregada antes de atualizar botão "Minha Área".

- [x] **#52 — Atualização de build e documentação de manutenção** ✅ 2026-05-07
  - Build desatualizado em 5 locais após ciclo de manutenção de 2026-04-23/24/25.
  - `superadmin.html` (3 ocorrências): `v3.0.0 · build 20260424` → `v3.0.0 · build 20260507`
  - `admin.html`: `v2.2.0 · build 20260423` → `v2.2.0 · build 20260507`
  - `membros.html`: `v2.2.0 · build 20260423` → `v2.2.0 · build 20260507`
  - `js/auth.js`: `v4.0.0 build 20260425` → `v4.0.1 build 20260507` (patch bump pelos fixes #48, #49, #51)

---

## 🟠 ALTA — Segurança e Controle Admin 2026-05-07

- [x] **#53 — Registrar reset de senha em audit_logs** ✅ 2026-05-07
  - `AUTH.resetPassword()` agora chama `await logAudit('reset_password_requested', null, { email })` após sucesso. Se chamado por admin autenticado, `actor_id` captura o admin; se self-service (sem sessão), `actor_id` fica null.
  - **Arquivo:** `js/auth.js` — função `resetPassword()`

- [x] **#54 — Botão "Enviar reset de senha" para usuário no painel admin** ✅ 2026-05-07
  - Botão "🔑 Reset de senha" adicionado no rodapé do modal `permModal`. Chama `sendPasswordResetToUser()` → `AUTH.resetPassword(user.email)` com feedback de toast e estado de loading. Registrado automaticamente em audit_logs via #53.
  - **Arquivo:** `admin.html` — footer do permModal + função `sendPasswordResetToUser()`

- [x] **#55 — Aba "Auditoria" no painel admin** ✅ 2026-05-07
  - Nova seção "📋 Auditoria" no sidebar (Sistema). Página `pageAuditoria` com filtro por tipo de ação e tabela das últimas 100 entradas de `audit_logs`: data/hora, ação rotulada, executor, alvo (nome do usuário se encontrado) e detalhes JSON. Função `AUTH.getAuditLogs(filter, limit)` adicionada ao módulo AUTH e exportada na API pública.
  - **Arquivo:** `admin.html` + `js/auth.js` — `getAuditLogs()` + `loadAuditoria()`

---

## 🟡 MÉDIO — Controle Operacional Admin

- [x] **#56 — Data de expiração de acesso por usuário** ✅ 2026-05-07
  - Campo `accessExpires` adicionado ao permModal (input date "Expiração de acesso"). `saveUserPerms` chama `AUTH.setAccessExpiry(userId, timestamp)` que usa `approve-user` Edge Function action:`update`. No init Supabase: se `_isAccessExpired(user)`, o sistema auto-bloqueia (status→blocked), registra em audit_logs e faz signOut. Badge "⏱" na coluna Status: vermelho se expirado, laranja se expira em <7 dias, cinza com data se futuro.
  - **Arquivo:** `js/auth.js` — `_isAccessExpired()`, `setAccessExpiry()`, fluxo init · `admin.html` — permModal + filterUsers

- [x] **#57 — Histórico de downloads por usuário no painel admin** ✅ 2026-05-07
  - Seção colapsável "📥 Histórico de downloads" adicionada ao rodapé do permModal. Ao expandir, carrega os últimos 20 registros de `audit_logs` (action:`download_content`, actor_id=userId) via `AUTH.getUserDownloads(userId)`. Exibe título do conteúdo (buscado em `getContent()`) e data/hora. Colapsa e limpa ao abrir novo usuário.
  - **Arquivo:** `js/auth.js` — `getUserDownloads()` · `admin.html` — toggleUserDownloads()

---

## 🔵 BAIXO — Melhorias de UX Admin

- [x] **#58 — Indicador visual de "reset solicitado" no card do usuário** ✅ 2026-05-07
  - `resetPassword()` corrigido para usar `getUserByEmail()` e passar o userId real como `target_id` no audit log. Adicionado `AUTH.getRecentResets(hours)` que retorna um `Set` de userIds com reset nas últimas N horas. `loadUsuarios()` tornou-se `async`, chama `getRecentResets(24)` e armazena em `window._recentResets`. Badge "🔑 Reset" ciano exibido na coluna e-mail de cada usuário que teve reset nas últimas 24h.
  - **Arquivo:** `js/auth.js` — `resetPassword()`, `getRecentResets()` · `admin.html` — `loadUsuarios()`, `filterUsers()`

- [x] **#59 — Revisão de layout e UX dos painéis usando design guidelines** ✅ 2026-05-07
  - **(a) Empty states com CTA:** Classes `.empty-state`, `.empty-state-icon/title/sub/cta` adicionadas a `auth.css`. Helper `emptyState(icon, title, sub, ctaHtml)` adicionado ao admin.html. Todos os empty states inline substituídos: tickets abertos, aprovações pendentes, tabela de usuários, tabela de suporte, lista de gestores, biblioteca (com CTA "＋ Adicionar material"), log de auditoria.
  - **(b) Loading skeletons:** `@keyframes skeleton-pulse`, `.skeleton-row`, `.skeleton-cell` adicionados a `auth.css`. Helper `skeletonTable(cols, rows)` no admin.html. `loadAuditoria()` usa skeleton de 5 colunas × 6 linhas durante carregamento.
  - **(c) Consistência de status:** `statusBadge()` em admin.html simplificado — emojis redundantes removidos (o dot CSS `::before` já indica estado); labels agora são "Ativo / Pendente / Bloqueado" consistentes com as classes `.status-active/pending/blocked` de `auth.css`.
  - **Arquivo:** `css/auth.css` + `admin.html`

---

## 🟠 ALTA — Controle Superadmin

- [x] **#60 — Biblioteca de Materiais no painel Superadmin** ✅ 2026-05-07
  - **Problema:** Superadmin não tinha nenhum controle sobre a Biblioteca. O único painel com gestão de materiais era o `admin.html`, colocando uma funcionalidade crítica fora do alcance do nível máximo de acesso.
  - **Implementação em `superadmin.html`:**
    - Novo item "📚 Biblioteca de Materiais" na sidebar (seção Negócio, após Editorial)
    - Página `page-biblioteca` com stats (total / ocultos / com arquivo), filtros por busca e categoria, tabela com colunas: Material, Categoria, Nível Visualizar, Nível Download, Visibilidade, Ações
    - Modal `modalSaBiblioteca` com todos os campos + **bloco exclusivo Superadmin**: seletor de `accessLevel` (1–4 = Free/Módulo/Pro/Premium), seletor de `downloadLevel`, toggle "Ocultar material"
    - Botão **"🚫 Revogar acesso global à categoria"** (disponível no modal de edição) — remove a categoria das permissões de todos os usuários de uma vez
    - Botões de ação por linha: Editar (✏️), Toggle visibilidade (🙈/👁️), Excluir (🗑)
  - **Implementação em `js/auth.js`:**
    - `revokeAllPermissionsForCategory(catId)` — percorre `_users`, remove catId de `permissions[]`, chama `_sbUpsertUser` para cada afetado e persiste via `_saveUsersLocal()`. Retorna `{ ok, count }`.
    - Exportado no objeto público `AUTH`
  - **Controles exclusivos do Superadmin** (não disponíveis no admin):
    - `accessLevel` por material (admin usa padrão fixo)
    - `downloadLevel` por material
    - Toggle de visibilidade (ocultar sem excluir)
    - Revogação em massa por categoria
  - **Arquivos:** `superadmin.html` + `js/auth.js`

---

## 🔴 CRÍTICO — Auditoria Multi-Agente 2026-05-14

- [x] **#61 — [R2-CRIT-1] `gestor` com poder de admin/superadmin na Edge Function `approve-user`** ✅ 2026-05-14
  - **Causa raiz:** Verificação inicial (`line 41`) agrupava `gestor` com `admin` e `superadmin` para **todas** as ações, incluindo `create`, `delete` e `update` — ações que a documentação e as regras de negócio reservam exclusivamente a admin+. A Edge Function usa `service_role` (ignora RLS), então gestor comprometido tinha capacidade real de criar contas, deletar membros e modificar dados arbitrários no banco.
  - **Fix:** Adicionado bloco de restrição logo após a validação de `VALID_ACTIONS`: `gestor` só pode executar `['approve','block','unblock']`. Qualquer outra ação retorna HTTP 403.
  - **Arquivo:** `supabase/functions/approve-user/index.ts` — após linha 50
  - **Deploy necessário:** `supabase functions deploy approve-user`

- [x] **#63 — [UX-MÉDIO] Centralizar tokens CSS — remover blocos `:root` inline duplicados** ✅ 2026-05-14
  - **Problema:** `login.html`, `admin.html`, `membros.html` e `email-config.html` redefiniam todos os tokens de design em blocos `<style>:root{}</style>` inline, duplicando valores já presentes em `css/style.css`. Divergências silenciosas impossibilitavam atualizações centralizadas.
  - **Fix `login.html`:** Bloco `<style>` inteiro removido — apenas continha `:root` com duplicatas de `style.css`.
  - **Fix `admin.html` e `membros.html`:** Bloco `:root{}` removido de cada `<style>` inline; regra `body{background:#0f1923...}` preservada (override dark-theme necessário).
  - **Fix `email-config.html`:** Adicionado `<link rel="stylesheet" href="css/style.css">` e `preconnect` para `fonts.gstatic.com`. Fonte Inter adicionada ao import do Google Fonts (estava apenas Poppins). Bloco `:root` reduzido a 5 tokens exclusivos/overrides: `--danger`, `--card`, `--border`, `--muted`, `--text`. `body font-family` corrigido de `'Poppins'` para `var(--font-b)` (Inter).
  - **Arquivos:** `login.html`, `admin.html`, `membros.html`, `email-config.html`

- [x] **#64 — [UX-MÉDIO] Pending card sem prazo nem canal de contato** ✅ 2026-05-14
  - **Problema:** Card de "Cadastro em análise" no `login.html` não informava prazo estimado nem oferecia alternativa de contato, gerando ansiedade e possíveis contatos desnecessários ao mentor.
  - **Fix:** Adicionado parágrafo "Geralmente aprovamos em até 24 horas úteis." e botão WhatsApp (`wa.me/5511947591115`) com estilo inline verde (#25d366), hover visual e `rel="noopener noreferrer"`.
  - **Arquivo:** `login.html` — `#pendingCard`

- [x] **#62 — [R1-CRIT-2] XSS armazenado via mensagem de notificação em `admin.html`** ✅ 2026-05-14
  - **Causa raiz:** `renderNotifs()` interpolava `${n.message}` e `${n.id}` diretamente em `innerHTML` sem escapamento. Notificação com payload `<img src=x onerror="...">` criada por membro autenticado executava JS no contexto do admin ao abrir o painel.
  - **Fix:** `${n.message}` → `${esc(n.message)}` e `${n.id}` → `${esc(n.id)}` — usando a função `esc()` já definida em `admin.html:747`.
  - **Arquivo:** `admin.html:851–854`

---

## 🔵 BAIXO — Auditoria VoltAgent 2026-05-04 (backlog)

- [x] **#50 — Findings de baixa prioridade (cleanup)** ✅ 2026-05-07
  - **[F-08]** Rate limiting bypassável via incógnito — risco aceito; Supabase Auth tem rate limiting server-side.
  - **[F-10]** Edge Functions atualizadas: `deno.land/std@0.177.0` → `0.224.0`; `supabase-js@2` → `2.49.0` (pinagem de versão) — todas as 3 functions (`approve-user`, `get-download-url`, `notify`). **Deploy necessário.**
  - **[F-13]** Modo offline: sessão cacheada de usuário bloqueado não é mais restaurada — `_readSessionCache()` agora verifica `_users[userId].status !== 'blocked'` antes de setar `_currentSession` (`auth.js`).
  - **[F-14]** `importData()` sanitiza `role` e `status` importados via JSON — valores inválidos substituídos por `'membro'` / `'pending'` antes de persistir (`auth.js`).
  - **[F-15]** SRI hash adicionado em todas as 7 páginas que carregam `supabase.min.js` (`integrity="sha256-byoloViQGqnpAXArMyrS+ska3dQFAv1kbgWERmVILKc=" crossorigin="anonymous"`).
  - **[L-03]** `build-config.js` usa `JSON.stringify()` para interpolar `url`, `anonKey` e `siteUrl` — previne injeção de caracteres especiais (aspas, barras) em env vars (`scripts/build-config.js`).
  - **[L-06]** `_legacyDjb2()` removida e `checkHash()` simplificada — formato desconhecido retorna `false` diretamente (`auth.js`).

---

## 🟡 MÉDIO — Fixes 2026-05-07

- [x] **#51 — Demo mode quebrado quando Supabase offline** ✅ 2026-05-07
  - **Causa raiz:** `enterDemoMode()` em `js/auth.js` chamava `_seedDefaultUsersLocal()` e `_localLogin()` sem `await`.
  - `_seedDefaultUsersLocal()` é async (usa `crypto.subtle.deriveBits` via PBKDF2) — sem `await`, `_users['admin']` ainda não existia quando `_localLogin` era chamado → login falhava com "E-mail ou senha inválidos".
  - `_localLogin()` também é async — sem `await`, `result` era uma Promise pendente; `result.ok` era `undefined` → `localStorage.setItem('adaspro_demo', '1')` nunca executava → ao redirecionar para `admin.html`, `AUTH.init()` não detectava o flag e tentava Supabase novamente (timeout 5s) → redirecionava de volta ao login em loop.
  - **Fix:** `await` adicionado nas duas chamadas em `enterDemoMode()` (`auth.js:696` e `auth.js:701`).
  - **Testado:** demo admin e demo membro funcionando com Supabase offline.
  - **Arquivo:** `js/auth.js` — função `enterDemoMode()`

---

## ✅ CONCLUÍDO (histórico)

- [x] Migração Firebase → Supabase — auth.js v4.0.0
- [x] Corrigir loop de redirect após login
- [x] Remover código [DEBUG] do auth.js
- [x] Criar usuários admin e superadmin no Supabase
- [x] #01–#09 — Segurança crítica e alta (deploy 2026-04-25)
- [x] #10–#12 — Melhorias de robustez (deploy 2026-04-25 / 2026-04-27)
- [x] #13–#21 — Infraestrutura, Edge Functions, Storage, aprovação (deploy 2026-04-25 / 2026-04-27)

---

---

## 🟢 MANUTENÇÃO — 2026-06-09

- [x] **#65 — Sincronizar DEFAULT_CONTENT com CONTENT_MAP — filePaths dos PDFs** ✅ 2026-06-09
  - `DEFAULT_CONTENT` em `js/auth.js` atualizado com `filePath` real dos 21 PDFs em `assets/downloads/`.
  - Entradas sem PDF (honda-acc, nissan-radar) mantidas como `filePath: null`.
  - `CONTENT_MAP` da Edge Function já estava atualizado — agora ambos em sincronia.
  - **Arquivo:** `js/auth.js:47–71`

- [x] **#47 — RESEND_API_KEY não mais persistida** ✅ 2026-06-09
  - API key removida do sessionStorage — usuário digita a cada sessão.
  - Aviso de segurança explícito adicionado no campo da chave.
  - Cleanup automático via `beforeunload`.
  - **Arquivo:** `email-config.html`

- [x] **Bumps de build** ✅ 2026-06-09
  - `js/auth.js`: v4.0.2 build 20260609
  - `admin.html`: build 20260609
  - `membros.html`: build 20260609
  - `superadmin.html`: build 20260609
  - `supabase-config.js`: demoEnabled=false (produção)

---

## REFERÊNCIAS

- Supabase Dashboard: https://supabase.com/dashboard/project/zqydyyticvtmirjzskly
- Vercel Dashboard: https://vercel.com
- Produção: https://adaspro.com.br
- OWASP Top 10: https://owasp.org/www-project-top-ten/

---

## 🔴 CRÍTICO/ALTO — Auditoria de segurança 2026-08-13

- [x] **#66 — [CRÍT] CSP com hashes `.trim()` quebrava todos os painéis em produção** ✅ 2026-08-13
  - **Causa raiz:** `scripts/generate-csp.js` chamava `.trim()` no conteúdo dos scripts inline antes de hashear. O browser (CSP3) hasheia o conteúdo **exato** do elemento `<script>` (incluindo quebra de linha inicial). Resultado: os 4 hashes de `vercel.json` nunca batiam → CSP `script-src 'self'` **bloqueava** o script inline de `admin.html`, `membros.html`, `superadmin.html` e `email-config.html` em produção.
  - **Fix:** `.trim()` removido do cálculo de hash em `generate-csp.js` (mantido apenas na checagem de conteúdo vazio). `vercel.json` regenerado com hashes corretos.
  - **Arquivos:** `scripts/generate-csp.js` · `vercel.json`
  - **Regenerar sempre com:** `npm run build` (não editar hashes manualmente).

- [x] **#67 — Hardening MFA: fechar bypass de navegação direta (sessão aal1)** ✅ Deployado em produção (Vercel `adaspro.com.br`, 2026-08-13) — 2026-08-13
  - **Problema:** Sessão aal1 persistida pelo SDK (MFA pendente) podia ser usada para abrir `admin.html`/`superadmin.html` diretamente sem completar a 2ª etapa.
  - **Fixes em `js/auth.js`:**
    - `_doInit()`: se `getAuthenticatorAssuranceLevel()` retorna `nextLevel='aal2'` e `currentLevel!=='aal2'`, NÃO constrói sessão — seta `_pendingMfaUid`/`_pendingMfaTimestamp`, persiste `adaspro_mfa_uid` + fingerprint no `sessionStorage` e retorna cedo (força passagem por `mfa-verify.html`).
    - `requireAuth()`: defesa em profundidade — role privilegiada com MFA pendente redireciona para `mfa-verify.html` mesmo se sessão for construída.
    - `callEdgeFunction()`: bloqueia chamadas a Edge Functions com sessão aal1 em roles privilegiadas.
    - `reset()`: limpa estado MFA pendente (`_pendingMfaUser/Uid/Timestamp` + sessionStorage).
  - **Fixes em `js/login.js`:** `AUTH.init()` detecta `adaspro_mfa_uid` pendente e redireciona para `mfa-verify.html` (fluxo login → painel → verificação).
  - **Arquivos:** `js/auth.js` · `js/login.js`

- [x] **#68 — Hardening RLS: impedir escalada de privilégio entre roles** ✅ Aplicado no banco remoto (2026-08-13) — 2026-08-13
  - Novas funções: `role_level(r)`, `can_manage_role(target_role)` (só gerencia role ESTRITAMENTE inferior), `is_admin_staff()` (admin+ cria contas; gestor NÃO).
  - `users_insert`: registro próprio nasce sem privilégios (`permissions='{}'`, `plan='free'`, `accessType='trial'`, `accessExpires IS NULL`) — impede auto-inflação.
  - `users_update`: membro não pode tocar em `role/status/permissions/plan/accessType/accessExpires/boughtModules` (comparação `IS NOT DISTINCT FROM`); admin+ só altera roles inferiores via `can_manage_role`.
  - **Aplicar:** `supabase db query --linked -f sql/rls_policies.sql`

- [x] **#69 — Hardening Edge Functions: MFA + status ativo obrigatórios** ✅ Deployado (approve-user/get-download-url/notify v3, 2026-08-13) — 2026-08-13
  - `approve-user`, `get-download-url`, `notify`: agora verificam `status='active'` do caller (conta pendente/suspensa não executa ações) e exigem `currentLevel='aal2'` quando a conta tem fator MFA configurado (`nextLevel='aal2'`).
  - **Deploy:** `supabase functions deploy approve-user` · `supabase functions deploy get-download-url` · `supabase functions deploy notify`
  - **Arquivos:** `supabase/functions/{approve-user,get-download-url,notify}/index.ts`

- [x] **#70 — [CRÍT] GitHub PAT exposto no remote origin** ✅ Resolvido 2026-08-13
  - Remote corrigido para URL limpa `https://github.com/edsespinoza/ADAS_PRO.git` (sem token embutido).
  - Autenticação via gh CLI (device flow) + `gh auth setup-git` (credential helper). Push `main` OK.
  - **Ação manual pendente:** o PAT antigo foi exposto no histórico — **revogar em github.com/settings/tokens** se ainda estiver ativo.

- [x] **Bumps de build** ✅ 2026-08-13
  - `js/auth.js`: v4.0.3 build 20260813
  - `admin.html` / `membros.html`: build 20260813
  - `superadmin.html`: build 20260813

- [x] **Fix — ID duplicado `saLibHidden` quebrava checkbox "Ocultar material"** ✅ 2026-08-13
  - **Bug:** `superadmin.html` tinha dois elementos com `id="saLibHidden"` — o stat "Ocultos" (div, linha ~1937) e o checkbox do modal de edição (input, linha ~2118). `getElementById` retorna o primeiro no DOM (o div), então `saveSaContent()`/`openEditSaContent()` liam/escreviam `.checked` num div — o checkbox nunca refletia nem salvava o estado `hidden`.
  - **Fix:** stat renomeado para `saLibHiddenCount` (+ referência em `loadSaLibrary()`). Checkbox `saLibHidden` mantém o ID original.
  - **Arquivo:** `superadmin.html`

## 🟠 ALTA — Revisão aba admin (painel de gestão) 2026-08-13

> Diagnóstico com agentes paralelos (API AUTH vs admin.html; DOM; handlers; hash integrity) + testes funcionais em Node (VM sandbox). Todos os fixes abaixo aplicados e verificados por sintaxe (`node --check`) e testes de unidade em modo local.

- [x] **Fix — F5 recarregava a landing page em vez do painel** ✅ 2026-08-13
  - **Bug:** `history.replaceState({}, document.title, '/')` em `admin.html:740` e `membros.html:997` trocava a URL para `/` — ao apertar F5/refresh o browser abria a landing page (sessão parecia "não persistir").
  - **Fix:** `window.location.pathname` preserva a rota atual.
  - **Arquivos:** `admin.html` · `membros.html`

- [x] **Fix — `switchConfigTab` apagava abas de Membros/Acesso (páginas em branco)** ✅ 2026-08-13
  - **Bug:** `switchConfigTab()` usava seletores globais `.page-tab`/`.page-tab-content` → qualquer mudança de aba em Configurações removia a classe `.active` de TODAS as abas do painel (Usuários e Equipe ficavam vazias).
  - **Fix:** seletores escopados para `#pageConfiguracoes .page-tab` / `#pageConfiguracoes .page-tab-content`.
  - **Arquivo:** `admin.html`

- [x] **Fix — `saveUserPerms` mostrava sucesso mesmo com falha** ✅ 2026-08-13
  - **Bug:** retornos de `updateUserPermissions`/`updateUserRole`/`setAccessExpiry`/`approveUser`/`blockUser`/`unblockUser` nunca eram verificados — toast "✅ Permissões salvas!" aparecia mesmo quando a operação falhava (ex.: RLS bloqueando).
  - **Fix:** cada chamada agora checa retorno; falha lança erro com mensagem, toast de erro e botão restaurado no `finally`.
  - **Arquivo:** `admin.html`

- [x] **Fix — `applyPlan` e `sendTicketReply` ignoravam retorno de função async** ✅ 2026-08-13
  - **Bug:** chamavam funções async sem `await` e ignoravam `ok === false` — plano "aplicado"/resposta "enviada" eram reportados mesmo em falha.
  - **Fix:** handlers agora `async` com `await` e checagem de retorno (`false` → toast de erro e early return).
  - **Arquivo:** `admin.html`

- [x] **Fix — `selectTicket` quebrava com ticket sem mensagens** ✅ 2026-08-13
  - **Bug:** `ticket.messages.map` sem guard → erro se `messages` ausente (tickets antigos/importados).
  - **Fix:** `(ticket.messages || []).map`.
  - **Arquivo:** `admin.html`

- [x] **Fix — Crash `session.name.split` / `u.name.split` com nome nulo** ✅ 2026-08-13
  - **Bug:** usuários criados por admin/superadmin às vezes não têm `name` (só `email`) → `initials` quebrava o render de `filterUsers()`, `loadGestores()` e o header do painel.
  - **Fix:** guards `(name || '')` nos 3 pontos.
  - **Arquivo:** `admin.html`

- [x] **Fix — `saveContent` abortava salvamento em modo offline** ✅ 2026-08-13
  - **Bug:** em modo local o `uploadFile` retorna `{ok:false, msg:'Supabase não disponível.'}` → o save inteiro era abortado, impossibilitando cadastrar materiais offline.
  - **Fix:** em `AUTH.isOfflineMode()` salva os metadados sem arquivo (toast de aviso); erro real de upload continua abortando.
  - **Arquivo:** `admin.html`

- [x] **Fix — `getAllTickets` ordenava com `NaN` (timestamps ISO do Supabase)** ✅ 2026-08-13
  - **Bug:** `b.updatedAt - a.updatedAt` com `updatedAt` em ISO string (retornado pelo PostgREST) → subtração `NaN`, ordenação indefinida.
  - **Fix:** `ts()` normaliza número ou ISO para millis antes de subtrair.
  - **Arquivo:** `js/auth.js`

- [x] **Fix — `getUserDownloads` retornava vazio no modo local** ✅ 2026-08-13
  - **Bug:** modo local (`_mode !== 'supabase'`) retornava `{ok:false, data:[]}` sempre — aba de downloads do usuário ficava vazia mesmo com downloads registrados por `trackDownload`.
  - **Fix:** fallback local lê `user.downloads` gravados por `trackDownload` e mapeia para o shape esperado (`target_id`, `created_at`).
  - **Arquivo:** `js/auth.js`

- [x] **Testes aplicados** ✅ 2026-08-13
  - Sintaxe: `node --check` em `auth.js` e scripts inline de `admin.html`/`membros.html` (via `new Function`).
  - Funcionais (VM sandbox, modo local): `getAllTickets` com ISO, `getUserDownloads` (2 downloads), `applyPlanToUser`, `replyTicket`, `updateTicketStatus`, `deleteTicket`, `approveUser`, `blockUser`, `unblockUser` — todos OK.
  - **Pendência manual:** teste visual no browser (`localhost:3000` ou preview Vercel) para confirmar UX das abas de Configurações.

- [x] **Fix — CSP desatualizado no deploy (repeat do #66)** ✅ 2026-08-13
  - **Situação:** o 1º deploy desta rodada subiu `vercel.json` com hashes CSP ANTIGOS (`/sOg3...`, `KVpay...`), pois o build rodou antes dos edits inline serem persistidos — scripts inline do admin/membros seriam bloqueados em produção (mesmo sintoma do #66).
  - **Detecção:** hashes recalculados à mão vs. `vercel.json` commitado divergiam. `npm run build` re-gerou os hashes corretos (`45r5...`, `zupOo...`).
  - **Ação:** commit `8730de3` (só `vercel.json`) + re-deploy. `adaspro.com.br/admin` agora retorna CSP com os 4 hashes atuais — batendo com os arquivos.
  - **Lição:** SEMPRE rodar `npm run build` logo antes de `vercel --prod` se algum `<script>` inline foi editado, e conferir `git diff vercel.json` após o build.

## 🟠 ALTA — Acesso a Módulos sem efeito no painel admin 2026-08-13

> Diagnóstico em VM sandbox: `toggleModuleAccess`/`setModuleLevel` gravavam `settings.moduleAccess`, mas nenhuma função de autorização (`canViewContent`, `canDownloadContent`, `getContentForUser`) lia essa config — desativar um módulo não mudava nada. Além disso, settings eram 100% localStorage (nunca sincronizadas) e a Edge Function `get-download-url` não validava módulos. Fix completo aplicado e testado.

- [x] **Fix — `moduleAccess` agora é aplicado na autorização (cliente)** ✅ 2026-08-13
  - **Bug:** `auth.js` — `canViewContent`/`canDownloadContent` checavam só `permissions`/`accessLevel`/`downloadLevel`; `getContentForUser` não filtrava. Toggle de módulo no admin era cosmético.
  - **Fix:** helper `_modulePolicy(catId)` lê `settings.moduleAccess[cat]` → módulo `enabled:false` nega view+download e oculta do catálogo; `minLevel` acima do nível do usuário bloqueia view/download e marca item como `locked`. Staff (nível 4) continua sempre liberado, como antes.
  - **Arquivo:** `js/auth.js`

- [x] **Fix — settings sincronizadas com Supabase (propagação p/ membros)** ✅ 2026-08-13
  - **Bug:** `getSettings`/`saveSettings` eram só localStorage mesmo com Supabase ativo → admin mudava módulos no browser dele e membros não recebiam.
  - **Fix:** nova tabela `public.settings` (key/value jsonb, RLS: select p/ autenticados, write só p/ admin+). `_sbLoadAll` e `_sbLoadMemberData` carregam a row `app` e fazem merge com o localStorage; `saveSettings` faz upsert via Supabase quando `_mode==='supabase'`.
  - **Arquivos:** `js/auth.js` · `sql/settings_table.sql` · `sql/rls_policies.sql`

- [x] **Fix — Edge Function `get-download-url` valida módulo server-side** ✅ 2026-08-13
  - **Bug:** download passava pela Edge Function que só checava `permissions` — módulo desativado ainda baixável.
  - **Fix:** após `hasPermission`, lê `settings` (row `app`) e bloqueia com 403 se `moduleAccess[cat].enabled === false` ou se `minLevel` > nível do usuário (derivado de `plan`/`accessLevel`). Staff sempre passa (consistente com o cliente).
  - **Arquivo:** `supabase/functions/get-download-url/index.ts` · **requer deploy da função**

- [x] **SQL aplicado no banco** ✅ 2026-08-13
  - `sql/settings_table.sql` executado via `supabase db query --linked` — tabela + RLS + row inicial `app`.
  - **Pendência manual:** `supabase functions deploy get-download-url` (env var `SUPABASE_SERVICE_ROLE_KEY` já usada pela função).

- [x] **Testes aplicados** ✅ 2026-08-13
  - VM sandbox (modo local): módulo OFF → `canView=false`, `canDl=false`, 0 itens honda visíveis, toyota intacto; `minLevel=3` → membro free bloqueado, itens `locked`; staff com módulo OFF continua `canView=true`.
  - VM sandbox (Supabase mock): `_sbLoadAll` carrega `moduleAccess` do "servidor" e o aplica; `saveSettings` dispara upsert em `settings` com `key:'app'`.


---

## 🟠 ALTA — Revisão de segurança e UX (módulos/níveis/login) 2026-08-14

> Revisão dedicada (4 agentes) sobre o fluxo de módulos e RLS. Achados corrigidos: RLS `users_update` permitia admin editar/se demitir outro admin; Edge Function ignorava `accessLevel`/`downloadLevel` por item; membros ganhavam sessão local no login mesmo com Supabase ativo; gestor alterava `settings` sem erro; aba "Níveis" era decorativa; favoritos vazavam conteúdo de módulos desativados.

- [x] **Fix — [CRÍTICO] RLS `users_update` validava role contra a linha NOVA** ✅ 2026-08-14
  - **Bug:** a política usava `is_admin()` no USING e `can_manage_role(role)` só no WITH CHECK. Como **USING avalia a linha ANTIGA** e **WITH CHECK a NOVA**, admin/gestor podia USAR o UPDATE numa linha de role >= à sua (ex.: rebaixar outro admin via SET role='membro' — a role nova 1 < 3 passava no check).
  - **Fix:** USING agora exige `auth.uid() = id OR (public.is_admin() AND public.can_manage_role(role))` — `role` no USING é a **role atual** da linha, então admin/gestor nem alcança linha com role >= à sua. WITH CHECK mantido (impede promoção a role >= própria dentro do UPDATE). Comentários atualizados no arquivo.
  - **Arquivo:** `sql/rls_policies.sql` · **requer re-execução do arquivo no banco** (`supabase db query --linked -f sql/rls_policies.sql`)

- [x] **Fix — Edge Function `get-download-url` ignora `accessLevel`/`downloadLevel` por item** ✅ 2026-08-14
  - **Bug:** a função validava `permissions` e `moduleAccess` mas não os níveis mínimos por conteúdo — URL assinada gerada para quem não poderia ver/baixar o item.
  - **Fix:** `CONTENT_MAP` agora carrega `accessLevel`/`downloadLevel` por item (sincronizado com `DEFAULT_CONTENT` de `js/auth.js`); novo check `3a.1` deriva o nível do usuário (`plan` → free1/modulo2/pro3/premium4) e bloqueia com 403 se `< accessLevel` (visualizar) ou `< downloadLevel` (baixar). Staff sempre passa, como no cliente.
  - **Arquivo:** `supabase/functions/get-download-url/index.ts` · **requer deploy da função**

- [x] **Fix — Membro recebia fallback local no login mesmo com Supabase ativo** ✅ 2026-08-14
  - **Bug:** com Supabase configurado, se `signInWithPassword` retornasse erro, `login()` concedia sessão local a QUALQUER usuário (incl. membros) se a senha batesse com o seed offline — bypass de credenciais reais em produção.
  - **Fix:** bloco de concessão de sessão local removido. Com Supabase ativo **nenhum** fallback local no login (nem membros, nem privilegiados); sessões locais são exclusivas do modo offline. Comentário atualizado.
  - **Arquivo:** `js/auth.js`

- [x] **Fix — Gestor alterava módulos/níveis sem erro aparente (persistência silenciosa)** ✅ 2026-08-14
  - **Bug:** RLS de `settings` bloqueia write p/ gestor, mas `toggleModuleAccess`/`setModuleLevel` mostravam "ativado/desativado" mesmo assim (upsert falhava em silêncio e o estado revertia no reload).
  - **Fix:** `saveSettings` agora retorna `Promise` com `{ok:true}`/`{ok:false,error}`; os toggles aguardam o resultado, exibem toast de erro e re-renderizam em caso de falha; UI marca os controles como `disabled` + "somente leitura" quando `session.role==='gestor'`; guard explícito impede a chamada.
  - **Arquivos:** `js/auth.js` · `admin.html`

- [x] **Fix — Aba "Níveis" órfã e função decorativa `renderAccessLevels`** ✅ 2026-08-14
  - **Bug:** `accTabNiveis` + `accNiveisGrid` sem aba correspondente no HTML; `renderAccessLevels` montava cards de planos com checkboxes que não salvavam nada (decorativos) e era chamada no load.
  - **Fix:** div órfã, função e chamada removidas.
  - **Arquivo:** `admin.html`

- [x] **Fix — `getUserFavorites` vazava itens de módulos desativados** ✅ 2026-08-14
  - **Bug:** favoritos filtravam só pelo catálogo; item de módulo desligado continuava aparecendo na lista de favoritos.
  - **Fix:** filtro extra `_modulePolicy(c.cat).enabled` no `getUserFavorites`.
  - **Arquivo:** `js/auth.js`

- [x] **Sidebar de `membros.html`: nenhuma mudança necessária** ✅ 2026-08-14
  - O guard `hasItems = contentData.some(c=>c.cat===cat.id)` já esconde categorias de módulos desativados (porque `getContentForUser` filtra). Revisado e mantido.

- [x] **Fix — `saveConfigurations` mostrava falso sucesso em falha de persistência** ✅ 2026-08-14
  - **Bug:** `admin.html` — ao salvar Configurações, `AUTH.saveSettings(s)` era fire-and-forget; se o upsert falhasse (ex.: gestor, bloqueado pela RLS de `settings`), a página exibia "Configurações salvas" mesmo assim.
  - **Fix:** `saveConfigurations` agora aguarda o retorno `{ok}`/`{ok:false}` e só mostra sucesso quando ok; em falha exibe toast de erro. Consistente com o fix dos toggles de módulo.
  - **Arquivo:** `admin.html`

- [x] **Fix — CSS órfão dos "níveis" removido** ✅ 2026-08-14
  - Removidas as regras `.access-levels-grid`, `.access-level-card`, `.level-badge-large`, `.level-name-lg`, `.level-price-lg`, `.level-permission-row`, `.level-perm-label` e o trecho na media query — usadas apenas pela função decorativa removida.
  - **Arquivo:** `admin.html`

- [x] **Testes aplicados** ✅ 2026-08-14
  - VM sandbox (`/tmp/opencode/test-revisao.js`): login com Supabase ativo + erro de auth → membro **não** recebe sessão local (10/10 PASS, incluindo regressão dos testes de módulos anteriores).
  - `node --check` em `js/auth.js` e no script inline de `admin.html` (sem `renderAccessLevels`/`accTabNiveis`/`accNiveisGrid` residuais).
  - CSS órfão: `grep` confirma zero usos de `.access-levels-grid`/`.level-*` em HTML/JS.

## 🟠 ALTA — Botões/configurações sem efeito em produção (CSP bloqueando event handlers inline) 2026-08-14

> **Relatado pelo usuário:** "Os botões de configuração não funcionam" — abas da página Configurações não alternam ("nada acontece"), testado em produção como admin.

- [x] **Causa raiz** ✅ 2026-08-14
  - **CSP** em `vercel.json` (gerado por `scripts/generate-csp.js`) usava `script-src 'self' 'sha256-...'` **sem `'unsafe-inline'`**. Hashes CSP **não se aplicam a event handlers inline** (`onclick="..."`), apenas a blocos `<script>`. O app usa centenas de handlers inline em todas as páginas → **todo botão/aba/select morre em produção**, silenciosamente (só aparece no console do browser: "Executing inline event handler violates... The action has been blocked").
  - Regressão introduzida no commit `7b5f984` ("security: CSP hardening" — trocou `'unsafe-inline'` por hashes). O commit inicial `45062f2` tinha `'unsafe-inline'` e funcionava. Verificações anteriores de produção (HTTP 200 / presença de hashes) não pegam isso — precisa interação real em browser.
- [x] **Reprodução** ✅ 2026-08-14
  - Playwright headless contra **produção**: entrar como Admin via botão DEMO (`demoEnabled:true`) → clicar aba "Planos" → `configPlanos` **não** ativa, `configGeral` permanece; console com o erro CSP de event handler inline. Localmente (mesmo código, modo offline) as abas **funcionam** → confirma que o bug é só o CSP de produção.
- [x] **Fix** ✅ 2026-08-14
  - `scripts/generate-csp.js`: `script-src 'self' 'unsafe-inline' 'sha256-...'` — mantém os hashes (defesa em profundidade) mas restaura o `'unsafe-inline'` **obrigatório** para event handlers inline. Comentário no script explica o invariant para não regredir.
  - **Arquivo:** `scripts/generate-csp.js`, `vercel.json` (regenerado via `npm run build`).
  - **⚠️ Manutenção:** NUNCA remover `'unsafe-inline'` de `script-src` sem antes migrar todos os handlers inline para `addEventListener` — caso contrário todos os botões do site param de funcionar de novo.

## 🟠 ALTA — Biblioteca de Materiais: downloads falham com "Usuário não encontrado" 2026-08-14

> **Relatado pelo usuário:** "a função Biblioteca de Materiais ainda não funciona". Todos os downloads de PDFs falhavam com erro `{"error":"Usuário não encontrado."}` mesmo com usuário ativo e permissões corretas.

- [x] **Causa raiz** ✅ 2026-08-14
  - A Edge Function `get-download-url` executava `.select('role, status, permissions, plan, accessLevel')` na tabela `public.users`, mas a coluna **`accessLevel` não existe** nela (a tabela tem `level`, e o nível é derivado de `plan`). O PostgREST rejeitava o select com 400 → `userData` vinha `undefined` → a função retornava "Usuário não encontrado." **para qualquer usuário** (membro ou staff).
  - O frontend (`membros.html`) primeiro tenta `AUTH.getSignedUrl()` direto no Storage; para membros a RLS bloqueia SELECT (policy `member_download` só permite `is_admin()`), então o fallback via Edge Function era sempre o caminho usado — e estava quebrado. Por isso a biblioteca "não funcionava" para todos.
- [x] **Fix** ✅ 2026-08-14
  - Removido `accessLevel` do select (coluna inexistente); nível do usuário derivado só de `plan` (`free1/modulo2/pro3/premium4`, fallback 1), mantendo a semântica de `getUserAccessLevel` de `js/auth.js`.
  - **Arquivo:** `supabase/functions/get-download-url/index.ts` · deploy feito via `supabase functions deploy get-download-url`.
- [x] **Verificação end-to-end** ✅ 2026-08-14
  - Usuário de teste `teste2@adaspro.com.br` (membro, `permissions:['honda','toyota']`, `plan:'pro'`) criado via signup GoTrue + linha em `public.users`.
  - `get-download-url` retorna `{ok:true, url}` para item permitido (`toyota-ldw`); URL assinada responde HTTP 200 `application/pdf` e baixa o arquivo.
  - Negados corretos: sem permissão (`subaru-type1`) → 403 "Sem permissão"; `contentId` inexistente → 404; `filePath:null` (`honda-acc`) → 404 "Arquivo ainda não disponível".
  - **⚠️ Pendência:** os arquivos em `assets/downloads/**` são **placeholders de texto** (~135–207 bytes, "PLACEHOLDER — Substituir pelo PDF técnico real") e foram estes que estão no bucket `materiais`. O download funciona, mas entrega conteúdo placeholder. Substituir os PDFs reais no bucket quando disponíveis (não deletar os nomes de arquivo).

## 🟠 ALTA — Login "volta pro login" após autenticar 2026-08-14

> **Relatado pelo usuário:** "Não consigo nem entrar / volta pro login". O Supabase Auth **aceitava** as credenciais (`auth.users.last_sign_in_at` atualizado), mas o painel redirecionava de volta para `login.html`.

- [x] **Causa raiz** ✅ 2026-08-14
  - **Colisão de chave localStorage:** o SDK Supabase foi criado com `auth.storageKey = SESSION_KEY` (`adaspro_session`, o MESMO key que `_readSessionCache()` usa para o formato ADAS PRO `{userId, role, token, expiresAt}`). O SDK gravava o próprio formato `{access_token, refresh_token, expires_at, user,...}` na mesma chave → `_readSessionCache()` retornava `null` no fallback offline, e a sessão real nunca era restaurada após reload.
  - **Timeout de 5s do init:** `_doInit()` envolvia `getSession()` + MFA + `_sbLoadUser()` + `_sbLoadAll()` num `Promise.race` de 5s. Em rede lenta (Supabase fora do Brasil), o init estourava → `_mode='local'` com `_sbConfigured=true` → `getSession()` retorna `null` (guarda `_sbConfigured && !_demo`, auth.js) → `requireAuth()` redireciona para `login.html`.
  - O login supabase **não persistia** a sessão ADAS PRO (só `_localLogin` gravava em `adaspro_session`).
- [x] **Fix** ✅ 2026-08-14
  - **Chave separada para o SDK:** `SB_SESSION_KEY = 'adaspro_sb_session'` usada no `createClient` — `adaspro_session` fica exclusiva do formato ADAS PRO (auth.js).
  - **Persistência da sessão ADAS PRO** no sucesso do login supabase e ao reconstruir `_currentSession` no init — o fallback offline restaura a sessão real via `_readSessionCache()`.
  - **Timeout do init de 5s → 15s:** rede lenta não derruba sessão já validada; o fallback offline continua ativo para Supabase inacessível.
  - **`logout()` limpa ambas as chaves** (`adaspro_session` + chave do SDK).
  - **Arquivo:** `js/auth.js`. A guarda `_sbConfigured` (nunca aceitar sessão localStorage quando Supabase está online) foi **preservada** — a sessão cacheada só é aceita via `_currentSession` no fallback offline.

## 🟠 ALTA — Endurecimento de segurança das Edge Functions 2026-08-15

> **Objetivo:** revisão de segurança das 3 Edge Functions após o bug do CSP em produção. Encontradas e corrigidas falhas de autorização/consistência.

- [x] **#73 — `approve-user` delete era soft delete (não removia do Auth)** ✅ 2026-08-15
  - `action:'delete'` removia só a linha de `public.users`; a credencial do Supabase Auth (`auth.users`) continuava válida e o e-mail ficava "preso" (impedia recadastro). Agora executa `auth.admin.deleteUser(targetId)` antes do delete na tabela (tratando "User not found" como idempotente).
  - **Arquivo:** `supabase/functions/approve-user/index.ts`

- [x] **#74 — Autorização da Edge Function mais fraca que a RLS (`can_manage_role`)** ✅ 2026-08-15
  - A Edge Function usa service_role (ignora RLS) e só bloqueava admin/superadmin como alvo — um gestor podia excluir/bloquear/promover outro gestor. Agora há paridade com `can_manage_role`: `ROLE_LEVEL[targetRole] >= ROLE_LEVEL[callerRole]` → 403, para todas as ações (approve/block/unblock/update/delete) e para a role nova no create/update.
  - **Efeito colateral:** superadmin não pode mais criar/promover outro superadmin (paridade estrita com o RLS, que também não permite `can_manage_role('superadmin')`). Criar um segundo superadmin passa a ser operação de banco.

- [x] **#75 — Whitelist de campos no `update` + validação server-side** ✅ 2026-08-15
  - `UPDATE_ALLOWED_FIELDS` (`name, role, status, plan, level, permissions, accessType, accessExpires, approvedBy`); id/email/passwordHash/createdAt nunca são aceitos. Validação de valores: role/status/plan dentro de whitelist, permissions = array de strings. Senha no `create` agora exige mín. 8 chars no servidor (paridade com o cliente).
  - **Arquivo:** `supabase/functions/approve-user/index.ts`

- [x] **#76 — `notify`: cap diário + validação de destinatário** ✅ 2026-08-15
  - Rate limit de 20/min mantido; adicionado cap de 100 emails/dia por usuário (anti-spam via conta comprometida). Eventos `user_approved`/`ticket_reply` agora exigem destinatário existente e `status='active'` em `public.users` — impede envio arbitrário no domínio.
  - **⚠️ Pendência manual (#24):** a função `notify` está sem `RESEND_API_KEY` no ambiente — configurar no Dashboard → Edge Functions → notify (env vars: `RESEND_API_KEY`, `ADMIN_EMAIL`, `SITE_URL`).
  - **Arquivo:** `supabase/functions/notify/index.ts`

- [x] **Verificação** ✅ 2026-08-15
  - `npx deno check` limpo nas 2 funções. Deploy: `supabase functions deploy approve-user` e `... notify`.
  - Testes ao vivo (não destrutivos) com `testesa@adaspro.com.br`: create com senha fraca → 400; create role=superadmin → 403; update sobre role igual/superior → 403; update com `passwordHash` no payload → campo strippado (name aplicado e restaurado); delete target inexistente → 404; notify sem `RESEND_API_KEY` → 500 (env não configurado).

## 🟠 ALTA — Auditoria de segurança 2026-08-15 (agente + MCP + verificação ao vivo)

> **Objetivo:** auditoria completa após o endurecimento das Edge Functions. Relatório: `security-audit-report.md`. Teste via agente especialista + grafos do MCP (codebase-memory) + requests ao ambiente real.

- [x] **#77 — XSS stored em `admin.html` (título de material dentro de `onclick`)** ✅ 2026-08-15
  - `esc(c.title)` em string JS de `onclick` (`admin.html:1102`): o decode do parser HTML devolve `'` e quebra a string → payload `x','alert(1)//` executa no browser de qualquer admin/superadmin. Trocar para `jsStr(c.title)` (padrão já usado em `superadmin.html:2713`).
  - **Nota:** o achado correlato `admin.html:1096` (`title="${esc(c.filePath)}"`) foi **refutado** — atributos HTML não quebram via entidades (tokenizer HTML5 decodifica entidades só após definir a fronteira do valor).
  - **Arquivo:** `admin.html` (deploy Vercel pendente).

- [x] **#78 — SECURITY DEFINER sem `SET search_path`** ✅ 2026-08-15
  - As 5 funções auxiliares (`get_my_role`, `is_admin`, `is_superadmin`, `can_manage_role`, `is_admin_staff`) ganharam `SECURITY DEFINER SET search_path = ''` — proteção anti `pg_temp` para o caso de refatoração futura (refs hoje 100% `public.`-qualificadas).
  - **Aplicado no banco:** `supabase db query --linked -f` (bloco das funções); verificado via `pg_proc.proconfig` = `[search_path=""]`.
  - **Padrão novo:** toda nova função SECURITY DEFINER em `rls_policies.sql` deve declarar `SET search_path` + qualificar com `public.`.
  - **Arquivo:** `sql/rls_policies.sql`.

- [x] **#79 — Duplo-escape no chat do membro (bug de exibição)** ✅ 2026-08-15
  - `membros.html:1626` aplicava `esc(raw)` antes de salvar e o render (`:1604`) escapava de novo → entidades HTML exibidas literalmente (`&lt;script&gt;`). Removido o pré-escape; a sanitização passa a acontecer apenas na renderização.
  - **Arquivo:** `membros.html` (deploy Vercel pendente).

- [x] **Não corrigido (decisão do usuário) — demo ativo em produção** 🟡 2026-08-15
  - Verificado ao vivo: `https://adaspro.com.br/js/supabase-config.js` → `demoEnabled: true`. Bloco "Entrar como Admin — DEMO" exposto no login de produção. Dados reais protegidos (JWT/RLS). Correção requerida: `DEMO_ENABLED=false` no dashboard do Vercel (ver pendências manuais).

- [x] **Verificação** ✅ 2026-08-15
  - MCP (`codebase-memory`): mapeou usos de `esc()`/`jsStr()` e `onclick` em todos os painéis; ids não-escapeados (`${c.id}`, `${u.id}`, `${t.id}`) são gerados pela app (não-exploráveis).
  - Banco: `search_path=""` confirmado nas 5 funções via `pg_proc`.
  - HTML: fixes em `admin.html` e `membros.html` — **deploy Vercel pendente** (`vercel deploy --prod`).


## 🟢 FEATURE — Boletins técnicos em formato técnico/científico 2026-08-15

> **Objetivo:** melhorar a apresentação dos boletins técnicos com base em pesquisa web (TSBs reais Nissan NTB25-002/NTB23-076, Ford 21-2389/22-2229/21-2420, Honda 15-046), modelo de dados enriquecido e editor estruturado.

- [x] **#82 — Modelo enriquecido de boletim + editor estruturado + render técnico/científico** ✅ 2026-08-15
  - **Novos campos** (opcionais): `classification`, `reference`, `severity` (info/moderate/critical), `summary` (abstract), `appliedVehicles[]`, `appliedSystems[]`, `component`, `dtcs[]`, `reportedSymptoms[]`, `rootCause`, `calibrationType` (Estática/Dinâmica), `preconditions[]`, `requiredTools[]`, `specsTable[]` ({param,value,note}), `steps[]`, `passCriteria[]`, `failureActions[]`, `referenceDocs[]`.
  - **Editor (`superadmin.html`):** 4 grupos `<details>` no sidebar (Ficha técnica / Diagnóstico / Procedimento / Verificação & referências) com ids `edMeta*`; prefill em `openEditor`; parse em `saveEditorDraft` (helpers `_lines`/`_csv`/`_specs` — specs no formato `Parâmetro | Valor | Observação`); CSS `.ed-meta-details`/`.ed-meta-area`/`.ed-meta-hint`.
  - **Render membro (`membros.html`):** `openBulletin` usa `data-blt-id` + `AUTH.getBulletinById` → `_renderBulletin(b)` com 9 seções numeradas, abstract com keywords, ficha técnica em grid, tabela de especificações, checklist interativo com barra de progresso (`updateBltStepProgress`), botões Copiar resumo / Imprimir (`printBulletin` via DOM copy). Fallback DOM preservado para cards estáticos.
  - **Cards dinâmicos:** `renderBulletinsDynamic()` agora emite `data-blt-id`, usa `b.summary` na descrição e chips informativos (tipo de calibração / DTC / nº de passos).
  - **Tabela editorial:** coluna de número mostra `reference` (fallback `id`); busca inclui `reference` e `classification`.
  - **Seed (`seedEditorialDemo`):** 3 boletins realistas com todos os campos novos (procedimento completo, atualização de scanner, alerta BSM crítico).
  - **Deploy:** Vercel prod ✅ verificado (membros: `data-blt-id`, `blt-info-chip`, `_renderBulletin`; superadmin: `ed-meta-details`, `edMetaSummary`, `NTP-ADAS-011`, `seedEditorialDemo`).
  - **Pendências de sincronização:** `DEFAULT_CONTENT` (auth.js) não precisa mudar (boletins são só localStorage); se boletins migrarem para Supabase, `CONTENT_MAP`/`get-download-url` não é afetado (são PDFs).

## 🟢 FEATURE — Boletins v2: mais conteúdo + estrutura reorganizada 2026-08-15

> **Objetivo:** refatorar e reorganizar a apresentação dos boletins técnicos com mais conteúdo (formato de TSB de montadoras) e estrutura navegável.

- [x] **#83 — Reorganização do render + novos campos estruturados** ✅ 2026-08-15
  - **Render membro (`membros.html`):** `_renderBulletin` reescrito com builder de seções — até 17 seções numeradas com **TOC navegável** (`.blt-toc-chip` + `scrollToBltSec`): Identificação técnica, Resumo, Veículos aplicados (tabela Modelo|Ano|Motor|Chassi se `vehicleTable`, senão chips), Sistemas afetados, Sintomas & DTCs, Causa raiz, Critérios de aplicação, Pré-requisitos & segurança, Ferramentas & materiais (tabela de peças), Especificações, Procedimento (checklist), Verificação, **Solução de problemas** (matriz Sintoma|Causa|Ação), Serviço & garantia, Referências, Anexos, Informações adicionais.
  - **Novos campos** (opcionais): `revision`, `supersedes`, `vehicleTable[]` ({model,year,engine,chassis}), `applicability[]`, `safetyNotes[]`, `parts[]` ({part,pn,qty}), `symptomAction[]` ({symptom,cause,action}), `labor` {code,time,note}, `warranty`, `attachments[]`.
  - **Severidade** ganhou badge colorido (info/moderado/crítico) no cabeçalho e chip nos cards dinâmicos.
  - **Editor (`superadmin.html`):** campos novos nos 4 grupos `<details>` + novo grupo **🕐 Serviço & garantia**; parse com helper `_rows(id, n)` (formato colunas separadas por `|`); prefill em `openEditor`; CSS `.ed-meta-hint` etc.
  - **Seed:** 3 boletins enriquecidos com todos os campos v2 (procedimento completo com peças PN reais, matriz de diagnóstico no alerta crítico, aplicabilidade no scanner).
  - **Impressão:** CSS de print atualizado para cobrir `.blt-table`, `.blt-dtc-chip`, `.blt-sym`, `.blt-sev-badge`, callouts warn/comp; TOC oculto.
  - **Backward-compat:** boletins antigos renderizam sem os campos novos (seções vazias são omitidas).
  - **Deploy:** Vercel prod ✅ verificado (membros: `blt-toc-chip`, `scrollToBltSec`, `blt-sev-badge`, `blt-table`, `blt-dtc-chip`; superadmin: `edMetaVehicleTable`, `edMetaSymptomAction`, `edMetaLaborCode`, `edMetaSafetyNotes`).

## 🔧 FIX — Cache travado / atualizações não chegavam + rotina automática de reseed 2026-08-15

> **Sintoma:** usuário não via as atualizações dos boletins mesmo após deploy (cache do navegador/edge e seeds antigos no localStorage).

- [x] **#84 — Limpeza de cache + automação de reseed** ✅ 2026-08-15
  - **Cache-Control HTML:** regra em `vercel.json` para `/:page(...)` + `/` com `no-cache, no-store, must-revalidate` (o `{...}`/regex livre do path-to-regexp não casavam; resolvido com param nomeado `:page(admin|membros|...)`). Verificado via curl em todas as páginas. CSP/HSTS mantidos.
  - **Cache-busting de assets:** `?v=20260815` em todos os `js/*` e `css/*` locais (exceto `supabase.min.js`, que tem SRI). Garante que o navegador baixe os arquivos novos.
  - **Rotina `_autoReseedDemo()` (superadmin.html):** na inicialização do painel, compara `localStorage['adaspro_seed_version']` com `_SEED_VERSION`; se desatualizado e o conteúdo armazenado for **todo de origem seed** (itens com `_seed` ou títulos legacy), limpa `adaspro_bulletins`/`adaspro_articles` e re-executa o seed automaticamente (sem confirmar). Se houver conteúdo criado pelo usuário, **preserva** e só marca a versão. Para bump de versão do seed: mudar `_SEED_VERSION` e adicionar os novos itens com `_seed: _SEED_VERSION`.
  - **Novas APIs em auth.js:** `AUTH.replaceBulletins(items)` / `AUTH.replaceArticles(items)` (substituem o array no localStorage).
  - **Migração:** seeds legados v1 identificados por título (`_LEGACY_SEED_TITLES`) → substituídos na primeira abertura do superadmin.
  - **Deploy:** Vercel prod ✅ — assets versionados 200, rotina presente em prod, header `no-cache, no-store` ativo.

## ✨ FEATURE — Módulo Ajuda reformulado com guia passo a passo e prints dos painéis 2026-08-15

> **Solicitação:** "no modulo ajuda melhore com mais detalhe, imagens de telas, caminho passo a passo mais rico em detalhes, refatore".

- [x] **#85 — Guia de Uso com walkthroughs + screenshots + lightbox** ✅ 2026-08-15
  - **Refatoração do `#ajuda-guia` (superadmin.html):** 8 cards de walkthrough (Dashboard, Admins, Segurança, Planos, Sistema, Auditoria, Biblioteca, Editorial), cada um com passos numerados detalhados, badge de seção, screenshot ampliável e callout de dica/boas práticas.
  - **Prints reais dos painéis:** `.tab_*.png`/`.screenshot_user.png` do projeto copiados para `assets/img/ajuda/` com nomes limpos (dashboard, admins, security, plans, system, audit, biblioteca, editorial, referencia, area-do-membro). Thumbnails `loading="lazy"` (PNGs originais ~2351×1351; sem imagemagick/pngquant no ambiente → mantidos originais).
  - **Lightbox `#shotLightbox`:** overlay fullscreen com zoom da imagem + legenda; abre por clique na thumbnail (`openShot(src, cap)`), fecha por ✕, clique no fundo ou **ESC** (`closeShot`); trava o scroll do body enquanto aberto.
  - **CSS novo `.help-*`:** hero com TOC (âncoras `#ajuda-passo-*`), steps numerados com bolinhas, `code` inline, chips, callouts `.help-dica` e `.help-extra`. Responsivo (grid 2 col → 1 col em ≤900px).
  - **Conteúdo detalhado por seção:** hierarquia/paridade de roles, cadeia de acesso (plano → moduleAccess → access/downloadLevel → visibilidade), sincronização CONTENT_MAP ↔ DEFAULT_CONTENT, reseed automático, MFA/rate-limit/sessão 4h, modo manutenção + mensagem global, webhook X-Secret, e o fluxo completo do editor editorial (boletins BT-AAAA-NNN, ficha técnica, autosave 30s).
  - **Aba Versões & Changelog:** linha nova `v3.1.0 — build 20260815` (boletins v2 + fix de cache + reseed + guia).
  - **Aba Orientações & FAQ:** 2 perguntas novas — "Meus boletins voltaram ao padrão?" (explica reseed/`adaspro_seed_version`/marcador `_seed`) e "Atualizei e nada mudou?" (cache `no-cache` + `Ctrl+Shift+R`).
  - **Validação:** bloco inline de script passou em `new Function` (syntax check); deploy Vercel prod ✅ verificado — `superadmin`: markers `openShot`/`shotLightbox`/`ajuda-passo-*`, 8 PNGs de `assets/img/ajuda/` 200, linhas `v3.1.0`/`reseed automático`/`Ctrl+Shift+R` presentes.
  - **Nota:** `area-do-membro.png` e `referencia.png` foram copiados para `assets/img/ajuda/` como referência futura (ainda não usados no guia).
