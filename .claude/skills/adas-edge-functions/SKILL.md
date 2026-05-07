---
name: adas-edge-functions
description: Resumo compactado das 3 Edge Functions Supabase do ADAS PRO — approve-user, get-download-url e notify. Cobre API, autenticação, lógica de negócio, env vars, CORS e padrões de erro. Usar antes de qualquer tarefa que toque nas funções ou no deploy delas.
type: reference
---

# ADAS PRO — Edge Functions (Deno + Supabase)

Deploy: `supabase functions deploy <nome>`  
Runtime: Deno · `deno.land/std@0.177.0` · `esm.sh/@supabase/supabase-js@2`  
CORS geral: `approve-user` e `get-download-url` hardcodam `https://adaspro.com.br`. `notify` lê do env `SITE_URL`.

**Padrão de autenticação comum às 3 funções:**
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

## Checklist antes de deploy

- [ ] Env vars configuradas no Supabase Dashboard para a função específica
- [ ] CORS correto (`approve-user`/`get-download-url`: hardcoded; `notify`: via `SITE_URL`)
- [ ] `CONTENT_MAP` sincronizado com `DEFAULT_CONTENT` (apenas `get-download-url`)
- [ ] `supabase functions deploy <nome>`
