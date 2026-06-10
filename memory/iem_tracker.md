# IEM Tracker — ADAS PRO Landing Page

Log acumulado de eficiência por tarefa. Atualizar ao final de cada tarefa significativa.

---

## Log de Tarefas

| Data | Tarefa | IEM_real | IEM_pot | Gap | Status |
|---|---|---|---|---|---|
| 2026-05-05 | #38 — `action:'create'` na Edge Function `approve-user` | 84 | 89 | 5 | ✅ BOM |
| 2026-05-05 | #39 — Race condition `_cancelled` no `Promise.race` de `_doInit()` | 87 | 91 | 4 | 🟢 EXCELENTE |
| 2026-05-05 | #40 — MFA bypass: validação AAL real + remoção fallback sessionStorage | 88 | 92 | 4 | 🟢 EXCELENTE |
| 2026-05-05 | #41 — Fallback local admin + _sbDirectUpdate bypass de role | 86 | 90 | 4 | 🟢 EXCELENTE |
| 2026-05-05 | #42 — email-config.html sem verificação de role no branch Supabase | 84 | 87 | 3 | ✅ BOM |
| 2026-05-05 | #43 — logAudit silenciado em auth.js + 2 Edge Functions | 81 | 84 | 3 | ✅ BOM |
| 2026-05-05 | #44 — singleton init() + getSession() sem await init | 85 | 89 | 4 | 🟢 EXCELENTE |
| 2026-05-06 | Manutenção CLAUDE.md — auditoria de mudanças recentes | 67 | 76 | 9 | 🟡 MÉDIO |
| 2026-05-06 | Atualização de 5 skills ADAS (api-public reescrita + SKILL.md) | 78 | 84 | 6 | ✅ BOM |
| 2026-05-06 | Superadmin tema branco — 2 rounds CSS + logo hex + skill atualizado | 75 | 84 | 9 | ✅ BOM |
| 2026-05-06 | Login bug fix — `isCredentialError` (HTTP 400/401 vs conectividade) | 84 | 89 | 5 | 🟢 EXCELENTE |
| 2026-05-06 | MCP audit — catalogar 40 tools (eram 38), memória + CLAUDE.md atualizados | 60 | 78 | 18 | 🟡 MÉDIO |
| 2026-05-14 | Auditoria de segurança R1 — 22 vulnerabilidades OWASP (3 críticas XSS) | 85 | 90 | 5 | 🟢 EXCELENTE |
| 2026-05-14 | Revisão UI/UX — 21 achados WCAG/consistência/responsividade | 80 | 86 | 6 | ✅ BOM |
| 2026-05-14 | Auditoria de segurança R2 — 17 vulns novas (gestor=admin, downloadLevel teatro) | 87 | 91 | 4 | 🟢 EXCELENTE |

---

## Detalhes — CLAUDE.md (2026-05-06)

**Descrição:** Auditoria do CLAUDE.md contra o estado real do código — identificar mudanças desde a última versão e corrigir/adicionar seções.

**Cálculo:**

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,35 | Skills disponíveis mas desatualizados para admin/membros/superadmin. Apenas adas-auth teria poupado leitura parcial de auth.js. bug.md, vercel.json e package.json precisaram de leitura bruta de qualquer forma |
| Qs | 0,90 (4,5/5) | Encontrou bugs reais (upload falsamente "pendente"), adicionou comportamentos não-óbvios (fallback local por role), formatação clara |
| Cs | 1,00 | Cobriu todo o CLAUDE.md; reescrita completa com melhorias precisas |

```
IEM_real      = (0,45 × 0,35 + 0,35 × 0,90 + 0,20 × 1,00) × 100 = 67
IEM_potencial = (0,45 × 0,55 + 0,35 × 0,90 + 0,20 × 1,00) × 100 = 76
Gap           = 9
```

**Observação:** IEM 🟡 aceitável para auditoria de documentação — tarefa exige leitura de múltiplos arquivos brutos para detectar divergências; skills desatualizados não podiam fornecer o estado atual. Gap 9 não justifica criação de novo skill.

---

## Detalhes — Skills ADAS (2026-05-06)

