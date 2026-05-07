# ADAS PRO — Controle de Tarefas e Melhorias

**Projeto:** ADAS PRO Platform  
**Última atualização:** 2026-05-07 (Fix #53–#59 — segurança admin, auditoria, expiração, downloads, UX)  
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

- [ ] **#45 — [F-04 / M-01] `hashSimple` não é bcrypt — substituir por PBKDF2 no fallback local**
  - **Validado por ambos os agents.**
  - Algoritmo atual: FNV-1a + DJB2, 500 iter, digest 64 bits — brute-force trivial se localStorage exfiltrado.
  - **Fix:** Usar `crypto.subtle.deriveBits` com PBKDF2 (≥100.000 iter, SHA-256) para o fallback local, ou desabilitar login local completamente quando `_sbConfigured = true`.
  - **Arquivo:** `js/auth.js:237–253`

- [ ] **#46 — [F-05 / L-05] CSP `unsafe-inline` — migrar event handlers inline para `addEventListener`**
  - **Validado por ambos os agents.**
  - `'unsafe-inline'` em `script-src` e `style-src` neutraliza toda proteção XSS da CSP.
  - **Fix:** Migrar `onclick`, `onsubmit`, `onmouseover` inline dos HTMLs para `addEventListener` em arquivos JS separados; usar nonce CSP via Vercel Edge Middleware nos `<script>` restantes.
  - **Arquivos:** `vercel.json:27` · `login.html` · `admin.html` · `membros.html` · `superadmin.html`

- [ ] **#47 — [F-06] `RESEND_API_KEY` armazenada em localStorage plaintext**
  - Exfiltrável via XSS — permite spam e phishing via domínio `adaspro.com.br`.
  - **Fix:** Exigir digitação da chave a cada sessão de teste (não persistir); adicionar aviso explícito e limpeza automática ao fechar `email-config.html`.
  - **Arquivo:** `email-config.html:598–606`

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

## 🔵 BAIXO — Auditoria VoltAgent 2026-05-04 (backlog)

- [ ] **#50 — Findings de baixa prioridade (agrupar em uma sessão de cleanup)**
  - **[F-08]** Rate limiting bypassável via incógnito — aceitável enquanto Supabase Auth tem rate limiting server-side (`auth.js:273`)
  - **[F-10]** Edge Functions com `deno.land/std@0.177.0` — fixar para `0.224.0` e `esm.sh/@supabase/supabase-js@2.49.0` (`functions/*/index.ts:5`)
  - **[F-13]** Sessão cacheada de bloqueado restaurada em modo offline sem check de `status` (`auth.js:362`)
  - **[F-14]** `importData()` aceita JSON sem sanitizar campos `role`/`status` — risco insider (`auth.js:1067`)
  - **[F-15]** `supabase.min.js` sem hash SRI (`login.html:180` · `mfa-verify.html:164`)
  - **[L-03]** `build-config.js` interpola env vars sem escape — substituir por `JSON.stringify(url)` (`scripts/build-config.js:33`)
  - **[L-06]** `_legacyDjb2` provavelmente dead code em produção — confirmar e remover (`auth.js:263`)

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

## REFERÊNCIAS

- Supabase Dashboard: https://supabase.com/dashboard/project/zqydyyticvtmirjzskly
- Vercel Dashboard: https://vercel.com
- Produção: https://adaspro.com.br
- OWASP Top 10: https://owasp.org/www-project-top-ten/
