---
name: adas-membros
description: Resumo compactado de membros.html — área de membros, ticket form, chat, progress ring e componentes
---

# ADAS Membros — membros.html

## Acesso
Requer `AUTH.requireAuth('membro')` — qualquer role >= membro

## Dependências
- `css/style.css` + `css/auth.css`
- `js/supabase.min.js` → `js/supabase-config.js` → `js/auth.js`

## CSS Variables (inline `<style>`)
Mesmo set de admin.html:
```css
--primary:#1B2B4D; --accent:#FF6B35; --tech:#00B4D8;
--success:#06A77D; --warning:#F4A261;
body: background #0f1923
```

## Funcionalidades principais
| Feature | Componentes chave |
|---|---|
| Dashboard pessoal | stats de downloads, módulos ativos |
| Biblioteca de materiais | grid de cards por categoria (filtrado por `permissions[]`) |
| Download de PDFs | botão bloqueado se `accessLevel > user.plan` |
| Abertura de ticket | `.tkt-form-card` completo |
| Meus Tickets | HUD com filtros + cards `.tkt-card-item` + viewer `.tv-box` |
| Boletins Técnicos | `#pageBoletins` com 4 tipos + modal `#bltModal` |
| Notificações | badge no topbar |

## Progress Ring
```html
<div class="progress-ring-wrap">
  <svg class="progress-ring">
    <circle r="28" cx="34" cy="34" />  <!-- fundo -->
    <circle r="28" cx="34" cy="34" stroke-dasharray="176" stroke-dashoffset="N" />
  </svg>
  <div class="progress-ring-label">XX%</div>
  <div class="progress-ring-sub">Concluído</div>
</div>
```
`circle { transition: stroke-dashoffset .8s ease; transform: rotate(-90deg); transform-origin: 50% 50%; }`

## Ticket Form (`.tkt-form-card`)
```
.tkt-header          — ícone + título + subtítulo
.tkt-label           — uppercase letter-spacing
.tkt-input           — padding 11px 14px, border 1.5px
.tkt-textarea        — min-height 120px
.tkt-row             — grid 1fr 1fr gap 12px
.tkt-submit          — gradient laranja, full width
```

## Category Chips (`.cat-chips` — grid 1fr 1fr)
```
.cat-chip            — base: bg rgba(255,255,255,.04), border .08
.cat-chip:hover      — border .16
.cat-chip.active     — azul tech (default)
.cat-chip.active.chip-mat  — laranja (materiais)
.cat-chip.active.chip-up   — verde success (upgrade)
.cat-chip.active.chip-other — branco suave
```

## Priority Select
`.tkt-prio-wrap` → `.tkt-prio-dot` (posição absoluta esquerda) + `.tkt-prio-select.tkt-input` com `padding-left:30px`  
Dot muda de cor conforme valor selecionado via JS

## Tips Card (`.tips-card`)
Gradiente azul tech sutil, `.tip-item` com `.tip-num` (badge numerado 22×22px), `.tip-text`

## Chat de resposta (`.member-chat`)
```
max-height: 320px; overflow-y: auto;
.chat-msg.member  — bg rgba(255,255,255,.07), esquerda
.chat-msg.admin   — bg rgba(255,107,53,.1), direita
.chat-meta        — font .7rem, cor rgba(255,255,255,.3)
```

## Response Card (`.response-card`)
Borda laranja sutil: `border: 1px solid rgba(255,107,53,.16)`  
`.response-title` laranja, `.response-body` rgba(255,255,255,.42)

## Meus Tickets — redesign (HUD + cards)
```
#myTicketsList  — container de cards
.tkt-card-item  — card com barra lateral de prioridade (::before, 3px, cores prio-urgent/high/medium/low)
  :hover         — translateX(2px), border laranja suave
```
Filtros HUD acima da lista (chips `.diag-filter-chip`):
- `filterTickets('all'|'open'|'in-progress'|'resolved', el)` — filtra + atualiza contadores
- Contadores: `#tktCountAll`, `#tktCountOpen`, `#tktCountProgress`, `#tktCountResolved`

