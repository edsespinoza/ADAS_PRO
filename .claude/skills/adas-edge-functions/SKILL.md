---
name: adas-edge-functions
description: Resumo compactado das 4 Edge Functions Supabase do ADAS PRO — approve-user, get-download-url, notify e api-gateway. Cobre API, autenticação, lógica de negócio, env vars, CORS e padrões de erro. Usar antes de qualquer tarefa que toque nas funções ou no deploy delas.
type: reference
---

# ADAS PRO — Edge Functions (Deno + Supabase)

Deploy: `supabase functions deploy <nome>`  
Runtime: Deno · `deno.land/std@0.224.0` (api-gateway) / `std@0.177.0` (demais) · `esm.sh/@supabase/supabase-js@2`  
CORS geral: `approve-user` e `get-download-url` hardcodam `https://adaspro.com.br`. `notify` lê do env `SITE_URL`. `api-gateway` lê o `Origin` do request e valida contra `['https://adaspro.com.br']`.

**Padrão de autenticação comum às 3 funções internas:**
```ts
// 1. Valida JWT do chamador via anonKey
const supabaseUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
const { data: { user } } = await supabaseUser.auth.getUser();

// 2. Busca role/status no banco via service_role
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
const { data } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
```

---

## 1. `approve-user`

**Env vars:** `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`  
**Caller autorizado:** `admin` | `gestor` | `superadmin`  
**Método:** POST · body JSON

### Actions

| Action | targetId | Restrição de role |
|---|---|---|
| `approve` | obrigatório | admin+ |
| `block` | obrigatório | admin+ |
| `unblock` | obrigatório | admin+ |
| `update` | obrigatório | admin+ (promover para admin/superadmin: só superadmin) |
| `delete` | obrigatório | admin+ (superadmin nunca pode ser excluído) |
| `create` | não usa | superadmin para criar admin/superadmin; admin para membro/gestor |

### Action `create` — campos
```ts
{ action:'create', email, password, name,
  role?:'membro',    // default
  status?:'active',  // default
  permissions?:[],
  plan?, level? }
```
Fluxo: `auth.admin.createUser()` → `insert public.users` → rollback (`deleteUser`) se insert falhar.  
Retorna: `{ ok: true, data: { userId } }`

### Actions `update` — campos protegidos
`id`, `email` e `passwordHash` são deletados do payload antes do UPDATE — nunca sobrescritos via esta action.

### Auditoria
Todas as actions registram em `audit_logs`. Falha no log **não bloqueia** a action — apenas loga o erro (`console.error`).

### Resposta padrão
```ts
{ ok: true }          // sucesso
{ error: 'mensagem' } // erro (status 400/401/403/500)
```

---

## 2. `get-download-url`

**Env vars:** `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`  
**Caller autorizado:** qualquer usuário autenticado com `status:'active'`  
**Método:** POST · body `{ contentId: string }`

### Fluxo
```
1. Valida JWT → identifica user
2. Busca { role, status, permissions } no banco via service_role
3. Verifica status === 'active'
4. Lookup contentId em CONTENT_MAP → { cat, filePath }
5. Verifica permissão: isStaff OU permissions[].includes(cat)
6. createSignedUrl(filePath, 3600) → URL assinada 1 hora
7. INSERT audit_logs { action:'download_content', actor_id, target_id:contentId }
8. Retorna URL
```

**Regra de auditoria:** se o INSERT em `audit_logs` falhar → retorna HTTP 500 e **bloqueia o download**. Intencional — nenhum download sem registro.

### Resposta de sucesso
```ts
{ ok: true, url: '<signed-url>', expiresIn: 3600 }
```

### CONTENT_MAP — 22 entradas (deve ficar em sincronia com `DEFAULT_CONTENT` em `auth.js`)

| ID | cat | filePath |
|---|---|---|
| `honda-lkas` | honda | `honda/honda-lkas.pdf` |
| `honda-avm` | honda | `honda/honda-avm.pdf` |
| `honda-acc` | honda | `honda/honda-acc.pdf` |
| `toyota-ldw` | toyota | `toyota/toyota-ldw.pdf` |
| `toyota-180` | toyota | `toyota/toyota-180.pdf` |
| `toyota-avm` | toyota | `toyota/toyota-avm.pdf` |
| `nissan-lka` | nissan | `nissan/nissan-lka.pdf` |
| `nissan-propilot` | nissan | `nissan/nissan-propilot.pdf` |
| `nissan-radar` | nissan | `nissan/nissan-radar.pdf` |
| `subaru-type1` | subaru | `subaru/subaru-type1.pdf` |
| `subaru-type2` | subaru | `subaru/subaru-type2.pdf` |
| `hyundai-avm` | hyundai | `hyundai/hyundai-avm.pdf` |
| `hyundai-radar` | hyundai | `hyundai/hyundai-radar.pdf` |
| `audi-lidar` | vag | `vag/audi-lidar.pdf` |
| `vag-avm` | vag | `vag/vag-avm.pdf` |
| `mercedes-night` | mercedes | `mercedes/mercedes-night.pdf` |
| `mercedes-rcw` | mercedes | `mercedes/mercedes-rcw.pdf` |
| `ford-avm` | ford | `ford/ford-avm.pdf` |
| `radar-univ` | radar | `radar/radar-univ.pdf` |
| `mazda-avm` | mazda | `mazda/mazda-avm.pdf` |
| `mitsubishi-lka` | mitsubishi | `mitsubishi/mitsubishi-lka.pdf` |
| `byd-avm` | chineses | `chineses/byd-avm.pdf` |
| `mg-chery` | chineses | `chineses/mg-chery.pdf` |

