# ADAS PRO — Relatório de Auditoria de Segurança

**Data:** 2026-08-25  
**Método:** 5 agentes especializados em paralelo (Auth, XSS/Injection, Infrastructure, Business Logic, API Security)  
**Escopo:** Código-fonte completo, Edge Functions, RLS, deploy Vercel, configuração Supabase

---

## Resumo Executivo

| Severidade | Quantidade |
|------------|-----------|
| **CRITICAL** | 1 |
| **HIGH** | 6 |
| **MEDIUM** | 10 |
| **LOW** | 9 |
| **INFO** | 12 |
| **Pass/OK** | 8 |

**Avaliação Geral:** Postura de segurança **forte** com lacunas específicas a corrigir. Não há vetores de XSS críticos, nem bypass de autenticação via Supabase. Os maiores riscos estão em: (1) bypass client-side de download, (2) credenciais expostas, (3) validação incompleta em Edge Functions, e (4) missing `WITH CHECK` em RLS.

---

## CRÍTICO

### V-BIZ-001 — Bypass de Download via `getSignedUrl` Client-Side

| Campo | Valor |
|-------|-------|
| **Severidade** | CRITICAL |
| **Arquivo** | `membros.html:1460-1461` |
| **Vetor** | Business Logic / Authorization Bypass |

**Descrição:**  
Existe um caminho no `membros.html` que gera URL assinada diretamente via `supabase.storage.from('materiais').getSignedUrl()` no client-side, **completamente bypassando** a Edge Function `get-download-url` que valida role, permissões, level e moduleAccess server-side.

**Cenário de Ataque:**
1. Usuário `membro` com plano `free` abre DevTools
2. Identifica o padrão de chamada `getSignedUrl(path, { expiresIn: 3600 })`
3. Chama diretamente com qualquer `filePath` do catálogo
4. Obtém URL assinada válida por 1 hora para qualquer PDF

**Impacto:** Qualquer membro autenticado pode baixar **todo o conteúdo** da plataforma sem ter permissão.

**Remediação:**
- Remover TODAS as chamadas `getSignedUrl` client-side
- Todas as chamadas devem passar pela Edge Function `get-download-url`
- Adicionar validação: se `_mode === 'supabase'`, usar APENAS a Edge Function

---

## ALTOS

### V-AUTH-001 — Senhas Seed Expostas no JavaScript do Cliente

| Campo | Valor |
|-------|-------|
| **Severidade** | HIGH |
| **Arquivo** | `js/auth.js:199-200` |
| **Vetor** | Information Disclosure |

**Descrição:**  
As senhas offline estão hardcoded no JS exposto ao client:
```js
_DEMO_SA_PASS = 'ADAS_OFFLINE_SA_2026'
_DEMO_AD_PASS = 'ADAS_OFFLINE_AD_2026'
```

**Impacto:**  
Se o Supabase ficar inacessível (timeout 5s), qualquer pessoa pode fazer login como superadmin usando essas credenciais.

**Remediação:**
- Gerar hashes das senhas offline e nunca expor as senhas em texto plano
- Ou: eliminar completamente o fallback offline para roles privilegiadas
- Documentar como risco aceito se mantido intencionalmente

---

### V-AUTH-002 — Modo Demo Pode Ser Forçado

| Campo | Valor |
|-------|-------|
| **Severidade** | HIGH |
| **Arquivo** | `js/auth.js` |
| **Vetor** | Authentication Bypass |

**Descrição:**  
O flag `_demo` pode ser ativado via `localStorage.setItem('adaspro_demo', '1')`, forçando o modo demo que ignora completamente o Supabase e carrega dados de seed.

**Impacto:**  
Combinado com V-AUTH-001, um atacante pode forçar modo demo e autenticar com credenciais seed.

**Remediação:**
- `DEMO_ENABLED` deve ser `false` em produção (já documentado)
- Adicionar verificação: se `SUPABASE_CONFIG.demoEnabled === false`, ignorar flag `adaspro_demo` do localStorage

---

### V-BIZ-003 — tickets_update RLS Sem `WITH CHECK`

| Campo | Valor |
|-------|-------|
| **Severidade** | HIGH |
| **Arquivo** | `sql/rls_policies.sql` |
| **Vetor** | Authorization Bypass |

**Descrição:**  
A política `tickets_update` tem `USING` clause mas não tem `WITH CHECK` clause. Um membro pode alterar campos como `status` ou `userId` de um ticket que não é seu.

**Impacto:**  
- Membro pode mudar `status` de qualquer ticket para `closed`
- Pode redirecionar tickets para outro userId
- Pode alterar `priority` de tickets de outros

**Remediação:**
```sql
CREATE POLICY tickets_update ON public.tickets
  FOR UPDATE
  USING (
    auth.uid() = userId
    OR public.is_admin_staff()
  )
  WITH CHECK (
    auth.uid() = userId
    OR public.is_admin_staff()
  );
```