## Ticket Viewer (`#ticketViewer` → `.tv-box`)
Modal fixo fullscreen com backdrop blur. `.tv-box` = container `max-w 660px, max-h 88vh`.
```
.tv-msg.msg-member  — alinhado à esquerda, avatar cinza, bubble rgba(255,255,255,.05)
.tv-msg.msg-admin   — alinhado à direita, avatar laranja, bubble rgba(255,107,53,.07)
```
Funções JS: `openTicketViewer(ticketId)` / `closeTicketViewer()`

## Boletins Técnicos (`#pageBoletins`)
4 tipos com stripe colorida e chips de filtro:
| Tipo | Cor chip | Classe blt-card |
|---|---|---|
| `novidade` | verde | `type-novidade` |
| `atualizacao` | azul | `type-atualizacao` |
| `alerta` | vermelho | `type-alerta` |
| `procedimento` | roxo | `type-procedimento` |

Funções JS: `filterBulletins(type, el)`, `openBulletin(btnEl)`, `closeBulletin()`, `markBulletinRead(id)`  
Modal: `#bltModal` → `.blt-modal-header` (colorido por tipo) + `#bltModalContent` + `#bltMarkReadBtn`

## Ticket Item (`.tkt-item`) — legado (formulário de abertura usa `.tkt-form-card`)
`.tkt-item-header` → `.tkt-prio` (dot) + `.tkt-item-title` + badge status  
`.tkt-item-meta` → flex wrap gap 12px, fonte .76rem

## Content item — acesso vs download
```
item.accessLevel   || 1  → nível mínimo para VISUALIZAR
item.downloadLevel || 3  → nível mínimo para BAIXAR
AUTH.canDownloadContent(userId, itemId) → boolean
```
Item bloqueado: `filter:blur(3px)` na descrição + botão "Desbloquear" → `openUpgradeModal()`

## Content item — meta chips (JS inline)
```js
item.pages    → `📄 Np`           (cor rgba(255,255,255,.3))
item.updatedAt → data de atualização (cor rgba(6,167,125,.6) — verde)
item.version  → versão             (cor rgba(255,255,255,.2))
// separados por · rgba(255,255,255,.1)
```

## LEVEL_INFO (badges de plano)
```js
1:'FREE' (.lvl-free) | 2:'MÓDULO' (.lvl-modulo) | 3:'PRO' (.lvl-pro) | 4:'PREMIUM' (.lvl-premium)
```

## statusBadge de ticket
```js
open → 'status-pending' / 'Aberto'
'in-progress' → 'status-active' / 'Em andamento'
resolved | closed → 'status-locked' / label
```

## Fluxo de init resumido
```
AUTH.init() → requireAuth('membro')
→ sidebar (sbAvatar/sbName/sbRole) + adminBackLink para admin+
→ remove #authLoading
→ monta #navCats (🔒 + opacity .4 para categorias bloqueadas)
→ welcomeBanner se settings.general.welcomeMessage
→ #statsRow (4 cards: materiais lib/bloq, cats X/Y, tickets)
→ #myTicketsBadge (open+in-progress count)
→ monta #catFilters dinamicamente
→ renderContent()
.catch → #authLoadingMsg com dica supabase-config.js
```

## Upgrafe modal
`openUpgradeModal(catId, catLabel)` → `#upgradeModal` visível + `#upgradeModalSub` + `#upgradePlansGrid` (JS gerado)  
Ao escolher plano: preenche automaticamente `#tktCat`, `#tktTitle`, `#tktMessage` com texto de upgrade

## Perfil — barra de acesso
```js
pct = (user.permissions.length / CATS.length) * 100
#accessBar → style.width = pct + '%'
#accessText → 'N de M categorias liberadas (X%)'
```

## Resumo de rules disponíveis
| Arquivo | Conteúdo |
|---|---|
| `rules/js-dom-map.md` | 50+ IDs DOM, LEVEL_INFO, statusBadge, renderContent, fluxo init |
