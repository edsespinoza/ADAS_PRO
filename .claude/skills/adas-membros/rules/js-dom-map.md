---
name: Membros — Mapa DOM, lógica JS e fluxo de init
description: Todos os getElementById, lógica de renderContent, LEVEL_INFO, status badges e fluxo de inicialização de membros.html
---

# Membros — DOM IDs e Lógica JS

## LEVEL_INFO (badges de nível de acesso)
```js
const LEVEL_INFO = {
  1: { label:'FREE',    cls:'lvl-free'    },
  2: { label:'MÓDULO',  cls:'lvl-modulo'  },
  3: { label:'PRO',     cls:'lvl-pro'     },
  4: { label:'PREMIUM', cls:'lvl-premium' },
};
function levelBadge(level) {
  const l = LEVEL_INFO[level] || LEVEL_INFO[1];
  return `<span class="lvl-badge ${l.cls}">${l.label}</span>`;
}
```

## statusBadge (tickets)
```js
const m = {
  open:          ['status-pending', 'Aberto'],
  'in-progress': ['status-active',  'Em andamento'],
  resolved:      ['status-locked',  'Resolvido'],
  closed:        ['status-locked',  'Fechado'],
};
```

## Status CSS das bolhas de ticket
```css
.tkt-s-open     { background:rgba(0,180,216,.1); border:rgba(0,180,216,.3); color:var(--tech); }
.tkt-s-progress { background:rgba(244,162,97,.1); border:rgba(244,162,97,.3); color:#F4A261; }
.tkt-s-resolved { background:rgba(6,167,125,.1);  border:rgba(6,167,125,.3);  color:var(--success); }
.tkt-s-closed   { background:rgba(255,255,255,.05); border:rgba(255,255,255,.1); color:rgba(255,255,255,.3); }
```

---

## Mapa completo de IDs DOM

### Sidebar
| ID | Conteúdo |
|---|---|
| `#sbVersionLabel` | `v{full} · build {build}` (AUTH.VERSION) |
| `#sbAvatar` | 2 iniciais do nome |
| `#sbName` | nome completo |
| `#sbRole` | label do role: SuperAdmin / Administrador / Gestor / Membro |
| `#adminBackLink` | link "← Painel Admin" visível para admin/superadmin |
| `#sidebar` | toggle `.open` no mobile |
| `#navCats` | `<a>` de categorias adicionados dinamicamente |

### Loading / erro
| ID | Uso |
|---|---|
| `#authLoading` | `.remove()` após init bem-sucedido |
| `#authLoadingMsg` | `innerHTML` com mensagem de erro de conexão |

### Dashboard
| ID | Conteúdo |
|---|---|
| `#statsRow` | `innerHTML` — 4 stat-cards (materiais lib., bloqueados, cats X/Y, tickets) |
| `#welcomeBanner` | banner de boas-vindas com `settings.general.welcomeMessage` |
| `#myTicketsBadge` | count de tickets open/in-progress; `display:none` se 0 |

### Biblioteca de conteúdo
| ID | Uso |
|---|---|
| `#contentGrid` | `innerHTML` — grid de content-items gerado por `renderContent()` |
| `#catFilters` | botões `.cat-filter` adicionados dinamicamente por categoria |
| `#searchInput` | busca por título e descrição (`filterSearch()`) |

### Topbar navegação
| ID | Uso |
|---|---|
| `#tbTitle` | título da página atual |
| `#tbSub` | subtítulo da página |
| `#tbBreadcrumb` | container do breadcrumb |
| `#tbBreadcrumbCurrent` | nome do item atual no breadcrumb |

### Ticket form (`#ticketForm` → `onsubmit="submitTicket(event)"`)
| ID | Campo |
|---|---|
| `#tktTitle` | assunto do ticket |
| `#tktCat` | categoria (select) |
| `#tktPrio` | prioridade (select) |
| `#tktMessage` | mensagem (textarea) |
| `#ticketAlert` | alert de sucesso/erro (`.alert`) |
| `#ticketForm` | `.reset()` após envio |