---

### V-INFRA-001 — Credenciais de Teste Hardcoded em Scripts

| Campo | Valor |
|-------|-------|
| **Severidade** | HIGH |
| **Arquivo** | `.diag_admin2.cjs:6-7`, `.diag_sa.cjs:6-7` |
| **Vetor** | Credential Exposure |

**Descrição:**  
Scripts de diagnóstico não rastreados contêm credenciais reais:
- `teste_admin@adaspro.com.br` / `TestAdmin@adaspro2026`
- `testesa@adaspro.com.br` / `TestSA@adaspro2026`

**Impacto:**  
Se commitados acidentalmente (`git add .`), as credenciais ficam no histórico git permanente de um repo PÚBLICO.

**Remediação:**
1. Deletar os arquivos `.diag_*.cjs`
2. Adicionar `.diag_*.cjs` ao `.gitignore`
3. Revogar as contas de teste no Supabase Dashboard

---

### V-INFRA-002 — Screenshots de Painéis Admin no Workspace

| Campo | Valor |
|-------|-------|
| **Severidade** | HIGH |
| **Arquivo** | Workspace root (`.tab_*.png`, `.screenshot_*.png`) |
| **Vetor** | Information Disclosure |

**Descrição:**  
10+ screenshots de painéis admin/superadmin existem no workspace, contendo potencialmente PII (nomes, emails, roles) e configurações internas.

**Impacto:**  
Se commitados em repo público, expõem dados sensíveis de usuários e configurações do sistema.

**Remediação:**
1. Deletar todos os `.tab_*.png`, `.screenshot_*.png`, `.shot_ref.png`
2. Adicionar padrões ao `.gitignore`
3. Usar diretório `.local/` ou `tmp/` para diagnósticos

---

### V-BIZ-004 — Status `pending` Não Bloqueado no Offline

| Campo | Valor |
|-------|-------|
| **Severidade** | HIGH |
| **Arquivo** | `js/auth.js` |
| **Vetor** | Authorization Bypass |

**Descrição:**  
No modo offline, `getSession()` não verifica se o status do usuário é `pending`. Um usuário com status pendente pode obter sessão válida offline e acessar o painel de membros.

**Impacto:**  
Usuário pendente pode acessar conteúdo restrito quando Supabase está offline.

**Remediação:**
Adicionar verificação de status em `_seedDefaultUsersLocal()` e na restauração de sessão cacheada:
```js
if (cached && cached.status === 'pending') {
  _clearSessionCache();
  return null;
}
```

---

### V-API-001 — Validação Ausente na Action `create`

| Campo | Valor |
|-------|-------|
| **Severidade** | HIGH |
| **Arquivo** | `supabase/functions/approve-user/index.ts:113-126` |
| **Vetor** | Input Validation / Data Integrity |

**Descrição:**  
A action `create` não valida `plan`, `level` e `permissions` contra listas permitidas, enquanto a action `update` valida (linhas 190-194).

**Impacto:**
- `permissions` pode receber não-array (ex: string), quebrando `includes()` no frontend
- `plan` pode receber valor inválido, causando `NaN` em comparações numéricas
- `level` pode receber qualquer string

**Remediação:**
Adicionar validação antes do INSERT, espelhando a action `update`:
```ts
if (plan !== undefined && !VALID_PLANS.includes(plan))
  return json({ error: 'Plano inválido.' }, 400);
if (permissions !== undefined && !Array.isArray(permissions))
  return json({ error: 'permissions deve ser lista.' }, 400);
```

---

## MÉDIOS

### V-XSS-001 — Event Handler Injection via `onclick` com Dados do Usuário
- **Arquivo:** `admin.html:993-996`, `membros.html:1319`
- **Status:** Baixo risco — mitigado por CSP `unsafe-hashes`, requer acesso ao banco

### V-API-002 — Validação Ausente para `level` na Action `update`
- **Arquivo:** `supabase/functions/approve-user/index.ts:24`
- **Impacto:** Admin pode definir `level` arbitrário para qualquer usuário

### V-API-003 — Race Condition no Rate Limit (TOCTOU)
- **Arquivo:** `approve-user/index.ts:68-76`, `notify/index.ts:60-82`
- **Impacto:** Burst de 30+ requests concorrentes pode bypassar limites

### V-API-004 — Vazamento de Detalhes Internos em Exceções
- **Arquivo:** Todas as 3 Edge Functions
- **Impacto:** Mensagens de erro expõem detalhes do runtime Deno/Supabase

### V-INFRA-003 — `style-src 'unsafe-inline'` no CSP
- **Arquivo:** `scripts/generate-csp.js:30`
- **Impacto:** XSS via CSS (keylogger, UI redress) — risco baixo mas enfraquece defesa

