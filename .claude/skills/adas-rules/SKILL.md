---
name: adas-rules
description: Regras de negócio do ADAS PRO — roles, planos, permissões de acesso/download, fluxo de aprovação, validação server-side, RLS e invariantes críticos. Usar antes de qualquer tarefa que toque em auth, permissões, planos ou fluxos de acesso.
type: reference
---

# ADAS PRO — Regras de Negócio

Fontes: `js/auth.js` · `supabase/functions/get-download-url/index.ts` · `supabase/functions/approve-user/index.ts` · `sql/rls_policies.sql`

---

## 1. Hierarquia de Roles

```
superadmin (4) > admin (3) > gestor (2) > membro (1)
```

`hasRole(userRole, required)` compara níveis numéricos — role com nível ≥ required passa.

| Role | Cria contas | Aprova usuários | Acessa todos os dados | Exclui usuários |
|---|---|---|---|---|
| `superadmin` | admin/qualquer | ✅ | ✅ | ✅ |
| `admin` | apenas membro/gestor | ✅ | ✅ | ❌ |
| `gestor` | ❌ | ✅ (só membros) | ✅ | ❌ |
| `membro` | ❌ | ❌ | só os próprios | ❌ |

**Regra de promoção:** apenas `superadmin` pode elevar role para `admin` ou `superadmin`. Admin não pode promover outro admin.

---

## 2. Status de Usuário e Fluxo de Aprovação

```
registro → status:'pending'
         ↓ admin aprovação
         status:'active'   ←→   status:'blocked'
```

- Novo registro via `AUTH.register()` → `status:'pending'`, `role:'membro'`, `plan:'free'`
- Usuário `pending` pode fazer login mas recebe tela "Aguardando aprovação" — nunca acessa painel
- Aprovação: `approve-user` Edge Function com `action:'approve'` (grava `approvedAt`, `approvedBy`)
- Bloqueio: `action:'block'` → `status:'blocked'` → `getSession()` chama `logout()` automaticamente
- Desbloqueio: `action:'unblock'` → volta para `status:'active'`

**Regra de proteção:** conta `superadmin` nunca pode ser excluída (guard na Edge Function).  
**Regra de proteção:** admin não pode agir sobre outro admin ou superadmin — apenas superadmin pode.

---

## 3. Planos e Permissões de Categoria

| Plano | id | Preço | Categorias incluídas |
|---|---|---|---|
| Gratuito | `free` | R$ 0 | nenhuma (apenas demo) |
| Módulo | `modulo` | R$ 47/mês | 1 categoria à escolha (`boughtModules[]`) |
| Pro | `pro` | R$ 97/mês | `honda`, `toyota`, `nissan` |
| Premium | `premium` | R$ 197/mês | todas as 12 categorias |

**12 categorias:** `honda` · `toyota` · `nissan` · `subaru` · `hyundai` · `vag` · `mercedes` · `ford` · `radar` · `mazda` · `mitsubishi` · `chineses`

Permissões efetivas ficam em `user.permissions: string[]` — array de IDs de categoria. Staff (`admin`, `gestor`, `superadmin`) tem acesso implícito a tudo, sem checar `permissions`.

---

## 4. Regras de Acesso a Conteúdo (PDFs)

Cada item do catálogo tem dois níveis numéricos:

| Campo | Significado |
|---|---|
| `accessLevel` | Nível mínimo de role para **ver** o item na biblioteca |
| `downloadLevel` | Nível mínimo de role para **baixar** o arquivo |

Mapeamento numérico: `membro=1 · gestor=2 · admin=3 · superadmin=4`

**Validação no cliente** (`auth.js → getContentForUser()`):
- Filtra por `hasRole(user.role, accessLevel)` + `user.permissions.includes(item.cat)` (ou staff)

**Validação server-side** (`get-download-url/index.ts`) — a única que importa para segurança:
```
1. Valida JWT → identifica user
2. Busca user no banco via service_role
3. Verifica status === 'active'
4. Verifica permissão: isStaff OU permissions[].includes(item.cat)
5. Gera URL assinada (1h) via Supabase Storage
6. Registra em audit_logs (OBRIGATÓRIO — bloqueia download se log falhar)
```

**`CONTENT_MAP` na Edge Function** deve ter exatamente os mesmos 22 IDs que `DEFAULT_CONTENT` em `auth.js`. Adicionar PDF = editar ambos + `supabase functions deploy get-download-url`.

