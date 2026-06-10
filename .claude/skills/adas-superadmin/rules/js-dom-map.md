---
name: Superadmin — Mapa de IDs DOM e JS gerado
description: Todos os getElementById usados no superadmin.html, ROLE_META completo e padrões de inline style gerados por JS
---

# Superadmin — DOM IDs e JS-generated styles

## ROLE_META (objeto global — base de todo conteúdo JS gerado)
```js
const ROLE_META = {
  superadmin: { level:4, icon:'👑', label:'Superadmin',
    avatarBg: 'linear-gradient(135deg,#16A34A,#22C55E)',
    color: 'var(--purple)' },
  admin:      { level:3, icon:'🛡️', label:'Admin',
    avatarBg: 'linear-gradient(135deg,#FF6B35,#e55824)',
    color: 'var(--accent)' },
  gestor:     { level:2, icon:'⚙️', label:'Gestor',
    avatarBg: 'linear-gradient(135deg,#00B4D8,#0099b8)',
    color: 'var(--tech)' },
  membro:     { level:1, icon:'👤', label:'Membro',
    avatarBg: 'linear-gradient(135deg,#1B2B4D,#2a3f6f)',
    color: 'rgba(255,255,255,.45)' },
};
```

## statusColor (JS inline — usado na tabela de admins)
```js
const statusColor =
  u.status === 'active'  ? 'var(--success)' :
  u.status === 'pending' ? 'var(--warning)'  : 'var(--danger)';
```

## Avatar (JS inline)
```
width:36px; height:36px; border-radius:50%;
background: rm.avatarBg;
display:flex; align-items:center; justify-content:center;
font-size:.72rem; font-weight:700; color:#fff; flex-shrink:0
```

## Barra de nível (levelBar — 4 quadradinhos JS)
```js
Array.from({length:4}, (_,i) =>
  `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;
   background:${i < rm.level ? rm.color : 'var(--border)'};transition:.2s"></span>`
)
```

## Botões de ação (JS inline)
```
Excluir:  background:rgba(239,68,68,.1); border-color:rgba(239,68,68,.25); color:#EF4444
Promover: background:rgba(255,107,53,.12); color:var(--accent)
```

---

## Mapa completo de IDs DOM

### Sidebar
| ID | Uso |
|---|---|
| `#sbAvatar` | iniciais do usuário (2 letras) |
| `#sbName` | nome completo do session |
| `#sbRole` | texto fixo 'superadmin' |

### Loading / shell
| ID | Uso |
|---|---|
| `#loadingScreen` | `display:none` após AUTH.init |
| `#appShell` | `display:flex` após AUTH.init |

### Dashboard — métricas
| ID | Conteúdo |
|---|---|
| `#metricUsers` | total de usuários ativos |
| `#metricAdmins` | total de admins |
| `#metricRevenue` | `'R$ ' + revenue.toLocaleString('pt-BR')` |
| `#metricUsersDelta` | `'+N usuários ativos'` |
| `#metricRevenueDelta` | `'Baseado em N membros pagantes'` |
| `#barChart` | `.innerHTML` — barras verticais JS geradas |

### Hierarquia de roles
| ID | Conteúdo |
|---|---|
| `#hierarchyBar` | grid 4 colunas com cards por role |
| `#hCount-superadmin` | count de superadmins |
| `#hCount-admin` | count de admins |
| `#hCount-gestor` | count de gestores |
| `#hCount-membro` | count de membros |

### Tabela de admins
| ID | Uso |
|---|---|
| `#adminsTbody` | `innerHTML` = rows geradas por `renderAdmins()` |
| `#adminsCountLabel` | `'N usuário(s) encontrado(s)'` |
| `#adminsSearch` | input de busca (texto) |
| `#adminsRoleFilter` | select de filtro de role |

### Formulário novo admin
| ID | Campo |
|---|---|
| `#newAdminName` | nome |
| `#newAdminEmail` | email |
| `#newAdminRole` | role select |

### Segurança
| ID | Conteúdo |
|---|---|
| `#failedLoginsList` | lista de tentativas falhas |
| `#activeSessionsList` | sessões ativas |

### Planos
| ID | Uso |
|---|---|
| `#plansGrid` | grid de cards de plano (JS gerado) |
| `#editPlanTitle` | título do modal de edição |
| `#editPlanName` | input nome do plano |
| `#editPlanPrice` | input preço |
| `#editPlanPeriod` | input período |
| `#editPlanDesc` | textarea descrição |

### Plataforma / manutenção
| ID | Uso |
|---|---|
| `#maintenanceBanner` | banner de manutenção |
| `#statusMaintenance` | dot de status |
| `#statusMaintenanceLabel` | texto do status |
| `#globalMessage` | textarea mensagem global |
| `#webhookUrl` | input URL do webhook |

### Auditoria
| ID | Uso |
|---|---|
| `#auditTbody` | tabela de logs |
| `#auditSearch` | busca de logs |
| `#auditTypeFilter` | filtro de tipo de evento |

### Toast
| ID | Uso |
|---|---|
| `#toast` | container do toast |
| `#tbTitle` | título (linha 1) |
| `#tbSub` | subtítulo (linha 2) |
| `#tbClock` | relógio no toast |

### Editorial (conteúdo)
| ID | Uso |
|---|---|
| `#edCountDraft` | count rascunhos |
| `#edCountPub` | count publicados |
| `#edCountArch` | count arquivados |
| `#edTabCountBoletim` | count boletins |
| `#edTabCountArtigo` | count artigos |
| `#badgeDrafts` | badge laranja sidebar (hidden se 0) |
| `#editorialStats` | grid 3 colunas stats |
| `#edTableTitle` | título da tabela (Boletins/Artigos) |
| `#edTableSub` | subtítulo da tabela |
| `#edSearch` | input busca editorial |
| `#edTbody` | tabela editorial |
| `#edBrandsGrid` | grid de marcas |

### Modal de editor
| ID | Uso |
|---|---|
| `#modalEditor` | `.classList.add/remove('open')` |
| `#editorArea` | contenteditable — corpo do conteúdo |
| `#editorPreview` | preview renderizado |
| `#editorPreviewBtn` | botão toggle preview |
| `#editorTitle` | título no topo do editor |
| `#editorAutosave` | status autosave (`'rascunho'` / `'salvo'`) |
| `#edWordCountLabel` | contador de palavras |

### Metadados do editor
| ID | Campo |
|---|---|
| `#edMetaTitle` | título do item |
| `#edMetaContentType` | tipo: `'boletim'` / `'artigo'` |
| `#edMetaBulletinType` | subtipo boletim: `'novidade'` / outros |
| `#edMetaTags` | tags separadas por vírgula |
| `#edMetaStatus` | `'draft'` / `'published'` / `'archived'` |
| `#edBulletinTypeGroup` | grupo de campos de subtipo |
