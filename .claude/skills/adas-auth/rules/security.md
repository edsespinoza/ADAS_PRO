---
name: AUTH — Segurança e Restrições
description: Constraints de segurança, senhas hardcoded, rate limit e notas de risco
---

# AUTH — Segurança

## Senhas hardcoded (auth.js:198–199)
```js
const _DEMO_SA_PASS = 'ADAS_OFFLINE_SA_2026';
const _DEMO_AD_PASS = 'ADAS_OFFLINE_AD_2026';
```
**RISCO MÉDIO CONHECIDO** — usadas APENAS no fallback offline/local.  
- Diferentes das senhas reais no Supabase Auth.
- Em produção (Supabase online) este código nunca é atingido.
- **Não remover sem testar offline mode** (CLAUDE.md:regra explícita).

## Hash local (não bcrypt real)
Formato: `$2a$<salt16>$<digest16>`  
Algoritmo: FNV-1a × DJB2 com 500 rounds de stretch — suficiente para fallback, não para produção.  
Usar `checkHash(plain, hashed)` para verificar — nunca comparar strings diretamente.

## Rate limiting
- Janela: 10 min (`RATE_WINDOW = 10 * 60 * 1000`)
- Máximo: 5 tentativas (`RATE_MAX = 5`)
- Chave localStorage: `adaspro_rl_<email-lowercase>`
- Bloqueio não persiste entre sessões longas (TTL relativo desde `since`)

## Bypass de sessão (proteção)
```js
// Em modo Supabase, NUNCA aceitar sessão do localStorage
if (_mode === 'supabase' || (_sbConfigured && !_demo)) return null;
```
Isso evita que um atacante injete manualmente uma sessão admin no localStorage enquanto Supabase está configurado.

## MFA (TOTP via Supabase)
Fluxo: login → `getAuthenticatorAssuranceLevel()` → se `nextLevel=aal2` → redirecionar para `mfa-verify.html`  
`sessionStorage('adaspro_mfa_uid')` persiste o UID entre páginas durante o fluxo MFA.

## RLS (Supabase)
anon key exposta por design — acesso controlado por Row Level Security nas tabelas:  
`users`, `tickets`, `notifications`  
RLS deve estar ativo — sem RLS a anon key expõe todos os dados.

## XSS prevention
`register()` sanitiza nome: `.replace(/[<>"'&]/g, '')`  
Demais campos de input devem ser sanitizados pelo HTML (não há `innerHTML` direto com dados do usuário no módulo auth).

## Timeout Supabase
5 segundos para toda a sequência de init (getSession + queries).  
Se exceder: `_sbConfigured = false`, modo local ativado, sessão existente restaurada do localStorage.