**Descrição:** Atualização de 5 skills ADAS com mudanças dos fixes #23–#34 (upload, 3 abas admin, boletins membros, editorial superadmin, API auth completa).

**Cálculo:**

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,50 | Skills existentes serviram de base estrutural — relidos para saber o que já estava documentado e o que faltava. Greps cirúrgicos substituíram leitura integral dos HTML. CLAUDE.md atualizado na mesma sessão reduziu lookup adicional |
| Qs | 1,00 (5/5) | api-public.md reescrita de 15 → 55 funções; SKILL.md de 4 painéis com features novas detalhadas; rules DOM já estavam atualizadas (não precisaram de toque) |
| Cs | 1,00 | 5 skills cobertos; nenhuma feature nova ignorada |

```
IEM_real      = (0,45 × 0,50 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 78
IEM_potencial = (0,45 × 0,65 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 84
Gap           = 6
```

**Observação:** Tarefa de manutenção de skills tem Ts estruturalmente limitado (o próprio skill é o objeto de trabalho). Gap 6 é o mínimo esperado para este tipo de tarefa.

---

## Detalhes — #38 (2026-05-05)

**Descrição:** Implementar `action:'create'` na Edge Function `approve-user` — superadmin não conseguia criar usuários pelo painel em modo Supabase.

**Cálculo:**

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,65 | CLAUDE.md em contexto + bug.md já lido + apenas 35 linhas do auth.js (targeted) — sem skill adas-auth explicitamente carregado |
| Qs | 1,00 (5/5) | Fix completo: rollback atômico, validação de role, retorno compatível com auth.js, log de auditoria |
| Cs | 1,00 | Cobriu 100% do escopo: Edge Function + contexto auth.js + bug.md atualizado |

```
IEM_real      = (0,45 × 0,65 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 84
IEM_potencial = (0,45 × 0,75 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 89
Gap           = 5
```

**Observação:** Gap pequeno (5) — skill adas-auth não trouxe ganho significativo nesta tarefa porque o foco foi na Edge Function (sem skill) e a leitura de auth.js foi altamente direcionada pelas coordenadas do bug.md.

---

## Detalhes — Superadmin tema branco (2026-05-06)

**Descrição:** Duas rodadas de mudança de paleta em `superadmin.html` (verde→cinza→branco+laranja) + fix do logo hex (fundo escuro quando `--accent` virou branco) + atualização do skill `adas-superadmin`.

**Cálculo:**

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,45 | Skill adas-superadmin carregado — cobriu layout/estrutura mas estava desatualizado em CSS. Mudanças de variáveis precisaram de greps diretos no HTML. 2 rounds de edit cirúrgicos |
| Qs | 1,00 (5/5) | Fix completo: cores corretas, logo hex visível (escuro), PRO laranja, skill atualizado com tema novo |
| Cs | 1,00 | Cobriu 100% do escopo — CSS variables, logo, sidebar avatar, btn-promote, skill |

```
IEM_real      = (0,45 × 0,45 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 75
IEM_potencial = (0,45 × 0,65 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 84
Gap           = 9
```

**Observação:** Gap 9 — skill CSS desatualizado forçou leitura direta do HTML. Com skill CSS em dia o Ts subiria de 0,45 para 0,65. Não justifica skill novo mas justifica manter o skill atualizado após mudanças de tema.

---

## Detalhes — Login bug fix (2026-05-06)

**Descrição:** Corrigir mensagem "Sistema de autenticação temporariamente indisponível" que aparecia mesmo quando o Supabase retornava HTTP 400/401 (credenciais erradas). Fix: flag `isCredentialError` baseado em `error.status`.

**Cálculo:**

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,65 | Skill adas-auth cobriu fluxo de login + fallback local por role. Apenas linha específica grepped no auth.js |
| Qs | 1,00 (5/5) | Fix semântico correto — distingue erro de credencial de erro de conectividade; não quebrou fallback offline |
| Cs | 1,00 | Bug completamente resolvido |

```
IEM_real      = (0,45 × 0,65 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 84
IEM_potencial = (0,45 × 0,75 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 89
Gap           = 5
```

