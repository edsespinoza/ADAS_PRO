---
name: adas-superadmin
description: Resumo compactado de superadmin.html — painel superadmin com sidebar branco/neutro + gold, gestão global de usuários e plataforma
---

# ADAS Superadmin — superadmin.html

## Acesso
Requer `AUTH.requireAuth('superadmin')`  
Badge visual: `.sa-badge` com `.sa-badge-dot` pulsante (gold) + texto "SUPERADMIN"

## Dependências
Mesmo trio: `js/supabase.min.js` → `js/supabase-config.js` → `js/auth.js`  
Sem `css/style.css` externo — todo CSS inline no `<style>` do documento

## CSS Variables (diferenciais vs admin/membros)
```css
--accent:       #F8FAFC;          /* branco quase puro */
--accent-hover: #E2E8F0;
--accent-soft:  #FFFFFF;
--accent-bg:    rgba(255,255,255,.08);
--accent-border:rgba(255,255,255,.18);
--purple:       #F8FAFC;          /* alias de --accent — mantido para compatibilidade */
--purple-dark:  #E2E8F0;
--gold:         #FBBF24;
--gold-bg:      rgba(251,191,36,.12);
--gold-border:  rgba(251,191,36,.3);
--danger:       #EF4444;
--glass:        rgba(255,255,255,.04);
--glass-border: rgba(255,255,255,.08);
--sidebar-w:    248px;
```
Body/base: igual (background `#0f1923`, Poppins + Inter)

## Layout
`.dashboard` → `.sidebar` (fixed 248px, gradiente escuro) + `.main-content`

### Sidebar (visual branco/neutro + gold)
```
.sidebar             — border-right: 1px solid rgba(255,255,255,.08)
.sidebar-logo        — logo "ADAS PRO" + badge SA
  .logo-hex          — 36px, background: linear-gradient(135deg,#1E2D40,#243548)
                        border: 1px solid rgba(255,255,255,.14), cor texto #fff
  span               — cor var(--text-primary) — "ADAS" em branco
  strong             — color: #FF6B35 — "PRO" em laranja (hardcoded, igual landing)
.sa-badge            — gradiente rgba(255,255,255,.08) + rgba(251,191,36,.08)
  .sa-badge-dot      — gold, box-shadow gold, animation pulseDot 2s
```

## Funcionalidades principais (superadmin only)
| Feature | Descrição |
|---|---|
| Gestão de plataforma | Configurações globais, aparência, notificações |
| Gestão de admins | Criar via `#drawerNewUser`, editar, remover contas admin e gestor |
| Gestão de membros | Aprovar, bloquear, promover/rebaixar roles, tabela com hierarquia |
| Billing / receita | Visualizar planos ativos, receita estimada |
| Logs de auditoria | Histórico de ações administrativas |
| Conteúdo global | CRUD completo da biblioteca de PDFs |
| Editorial | CRUD de Artigos e Boletins com editor WYSIWYG (`#modalEditor`) |
| Configuração Supabase | Editar SUPABASE_CONFIG via UI |
| E-mails transacionais | Link → email-config.html |

## Ações de gestão de usuários
```js
promoteUser(userId, newRole)   // chama AUTH.updateUserRole(id, role)
removeAccess(userId)           // chama AUTH.blockUser(id)
openDeleteUserConfirm(id, name, email)  // modal com confirmação digitando email exato antes de AUTH.deleteUser
```

## `#drawerNewUser` — slide-in para criar usuário
```
#drawerNewUser         — fixed inset, z-index:4000, pointer-events:none até .open
#drawerNewUser.open    → .drawer-backdrop (opacity 1) + .drawer-panel (translateX 0)
```
Abre via `openNewUserDrawer()`. Campos: nome, email, role, senha inicial, permissions.

## Seção Editorial (`#page-editorial`)
```
showPage('editorial')  → dispara loadEditorialStats() + renderEditorialTable()
```
Abas: Boletins / Artigos (filtro `currentEditorialType`).  
Sub-abas de status: Todos / Rascunhos / Publicados / Arquivados.  
Tabela `#edTbody` gerada por `renderEditorialTable()` com busca `#edSearch`.  
`#badgeDrafts` — badge laranja na sidebar quando `drafts > 0`.