> ⚠️ Adicionar PDF = editar CONTENT_MAP + `DEFAULT_CONTENT` em `auth.js` + `supabase functions deploy get-download-url`

---

## 3. `notify`

**Env vars:** `RESEND_API_KEY` · `ADMIN_EMAIL` · `SITE_URL` · `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`  
**Caller autorizado:** `admin` | `gestor` | `superadmin`  
**Método:** POST · body `{ event, data }`  
**CORS:** lê do env `SITE_URL` (diferente das outras duas que hardcodam `adaspro.com.br`)  
**Remetente:** `ADAS PRO <noreply@adaspro.com.br>`

### Eventos

| event | Destinatário | data esperado |
|---|---|---|
| `new_user` | `ADMIN_EMAIL` | `{ userName, userEmail, level }` |
| `user_approved` | email do usuário | `{ userName, userEmail }` |
| `ticket_reply` | email do usuário | `{ userEmail, ticketId, ticketTitle, message }` |

### Templates HTML
Estrutura base: `baseWrapper(accentColor, accentLabel, previewText, body)` — header escuro `#0D1821`, rodapé com data BRT, responsivo (media query 600px), compatível Outlook/Gmail.

| Evento | Cor de acento | Badge |
|---|---|---|
| `new_user` | `#FF6B35` (alert orange) | `NOVO CADASTRO` |
| `user_approved` | `#06A77D` (success green) | `ACESSO APROVADO` |
| `ticket_reply` | `#00B4D8` (tech cyan) | `SUPORTE TÉCNICO` |

Todos os dados do usuário passam por `esc()` antes de renderizar no HTML (previne XSS nos templates de email).

### Pendências para ativar em produção
- Criar conta Resend + verificar domínio `adaspro.com.br` (DNS TXT/DKIM)
- Configurar env vars no Supabase Dashboard → Edge Functions → notify
- Re-deploy: `supabase functions deploy notify`

---

## Padrão de helper `json()`

Todas as funções usam o mesmo helper:
```ts
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

---

## 4. `api-gateway` (API pública)

**Env vars:** `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_ANON_KEY`  
**Auth:** `verify_jwt=False` — a função valida ela mesma (API Key OU JWT)  
**Método:** GET/POST · ação via `?action=` ou body `{ action }`  
**Rate limit:** compartilhado via tabela `public.rate_limits` (janela de 1 min, limite 100) — substitui o Map in-memory.

### Autenticação (2 vias)
- **`X-API-Key: adas_live_...`** → hash SHA-256, lookup em `api_keys` (`key_hash`, `active=true`)
- **`Authorization: Bearer <JWT>`** → `auth.getUser()` + `users.status='active'`
- Ausência de ambos → 401 `NO_AUTH`

### Rate limiting (tabela `rate_limits`)
```ts
admin.rpc('increment_rate_limit', { p_bucket, p_window, p_limit:100, p_window_ms:60000 })
```
- Retorna contagem pós-incremento; `count <= 100` → allowed.
- Cabeçalhos de resposta: `X-RateLimit-Limit/Remaining/Reset`.
- **Fail-open:** se o RPC falhar, não bloqueia tráfego (autenticação+RLS já protegem).

### Ações (`action`)
| action | params | Depende da tabela |
|---|---|---|
| `list_content` | `category?`, `page?`, `per_page?` | CONTENT_MAP (in-code) |
| `get_content` | `id` | CONTENT_MAP |
| `get_download_url` | `contentId`/`id` | `materiais` storage + `users.plan` |
| `list_categories` | — | CATEGORIES (in-code) |
| `get_user` | — | `users` |
| `update_progress` | `contentId`, `progress`, `completed` | **`user_progress`** |
| `list_bulletins` | `type?` | **`bulletins`** (status=published) |
| `list_articles` | — | **`articles`** (status=published) |
| `list_certifications` | — | in-code (3 níveis) |
| `submit_quiz` | `certificationId`, `moduleId`, `answers` | **`quiz_questions`** + **`quiz_results`** |

### `submit_quiz` — regras
- Gabarito buscado **server-side** em `quiz_questions` (correção nunca no cliente).
- Sem perguntas → 409 `QUIZ_UNAVAILABLE`.
- Nota = % de acertos; `passed = score >= 70`. Insere em `quiz_results`.

### Dependências de tabela (criadas em `sql/content_tables.sql`)
> ⚠️ `api-gateway` usa **service_role**, logo ignora RLS. As tabelas abaixo precisam **existir** no banco (agora criadas): `api_keys`, `rate_limits`, `user_progress`, `bulletins`, `articles`, `quiz_questions`, `quiz_results`.

### CORS / Preflight
- `ALLOWED_ORIGINS = ['https://adaspro.com.br']`; OPTIONS retorna capitações.
- Headers permitidos: `authorization, content-type, x-api-key`.

### Teste rápido
```bash
curl -s "https://zqydyyticvtmirjzskly.supabase.co/functions/v1/api-gateway?action=list_categories" \
  -H "Authorization: Bearer <JWT ou x-api-key>"
```

---

## Checklist antes de deploy

- [ ] Env vars configuradas no Supabase Dashboard para a função específica
- [ ] CORS correto (`approve-user`/`get-download-url`: hardcoded; `notify`: via `SITE_URL`; `api-gateway`: lista `ALLOWED_ORIGINS`)
- [ ] `CONTENT_MAP` sincronizado com `DEFAULT_CONTENT` (apenas `get-download-url` e `api-gateway`)
- [ ] Tabelas usadas por `api-gateway` existem (`user_progress`, `bulletins`, `articles`, `quiz_questions`, `quiz_results` — ver `sql/content_tables.sql`)
- [ ] `supabase functions deploy <nome>`
