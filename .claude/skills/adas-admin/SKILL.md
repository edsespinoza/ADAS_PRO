---
name: adas-admin
description: Resumo compactado de admin.html — painel de controle para roles admin/gestor, componentes e layout
---

# ADAS Admin — admin.html

## Acesso
Requer `AUTH.requireAuth('admin')` — roles `admin`, `gestor`, `superadmin`

## Dependências
- `css/style.css` + `css/auth.css`
- `js/supabase.min.js` → `js/supabase-config.js` → `js/auth.js` (carregados no `<body>`)

## CSS Variables (inline `<style>`)
```css
--primary:#1B2B4D; --primary-dark:#0D1821; --accent:#FF6B35; --accent-hover:#e55824;
--tech:#00B4D8; --success:#06A77D; --warning:#F4A261; --white:#FFFFFF;
--font-h:'Poppins',sans-serif; --font-b:'Inter',sans-serif;
--transition:all .3s ease; --radius:12px; --radius-lg:20px;
body: background #0f1923
```

## Layout
`auth.css` provê o shell: `.dashboard` → `.sidebar` (fixo) + `.main-content`  
Topbar: `.notif-btn` com `.notif-dot.active` para badge de notificação

### Sidebar — seções
```
Gestão:   Dashboard / Usuários / Tickets
Conteúdo: Biblioteca
Sistema:  Configurações · ✉️ E-mails Transacionais (link → email-config.html, badge "NOVO")
```

## Funcionalidades principais
| Feature | Componentes chave |
|---|---|
| Dashboard overview | cards de stats + gráficos + activity feed |
| Gestão de usuários | `#pageUsuarios` com 3 abas (ver abaixo) |
| Tickets (suporte) | `.ticket-list-item` + `.ticket-chat` com chat por mensagem |
| Biblioteca de conteúdo | CRUD de PDFs com upload: `.content-filters`, `.cat-filter-select` |
| Configurações | `.config-section` + `.config-row` + toggles `.toggle-sw` (abas: Geral/Sistema) |
| Planos | `.plan-config-card` + `.plan-cat-chip.active` |
| Page tabs | `.page-tabs` + `.page-tab` + `.page-tab-content` |

### `#pageUsuarios` — 3 abas
```
👥 Todos os Membros    (id sub-tab: membrosTabTodos)
⏳ Aprovações          (id: tabAprovacoes — com span #pendTabCount contador laranja)
🛡️ Equipe             (id: membrosTabEquipe)
```
`switchMembrosTab(tab, el)` — troca `.active` nas tabs e nos `.page-tab-content`.  
`updateBadges()` — atualiza `#pendTabCount` + badge de notificações no topbar.  
Widget "Usuários pendentes" no dashboard: botão "Ver todos" → `showPage('usuarios')` + `switchMembrosTab('aprovacoes', tabAprovacoes)` com `setTimeout(50ms)`.

### Upload de PDF (Biblioteca)
Dropzone no modal "Adicionar/Editar material":
- `#uploadFileName` + `#uploadFileInfo` — exibe `file.name (N KB)` após seleção
- Ao salvar: gera `storagePath = '{categoria}/{slug}.pdf'` (slug normalizado sem acentos do título)
- Chama `AUTH.uploadFile(file, storagePath)` → salva `filePath` no objeto de conteúdo
- Badge "⬆ Storage" aparece na tabela para materiais com `filePath` definido

## Componentes de tickets (admin)
```
.ticket-list-item         — item clicável da lista
  .ticket-priority        — dot colorido (urgent/high/medium/low)
  .ticket-title
  .ticket-meta
  .ticket-unread          — dot laranja se não lido

.ticket-chat              — container flex max-h 380px overflow-y
  .chat-msg.member        — alinhado à esquerda, bg rgba(255,255,255,.07)
  .chat-msg.admin         — alinhado à direita, bg rgba(255,107,53,.12)
  .chat-meta              — data/autor

.chat-input-area
  .chat-input             — textarea redimensionável max 100px
  .chat-send              — botão laranja
```

## Prioridades (dot colors)
`.p-urgent` #ff3b3b | `.p-high` #ff6b35 | `.p-medium` #f4a261 | `.p-low` #06a77d

## Configurações (seções)
`.config-section` → `.config-section-title` + `.config-section-sub` + `.config-row` (grid 1fr 1fr)  
Campos: `.config-input`, `.config-textarea`, `.config-toggle` com `.toggle-sw`

## Biblioteca (content CRUD)
`.content-filters` com `.content-search input` (180px) + `.cat-filter-select`  
Categorias filtráveis por `select` com `option` fundo `#0D1821`

## loadDashboardStats() — lógica completa
```js
async function loadDashboardStats() {
  const cfg = (typeof SUPABASE_CONFIG !== 'undefined') ? SUPABASE_CONFIG : null;
  if (!cfg || !cfg.url || !cfg.anonKey) return AUTH.getStats();   // fallback local
  try {
    const sb = window._supabaseAdmin || supabase.createClient(cfg.url, cfg.anonKey);
    window._supabaseAdmin = sb;   // cacheia o cliente
    const [uTotal, uActive, uPending, tOpen] = await Promise.all([
      sb.from('users').select('id', { count:'exact', head:true }),
      sb.from('users').select('id', { count:'exact', head:true }).eq('status','active'),
      sb.from('users').select('id', { count:'exact', head:true }).eq('status','pending'),
      sb.from('tickets').select('id', { count:'exact', head:true }).in('status',['open','in-progress']),
    ]);
    return {
      totalUsers:   uTotal.count  ?? 0,
      activeUsers:  uActive.count ?? 0,
      pendingUsers: uPending.count ?? 0,
      openTickets:  tOpen.count   ?? 0,
      totalContent: AUTH.getStats().totalContent,  // sempre vem do AUTH local
    };
  } catch { return AUTH.getStats(); }
}
```

**DOM IDs do dashboard:** `#statsCards` (4 cards), `#activityFeed` (7 eventos recentes)

**Activity feed:** cruza `AUTH.getAllUsers()` (4 mais recentes) + `AUTH.getAllTickets()` (3 mais recentes), ordena por timestamp desc.

## Init e offline banner
```js
AUTH.init().then(() => {
  session = AUTH.requireAuth('gestor');   // redireciona se não autenticado
  if (!session) return;
  // ...
  if (AUTH.isOfflineMode()) {
    // banner laranja fixo no topo
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;...';
    banner.textContent = '⚠️ Modo Offline — Supabase inacessível. Dados locais de demonstração. Alterações não serão salvas.';
    document.body.prepend(banner);
  }
});
```

**Bug corrigido (2026-05-03):** sem `AUTH.isOfflineMode()` + restauração de sessão cacheada no `auth.js`, o `requireAuth('gestor')` retornava `null` e causava loop redirect `admin.html → login.html → admin.html`. Fix está em `auth.js` (linhas 366–369).