---

## 5. Regras de Criação de Usuários

Via Edge Function `approve-user` com `action:'create'`:

```
Campos obrigatórios: email, password, name
Campos opcionais:    role (default:'membro'), status (default:'active'),
                     permissions[], plan, level
```

- Criação de `admin`/`superadmin` só por `superadmin`
- Se insert em `public.users` falhar → rollback: deleta usuário do Supabase Auth
- Auditoria registrada com `action:'create_user'`

Via `AUTH.createUserDirect()` (modo local/offline): mesma validação de role, sem Edge Function.

---

## 6. Regras de Fallback Offline

Quando Supabase está configurado mas inacessível (timeout 5 s):

| Role | Recebe fallback local? |
|---|---|
| `superadmin` | ✅ — seed offline (`ADAS_OFFLINE_SA_2026`) |
| `admin` | ✅ — seed offline (`ADAS_OFFLINE_AD_2026`) |
| `gestor` | ✅ — seed offline (se existir) |
| `membro` | ❌ — nunca recebe fallback local com Supabase ativo |

**Razão:** impede que seeds de dev sejam usados como membros em produção. Comportamento intencional — não remover.

Demo mode (`_demo=true`): ignora completamente o Supabase. Ativado pelos botões "DEMO" em `login.html` apenas quando `SUPABASE_CONFIG.demoEnabled === true`. Em produção deve ser `false`.

---

## 7. RLS — Enforcement no Banco

Funções `SECURITY DEFINER` (executam como owner, ignoram RLS):
- `get_my_role()` → retorna role do `auth.uid()` atual
- `is_admin()` → `role IN ('admin', 'gestor', 'superadmin')`
- `is_superadmin()` → `role = 'superadmin'`

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | próprio OU admin+ | próprio (role=membro, status=pending) OU admin+ | próprio (sem mudar role/status) OU admin+ | só superadmin |
| `tickets` | dono OU admin+ | dono (`userId=auth.uid`) | dono OU admin+ | admin+ |
| `notifications` | dono OU admin+ | dono OU admin+ | dono OU admin+ | admin+ |

**Regra crítica em `users` UPDATE:** `WITH CHECK` compara os novos valores com os valores atuais no banco — impede que membro se promova para admin via UPDATE direto.

---

## 8. Regras de Auditoria

Toda ação admin é registrada em `audit_logs`:
- `AUTH.logAudit(action, targetId, details)` → `try/catch` com `await` (nunca `.catch()` puro)
- `get-download-url`: falha no log **bloqueia** o download (retorna 500) — intencional
- `approve-user`: falha no log **não bloqueia** a ação admin — apenas loga o erro

---

## 9. Regras de Email Transacional

Função `notify` requer caller com role `admin`, `gestor` ou `superadmin` (valida JWT).

| Evento | Destinatário | Quando disparar |
|---|---|---|
| `new_user` | `ADMIN_EMAIL` (env) | após `AUTH.register()` bem-sucedido |
| `user_approved` | email do usuário aprovado | após `approve-user` action:'approve' |
| `ticket_reply` | email do dono do ticket | após admin responder ticket |

CORS da função `notify` lê do env var `SITE_URL`. As outras duas Edge Functions têm CORS hardcoded para `https://adaspro.com.br`.

---

## 10. Invariantes Críticos

| Invariante | Arquivos envolvidos | Consequência se quebrar |
|---|---|---|
| `CONTENT_MAP` (Edge Fn) = `DEFAULT_CONTENT` (auth.js) | `get-download-url/index.ts` + `js/auth.js` | Download retorna 404 em produção |
| `_sbConfigured` permanece `true` mesmo offline | `js/auth.js:_doInit` | Loop redirect login→painel |
| `adaspro_demo='1'` gravado antes do redirect | `js/auth.js:enterDemoMode` | Loop redirect no demo (fix #51) |
| Senhas seed ≠ senhas produção Supabase | `js/auth.js:199–200` | Fallback offline vira vetor de acesso |
| `users_update` WITH CHECK preserva role/status | `sql/rls_policies.sql:88–93` | Membro se auto-promove para admin |
| CSP hardcoda `zqydyyticvtmirjzskly.supabase.co` | `vercel.json:27` | Troca de projeto Supabase quebra CSP |