**Observação:** Gap 5 — excelente. Skill adas-auth serviu bem para localizar o contexto; o fix foi de 4 linhas após encontrar o ponto exato.

---

## Detalhes — MCP audit (2026-05-06)

**Descrição:** Auditoria do servidor Skill Seekers — contar ferramentas registradas, identificar as novas vs documentadas, atualizar `info_skill.md` e `CLAUDE.md` global.

**Cálculo:**

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,10 | Sem skill do MCP — leitura direta de `server_fastmcp.py` para contar `@safe_tool_decorator`. Grep e Read brutos necessários |
| Qs | 1,00 (5/5) | Contagem exata (40), novas ferramentas identificadas, categorias completas, memória e CLAUDE.md atualizados |
| Cs | 1,00 | 100% do escopo — todos os 40 tools catalogados |

```
IEM_real      = (0,45 × 0,10 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 60
IEM_potencial = (0,45 × 0,50 + 0,35 × 1,00 + 0,20 × 1,00) × 100 = 78
Gap           = 18
```

**Observação:** IEM 🟡 aceitável — tarefa de auditoria de servidor MCP sem skill disponível. Gap 18 não justifica criar skill para o Skill Seekers (tarefa raramente executada; custo de manutenção > benefício).

---

---

## Detalhes — Auditoria Segurança R1 + R2 + UI/UX (2026-05-14)

**Descrição:** 3 agentes paralelos — auditor de segurança (R1), engenheiro UI/UX, auditor de segurança (R2). Total de 39 vulnerabilidades + 21 problemas de UX encontrados.

### Agente Segurança R1

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,80 | Auditoria de segurança exige código bruto (line-level). Skills comprimidos são insuficientes para este tipo de tarefa. 51 tool calls para 21 arquivos é adequado para o escopo |
| Qs | 0,90 | 22 achados com vetores realistas, fixes com código, excluiu corretamente as vulns conhecidas |
| Cs | 0,85 | Entendeu dual-mode auth, RLS, Edge Functions, bug.md excluiu vulns #46/#47 e demais conhecidas |

`IEM = (0,45×0,80 + 0,35×0,90 + 0,20×0,85) × 100 = 85` | IEM_pot = 90 | Gap = 5

### Agente UI/UX

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,75 | Poderia ter usado adas-admin/adas-membros/adas-superadmin para estrutura e ler apenas os CSS diretamente |
| Qs | 0,85 | 21 achados, referências WCAG AA, cálculos de contraste, mapa de consistência por página, ROI dos fixes |
| Cs | 0,82 | Entendeu público-alvo técnico automotivo, fluxo de auth, identidade ADAS PRO |

`IEM = (0,45×0,75 + 0,35×0,85 + 0,20×0,82) × 100 = 80` | IEM_pot = 86 | Gap = 6

**Observação:** Gap 6 — skills adas-* poderiam reduzir leitura bruta dos HTML de painéis. Para próximas revisões UI/UX: usar skills para estrutura + leitura cirúrgica dos CSS.

### Agente Segurança R2

| Variável | Valor | Justificativa |
|---|---|---|
| Ts | 0,82 | Mais direcionado que R1 — lista específica de áreas inexploradas. 48 tool calls para 19 arquivos |
| Qs | 0,92 | 17 achados novos, 3 não-óbvios de alta qualidade (gestor=admin, downloadLevel teatro, clearAllNotifs undefined) |
| Cs | 0,88 | Excluiu corretamente todos os 22 de R1, cross-referencou RLS com Edge Functions, descobriu gap entre CONTENT_MAP e DEFAULT_CONTENT |

`IEM = (0,45×0,82 + 0,35×0,92 + 0,20×0,88) × 100 = 87` | IEM_pot = 91 | Gap = 4

### IEM da Sessão Completa

`IEM_sessão = (85 + 80 + 87) / 3 = 84` → ✅ BOM

---

## Skills disponíveis neste projeto

| Skill | Cobre |
|---|---|
| `adas-landing` | `index.html` |
| `adas-auth` | `js/auth.js` |
| `adas-membros` | `membros.html` |
| `adas-admin` | `admin.html` |
| `adas-superadmin` | `superadmin.html` |