## `#modalEditor` — WYSIWYG
```
#modalEditor           — fixed inset, z-index:5000, display:none até .open
#modalEditor.classList.add('open')    → exibe
#modalEditor.classList.remove('open') → fecha
```
- `#editorArea` — `contenteditable` (corpo)
- `#editorPreview` / `#editorPreviewBtn` — toggle preview
- `#editorAutosave` — mostra `'rascunho'` / `'salvo'` (autosave a cada 30s via `setInterval`)
- Metadados: `#edMetaTitle`, `#edMetaContentType`, `#edMetaBulletinType`, `#edMetaTags`, `#edMetaStatus`

## Diferenças visuais vs admin.html
- Sidebar: branco/neutro (`--accent: #F8FAFC`) ao invés de azul/orange
- "ADAS" em branco (`var(--text-primary)`), "PRO" em laranja `#FF6B35` — igual à landing
- Logo hex com fundo escuro `#1E2D40→#243548` + borda `rgba(255,255,255,.14)` (admin usa gradiente primary/tech)
- Badge SA em ouro pulsante (admin não tem badge equivalente)
- Acesso a recursos que admin não vê (logs, billing, config Supabase)
- `.btn-promote`: outline ghost com `color: var(--accent)` branco
- `ROLE_META` superadmin: `avatarBg:'linear-gradient(135deg,#475569,#64748B)'` (cinza neutro)
- **Semântica de cores dos controles:**
  - `#FF6B35` laranja = ações primárias (`btn-primary-sm`, `editor-publish-btn`, `drawer-btn-submit`)
  - `--gold` (#FBBF24) = selecionado/ativo (tabs, sidebar `::before`, badge de contagem ativo)
  - `--success` (#34D399) = toggle ON/habilitado
  - `--accent` (#F8FAFC) branco = labels, borders, elementos neutros

## Padrões glass
`.glass` = `rgba(255,255,255,.04)` / `.glass-border` = `rgba(255,255,255,.08)`  
Usados em cards e containers internos

## Transição expandida
```css
--transition: background-color .3s, color .3s, border-color .3s,
              box-shadow .3s, transform .3s, opacity .3s, filter .3s;
```
Admin usa `all .3s ease` — superadmin lista propriedades explicitamente (melhor performance)

## Inline styles notáveis no HTML

### `#badgeDrafts` (sidebar — badge de rascunhos)
```html
style="display:none;background:#F4A261;color:#000;font-size:.6rem;
       font-weight:700;padding:2px 6px;border-radius:3px;margin-left:auto"
```
Mostrado via JS quando `drafts > 0`.

### `#hierarchyBar` — cards por role (grid 4 colunas)
| Role | background | border |
|---|---|---|
| superadmin | `var(--accent-bg)` | `var(--accent-border)` |
| admin | `rgba(251,146,60,.08)` | `rgba(251,146,60,.2)` |
| gestor | `var(--tech-bg)` | `var(--tech-border)` |
| membro | `var(--surface-muted)` | `var(--border)` |

Cada card: `border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px`

### Tabela de sistema info (3×2 grid)
Células com `background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius);padding:14px`  
Labels: `font-size:.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em`  
Valores: `font-family:var(--font-h);font-weight:700;color:var(--text-primary);font-size:1rem`

## Init e offline banner
```js
AUTH.init().then(() => {
  session = AUTH.requireAuth('superadmin');
  if (!session) return;

  // Preenche sidebar
  document.getElementById('sbAvatar').textContent = initials;   // 2 letras
  document.getElementById('sbName').textContent   = session.name;
  document.getElementById('sbRole').textContent   = 'superadmin';

  // Esconde loading, exibe app
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('appShell').style.display      = 'flex';

  // Banner offline (idêntico ao admin.html)
  if (AUTH.isOfflineMode()) {
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;...';
    banner.textContent = '⚠️ Modo Offline — Supabase inacessível. Dados locais de demonstração.';
  }
});
```

## Resumo de rules disponíveis
| Arquivo | Conteúdo |
|---|---|
| `rules/js-dom-map.md` | Todos os IDs DOM, ROLE_META, statusColor, inline styles JS |
