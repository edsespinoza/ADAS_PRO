---
name: adas-auth
description: Resumo compactado de js/auth.js — módulo IIFE AUTH v4, modos Supabase/localStorage, roles, API pública, segurança
---

# ADAS AUTH — js/auth.js (v4.0.0 build 20260425)

## Arquitetura
- Módulo IIFE: `const AUTH = (function(){ ... })()`  
- Dois modos: `supabase` (primário) | `local` (fallback após timeout 5 s ou sem config)
- Flag `_demo`: ativa dados de seed, ignora Supabase; persiste via `localStorage('adaspro_demo')`

## localStorage keys
| Chave | Conteúdo |
|---|---|
| `adaspro_users` | objeto `{ [id]: User }` |
| `adaspro_tickets` | objeto `{ [id]: Ticket }` |
| `adaspro_notifications` | array (máx 50) |
| `adaspro_session` | objeto Session (JWT em modo Supabase) |
| `adaspro_settings` | configurações gerais do painel |
| `adaspro_content` | biblioteca de PDFs sobrescrita |
| `adaspro_articles` | artigos |
| `adaspro_bulletins` | boletins |
| `adaspro_rl_<email>` | rate limit por email |
| `adaspro_demo` | flag `'1'` |

## Modelos de dados

### User
```js
{ id, name, email, passwordHash, role, status,
  permissions:string[], plan, accessType,
  accessExpires:null|timestamp, boughtModules:[],
  createdAt, approvedAt, approvedBy, downloads:[], level }
```

### Session
```js
{ userId, role, name, email, token, issuedAt, expiresAt }
```
- TTL padrão: 4 h (modo local) | `expires_at` do JWT Supabase

### Ticket
```js
{ id, userId, userName, title, category, priority,
  status, messages:[{text,from,at}], createdAt, updatedAt }
```

## Roles (hierarquia numérica)
| Role | Nível | Acesso |
|---|---|---|
| `superadmin` | 4 | tudo |
| `admin` | 3 | todos os dados |
| `gestor` | 2 | módulos específicos |
| `membro` | 1 | categorias permitidas |

`hasRole(userRole, req)` → booleano; usa `{ superadmin:4, admin:3, gestor:2, membro:1 }`

## Status de usuário
`active` | `pending` (aguarda aprovação) | `blocked`

## Planos
| id | Nome | Preço |
|---|---|---|
| `free` | Gratuito | R$ 0 |
| `modulo` | Módulo | R$ 47/mês |
| `pro` | Pro | R$ 97/mês — Honda+Toyota+Nissan |
| `premium` | Premium | R$ 197/mês — todas as 12 categorias |

## Categorias (12)
`honda`, `toyota`, `nissan`, `subaru`, `hyundai`, `vag`, `mercedes`, `ford`, `radar`, `mazda`, `mitsubishi`, `chineses`

## Init
```js
await AUTH.init()          // idempotente — retorna mesma Promise se chamado 2×
```
Sequência:
1. Flag `adaspro_demo` → modo demo  
2. `SUPABASE_CONFIG` presente + válido → tenta `supabase.createClient`, timeout 5 s  
3. **Timeout/offline** → `_sbConfigured=true` + `_offlineMode=true`, carrega localStorage, seeds, restaura sessão cacheada  
4. Sem config → modo local puro

## SUPABASE_CONFIG (js/supabase-config.js)
```js
const SUPABASE_CONFIG = {
  url:         'https://<projeto>.supabase.co',
  anonKey:     '<JWT>',
  demoEnabled: false,
  siteUrl:     'https://adaspro.com.br',   // usado no resetPassword redirect
};
```
**Validação interna**: `url` não contém `'SEU-PROJETO'` + `anonKey` não contém `'SUA-CHAVE'`

## Flags internas críticas
| Flag | Tipo | Significado |
|---|---|---|
| `_sbConfigured` | boolean | Supabase foi detectado (permanece `true` mesmo offline) |
| `_offlineMode` | boolean | Supabase configurado mas inacessível (timeout 5 s) |
| `_demo` | boolean | Modo demo ativo (seed data, ignora Supabase) |
| `_mode` | `'supabase'\|'local'` | Modo de operação atual |

## Fluxo offline (crítico — evita loop redirect)
```
AUTH.init():
  hasSb && hasCfg → _sbConfigured = true
  → supabase.createClient(...) com timeout 5 s
  → timeout ou erro:
      _mode         = 'local'
      _sbConfigured = true   ← permanece true
      _offlineMode  = true
      _loadFromLocalStorage()
      _seedDefaultUsersLocal()
      → restaura _cached = _readSessionCache()
        se existir: _currentSession = _cached  ← IMPEDE loop redirect no admin
```

**Senhas do seed offline** (linhas 199–200 — risco médio, apenas fallback dev):
```js
_DEMO_SA_PASS = 'ADAS_OFFLINE_SA_2026'   // superadmin
_DEMO_AD_PASS = 'ADAS_OFFLINE_AD_2026'   // admin
```
Nunca atingidas em produção com Supabase acessível.

## getSession() — comportamento por modo
```js
// Online (supabase ou sbConfigured sem demo): NUNCA lê localStorage → evita bypass de role
if (_mode === 'supabase' || (_sbConfigured && !_demo)) return null;
// Offline/local: lê cache
const s = _readSessionCache();
```

## Fallback local no login Supabase
Quando Supabase está configurado mas retorna erro no `signInWithPassword` (ex.: usuário local inexistente no Supabase Auth), o bloco `if (error)` tenta fallback local — **mas apenas para roles `superadmin`, `admin` e `gestor`**. Membros comuns nunca recebem fallback local com Supabase ativo. Comportamento intencional: impede que seeds de dev sejam usados como membros em produção.

## AUTH.isOfflineMode()
```js
AUTH.isOfflineMode()  // → boolean (_offlineMode)
```
Usado em `admin.html`, `superadmin.html` para exibir banner laranja de aviso.

## AUTH.onAuthStateChange(cb)
```js
AUTH.onAuthStateChange(cb)  // proxy para _sb.auth.onAuthStateChange(cb)
```
Só funciona em modo supabase (`_sb` disponível). Usado em `reset-password.html` para capturar evento `PASSWORD_RECOVERY` (método principal para fluxo PKCE do Supabase v2).