### V-INFRA-004 — Arquivo `.env` Existente ao Lado de `.env.local`
- **Arquivo:** `.env` (local)
- **Impacto:** Confusão sobre qual arquivo é autoritativo

### V-INFRA-005 — `email-config.html` Fora das Regras de Redirect
- **Arquivo:** `vercel.json:4-65`
- **Impacto:** Acessível apenas com extensão `.html`

### V-INFRA-006 — `auth.role()` Deprecado em RLS
- **Arquivo:** `sql/rls_policies.sql:282`
- **Impacto:** Pode quebrar em atualizações futuras do Supabase

### V-BIZ-009 — `canDownloadContent()` Não Verifica `moduleAccess`
- **Arquivo:** `js/auth.js`
- **Impacto:** Verificação client-side incompleta (server-side está correto)

### V-AUTH-005 — Rate Limiting Ausente no Login
- **Arquivo:** `js/auth.js` (função login)
- **Impacto:** Brute force de senhas é possível no modo offline

---

## BAIXOS

| ID | Título | Arquivo |
|----|--------|---------|
| V-API-005 | Erros do Resend expostos ao caller | `notify/index.ts:133-135` |
| V-API-006 | `new_user` permite injeção de dados arbitrários | `notify/index.ts:91-95` |
| V-API-007 | Política inconsistente de auditoria (fail-open vs fail-closed) | `approve-user` vs `get-download-url` |
| V-API-008 | Sem limite de tamanho no body da request | Todas as Edge Functions |
| V-INFRA-007 | `notify` permite role `gestor` para enviar emails | `notify/index.ts:46` |
| V-INFRA-008 | `role_level()` sem `SET search_path = ''` | `rls_policies.sql:46-57` |
| V-INFRA-009 | `supabase-config.js` commitado com anon key (por design) | `js/supabase-config.js:8` |
| V-AUTH-003 | Sessão em localStorage sem flags de cookie | `js/auth.js` |
| V-AUTH-012 | Role hierarchy pode ser explorada via seed offline | `js/auth.js:199-200` |

---

## VERIFICAÇÕES QUE PASSARAM (OK)

| Verificação | Status |
|-------------|--------|
| XSS via `eval`/`Function`/`setTimeout(string)` | ✅ Nenhum encontrado |
| Open Redirect em login/auth | ✅ Nenhum encontrado |
| Clickjacking | ✅ Protegido por X-Frame-Options: DENY + CSP frame-ancestors |
| SQL Injection em RLS | ✅ Políticas bem escritas |
| JWT forgery | ✅ Validação correta via Supabase SDK |
| CORS bypass | ✅ Hardcoded para adaspro.com.br |
| Content access server-side | ✅ Multi-layer: role + permissions + level + moduleAccess |
| `esc()` em innerHTML | ✅ Consistente em todos os painéis |
| DOMPurify em WYSIWYG | ✅ Presente no editor e boletins |
| npm audit | ✅ 0 vulnerabilidades |
| Security Headers | ✅ Todos presentes e corretos |
| SRI em assets | ✅ SHA-384 hashes via sri-inject.js |

---

## Plano de Ação Priorizado

### Fase 1 — URGENTE (Corrigir Agora)
1. **V-BIZ-001** — Remover `getSignedUrl` client-side em `membros.html:1460-1461`
2. **V-INFRA-001** — Deletar `.diag_*.cjs` e revogar contas de teste
3. **V-INFRA-002** — Deletar screenshots e adicionar ao `.gitignore`

### Fase 2 — ALTA (Corrigir Esta Semana)
4. **V-BIZ-003** — Adicionar `WITH CHECK` ao `tickets_update` em `rls_policies.sql`
5. **V-AUTH-004** — Adicionar verificação de `status: pending` no offline flow
6. **V-API-001** — Adicionar validação de campos na action `create` do `approve-user`
7. **V-AUTH-001** — Hash das senhas seed ou eliminar fallback offline

### Fase 3 — MÉDIA (Corrigir Este Mês)
8. **V-API-004** — Sanitizar mensagens de exceção em todas as Edge Functions
9. **V-API-002** — Adicionar validação de `level` na action `update`
10. **V-API-003** — Implementar rate limit atômico (RPC ou upsert)
11. **V-INFRA-005** — Adicionar `email-config` ao vercel.json redirects/rewrites
12. **V-INFRA-006** — Substituir `auth.role()` por `auth.jwt()->>'role'`

### Fase 4 — BAIXA (Corrigir Quando Possível)
13. **V-INFRA-007** — Restringir `notify` a admin+ apenas
14. **V-INFRA-008** — Adicionar `SET search_path = ''` ao `role_level()`
15. **V-API-008** — Adicionar validação de Content-Length
16. **V-API-009** — Rejeitar métodos não-POST explicitamente

---

*Relatório gerado por 5 agentes especializados de auditoria de segurança.*
