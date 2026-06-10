---
name: AUTH — Offline Flow e SUPABASE_CONFIG
description: Detalhes do modo offline, validação de SUPABASE_CONFIG e comportamento de sessão cacheada
---

# AUTH — Offline Flow

## Problema que este fluxo resolve
Sem a restauração de `_readSessionCache()` no modo offline, o admin ficava em **loop redirect**:
`admin.html → requireAuth('gestor') → null (sessão não lida) → login.html → loop`.
A fix: restaurar a sessão do cache quando `_offlineMode=true`.

## Quando `_offlineMode` é ativado
- `SUPABASE_CONFIG` válido foi detectado E
- `supabase.createClient()` + queries falharam dentro de 5 s (`supabase_timeout`)

## O que acontece em offline
1. `_mode = 'local'`
2. `_sbConfigured = true` (permanece — indica que Supabase existe mas está down)
3. `_offlineMode = true`
4. `_loadFromLocalStorage()` — carrega dados cacheados
5. `_seedDefaultUsersLocal()` — garante usuários admin de fallback
6. `_readSessionCache()` — restaura sessão anterior se houver

## Detecção nos painéis
```js
// admin.html e superadmin.html
if (AUTH.isOfflineMode()) {
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;text-align:center;padding:6px 16px;font-size:.78rem;font-weight:600;letter-spacing:.03em';
  banner.textContent = '⚠️ Modo Offline — Supabase inacessível. Dados locais de demonstração. Alterações não serão salvas.';
  document.body.prepend(banner);
}
```

## resetPassword usa siteUrl
```js
const redirectTo = (window.SUPABASE_CONFIG?.siteUrl || window.location.origin) + '/reset-password.html';
```

## Login em modo offline
Se `_sbConfigured && !_sb` (Supabase configurado mas cliente nulo — offline):
- Tenta match de credenciais contra `_users` local (seed)
- Se ok: cria `localSession` e salva no localStorage
- Log: `[AUTH] Admin local fallback ✓`