### Filtros de ticket
| ID | Conteúdo |
|---|---|
| `#tktFilterBar` | barra de filtros |
| `#tktCountAll` | total de tickets |
| `#tktCountOpen` | tickets abertos |
| `#tktCountProgress` | tickets em andamento |
| `#tktCountResolved` | tickets resolvidos |
| `#myTicketsList` | lista de `.tkt-item` (JS gerado) |

### Viewer de ticket (`#ticketViewer`)
| ID | Uso |
|---|---|
| `#tvTicketNum` | número do ticket |
| `#tvTitle` | título |
| `#tvStatus` | `innerHTML` — span `.tkt-status {sCls}` |
| `#tvChat` | `.innerHTML` — mensagens do chat |
| `#tvInput` | rodapé de resposta (`display:none` se fechado) |
| `#tvReply` | textarea (max 800 chars) |
| `#tvCharCount` | contador `N/800` (atualizado via `oninput`) |

### Perfil do membro
| ID | Conteúdo |
|---|---|
| `#profAvatar` | 2 iniciais |
| `#profName` | nome |
| `#profEmail` | email |
| `#profRole` | role |
| `#accessBar` | `style.width = pct + '%'` (% de categorias liberadas) |
| `#accessText` | `N de M categorias liberadas (X%)` |
| `#profPerms` | lista de permissões |
| `#memberNote` | nota de assinatura (de `settings.general.membershipNote`) |

### Upgrade modal
| ID | Uso |
|---|---|
| `#upgradeModal` | `style.display = ''/'none'` |
| `#upgradeModalSub` | `"Para acessar "${catLabel}" e outros módulos"` |
| `#upgradePlansGrid` | grid de planos JS gerado |

### Boletins técnicos
| ID | Uso |
|---|---|
| `#bltCountAll` | total de boletins |
| `#bltUnreadBadge` | badge não-lidos |
| `#bltModal` | modal (fechar ao clicar fora) |
| `#bltModalHeader` | header colorido |
| `#bltModalTag` | tag do tipo |
| `#bltModalTitle` | título |
| `#bltModalNew` | badge "NOVO" (`display:none` se não novo) |
| `#bltModalContent` | `innerHTML` — corpo |
| `#bltModalDate` | `"Publicado em DD/MM/AAAA"` |
| `#bltModalBrands` | `.blt-affected-brand` spans |
| `#bltMarkReadBtn` | botão marcar lido |

### Toast
| ID | Uso |
|---|---|
| `#toast` | `textContent + opacity/transform` |

### Chips de categoria (evento no JS)
| ID | Uso |
|---|---|
| `#catChips` | listener de click → `tktCat.value = chip.dataset.val` |

---

## renderContent() — lógica completa

```
filter: currentCat ('all' ou catId) + searchTerm (título e desc)
→ se vazio: grid.innerHTML = mensagem "Nenhum material encontrado"
→ para cada item:
    accLvl  = item.accessLevel   || 1  (nível para visualizar)
    dlLvl   = item.downloadLevel || 3  (nível para baixar)
    canDl   = AUTH.canDownloadContent(userId, itemId)
    
    se item.locked:
      → locked-card + desc com filter:blur(3px) + botão "Desbloquear"
    senão:
      → content-item normal
        metaChips: pages, updatedAt, version
        dlButton: .content-dl-btn (se canDl) | .content-dl-locked (se !canDl)
```

## Stats row (4 cards)
```
📚 contentData.filter(c=>!c.locked).length   — Materiais liberados
🔒 contentData.filter(c=>c.locked).length    — Materiais bloqueados
🗂️ unlockedCats.length + '/' + totalCats     — Categorias com acesso
🎫 AUTH.getUserTickets(userId).length        — Tickets enviados
```

## Fluxo de init
```
AUTH.init()
  → session = AUTH.requireAuth('membro')  [redireciona se não autenticado]
  → preenche sbAvatar, sbName, sbRole
  → mostra adminBackLink se role admin/superadmin
  → remove #authLoading
  → monta navCats (com 🔒 e opacity .4 se não liberado)
  → cria welcomeBanner se settings.general.welcomeMessage existir
  → calcula statsRow (4 cards)
  → myTicketsBadge (open + in-progress)
  → monta catFilters dinamicamente
  → renderContent()
  .catch → #authLoadingMsg com erro + dica supabase-config.js
```
