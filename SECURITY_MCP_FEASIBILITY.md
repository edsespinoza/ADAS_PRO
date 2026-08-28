# Estudo de Viabilidade: Sistema de MCPs e Skills Customizados Multi-Projeto

**Data:** 2026-08-25
**Projeto:** ADAS PRO — Plataforma de Treinamento ADAS
**Escopo:** Análise de viabilidade para criação de MCPs e skills especializadas

---

## 1. Resumo Executivo

**Viabilidade: ALTA** — É totalmente possível e vantajoso desenvolver novos MCPs e skills customizados. O ecossistema já suporta nativamente:

- **Criação de MCP servers** via Python/TypeScript com SDK oficial
- **Auto-evolução de skills** via OpenSpace (DERIVED/CAPTURED)
- **Multi-projeto** via configuração local por repositório
- **Multi-agente** via controle granular de tools por agent
- **Publicação na nuvem** via `openspace upload_skill`

---

## 2. Infraestrutura Disponível

### 2.1 MCPs Ativos (9 servidores)
| Servidor | Função | Tipo |
|----------|--------|------|
| filesystem | Leitura/escrita de arquivos | Referência |
| sequential-thinking | Raciocínio encadeado | Referência |
| memory | Memória persistente | Referência |
| token-optimizer | Compressão de contexto (~95%) | Utilidade |
| magic | Componentes UI | Design |
| omega-memory | Memória semântica + grafo | Conhecimento |
| longhand | Histórico de sessões | Utilidade |
| codebase-memory | Indexação de repositórios | Análise |
| openspace | Auto-evolução de skills | Meta |

### 2.2 Skills Existentes (20)
- **7 domain-specific** (ADAS): admin, auth, edge-functions, landing, membros, rules, superadmin
- **12 reusable**: ai-video, content-marketing, find-skills, frontend-design, infsh-cli, nano-banana, pdf, remotion, twitter, ui_ux, vercel-react, web-design
- **1 meta**: find-skills (descobrir/instalar skills)

### 2.3 Agentes (1 marketing-strategist + main)
- Agentes customizados via `.claude/agents/*.md`
- Memória por agente via `.claude/agent-memory/`
- Controle granular de tools por agente em opencode.json

---

## 3. Capacidades de Criação

### 3.1 Criar Novo MCP Server
**Esforço: BAIXO a MÉDIO**

| Componente | Esforço | Notas |
|-----------|---------|-------|
| CLI wrapper (JSON output) | 2-4h | Padrão boilerplate |
| CLI wrapper (XML/texto) | 4-8h | Parser é o hard part |
| API wrapper (REST) | 4-8h | Auth + rate limiting |
| Wrapper de MCP existente | 30min | Apenas Dockerfile |
| **Média por server** | **4h** | Com patterns estabelecidos |

**Padrão de criação:**
```
1. Definir tools (JSON Schema inputSchema)
2. Criar server.py com template mínimo
3. Implementar parser de output da ferramenta
4. Criar Dockerfile (Alpine + Python + CLI tool)
5. Testar via stdio: echo '{"jsonrpc":"2.0",...}' | docker run -i --rm
6. Registrar em opencode.json
```

### 3.2 Criar Nova Skill
**Esforço: MUITO BAIXO**

| Tipo | Esforço | Conteúdo |
|------|---------|----------|
| Referência (SKILL.md only) | 30min | Instruções + exemplos |
| Skill + Scripts | 2-4h | SKILL.md + scripts/*.py |
| Skill + Rules | 2-4h | SKILL.md + rules/*.md |
| Skill completa | 4-8h | Tudo + assets + templates |

**Auto-evolução via OpenSpace:**
- `execute_task()` → CAPTURED evolution (task sem skill correspondente)
- `fix_skill()` → FIXED evolution (corrigir skill quebrada)
- DERIVED evolution → Criar skill a partir de existente

### 3.3 Criar Novo Agente
**Esforço: BAIXO**

Criar `.claude/agents/nome.md` com frontmatter:
```yaml
---
name: "security-analyst"
description: "Analista de segurança para scans e hardening"
model: sonnet
memory: project
---
```

---

## 4. Viabilidade Multi-Projeto

### 4.1 Configuração Local por Projeto
Cada repositório pode ter seu `opencode.json` com MCPs específicos:

```json
// Projeto A (web app)
{ "mcp": { "security-nuclei": {...}, "security-gitleaks": {...} } }

// Projeto B (mobile)
{ "mcp": { "mobile-scanner": {...}, "firebase-mcp": {...} } }

// Projeto C (data pipeline)
{ "mcp": { "spark-mcp": {...}, "airflow-mcp": {...} } }
```

### 4.2 Skills Reutilizáveis
Skills em `.claude/skills/` são descobertas automaticamente. Para compartilhar entre projetos:

1. **Cloud sharing**: `openspace upload_skill(skill_dir="...", visibility="public")`
2. **Import**: `npx skills add <owner/repo@skill-name>`
3. **Local copy**: Copiar diretório de skills entre projetos

### 4.3 Hierarquia de Configuração
```
~/.config/opencode/opencode.jsonc    → Global (todos os projetos)
./opencode.json                      → Local (este projeto)
                                      → Merge: local sobrescreve global
```

---

## 5. Disciplinas de Skills por Domínio

### 5.1 Blueprint de Skills por Área

| Disciplina | Skills Potenciais | MCPs Necessários |
|-----------|-------------------|------------------|
| **Segurança** | security-scan, pentest, hardening | nmap, nuclei, gitleaks, semgrep, trivy |
| **DevOps** | ci-cd, docker, k8s, terraform | docker-mcp, k8s-mcp, terraform-mcp |
| **Frontend** | react-perf, a11y-audit, css-perf | lighthouse-mcp, axe-mcp |
| **Backend** | api-design, db-optimize, cache | postgres-mcp, redis-mcp |
| **Data** | etl-pipeline, data-quality, viz | pandas-mcp, dbt-mcp |
| **Mobile** | react-native, flutter, ios | adb-mcp, firebase-mcp |
| **AI/ML** | model-train, prompt-eng, rag | openai-mcp, langchain-mcp |
| **Marketing** | seo-audit, analytics, social | semrush-mcp, ga4-mcp |
| **Legal/LGPD** | privacy-audit, consent-mgmt | lgpd-check-mcp |
| **Financeiro** | billing, metrics, churn | stripe-mcp, mixpanel-mcp |

### 5.2 Estimativa de Esforço Total

| Entregável | Qtd | Esforço/un | Total |
|-----------|-----|-----------|-------|
| MCP servers (security) | 5 | 4h | 20h |
| MCP servers (devops) | 4 | 6h | 24h |
| MCP servers (frontend) | 3 | 4h | 12h |
| Skills (referência) | 10 | 1h | 10h |
| Skills (com scripts) | 5 | 4h | 20h |
| Agentes especializados | 5 | 1h | 5h |
| **Total** | **32** | — | **~91h** |

---

## 6. Arquitetura Proposta

```
~/.config/opencode/opencode.jsonc
├── MCPs globais (filesystem, memory, token-optimizer, openspace, ...)
└── Projetos/
    ├── ADAS PRO/
    │   ├── opencode.json (security MCPs: nmap, nuclei, gitleaks, semgrep, trivy)
    │   ├── .claude/skills/adas-* (7 domain skills)
    │   ├── .claude/skills/security-scan
    │   ├── .claude/skills/creator-mcp
    │   └── mcp-servers/ (5 security servers Dockerizados)
    ├── Projeto B/
    │   ├── opencode.json (MCPs específicos do projeto)
    │   └── .claude/skills/reusable/* (skills compartilhadas)
    └── Projeto C/
        └── ...
```

---

## 7. Fluxo de Trabalho para Criar Novo MCP

```
1. Identificar necessidade
   ↓
2. Verificar se existe MCP pronto (registry.modelcontextprotocol.io)
   ↓ existe? → Usar via npx/uvx
   ↓ não existe?
3. Criar mcp-servers/nome-mcp/
   ├── server.py (template + parser)
   ├── Dockerfile (Alpine + Python + CLI tool)
   └── requirements.txt (mcp, pydantic, pydantic-settings)
   ↓
4. Build: docker build -t nome-mcp .
5. Teste: echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | docker run -i --rm nome-mcp
6. Registrar em opencode.json
7. Criar skill SKILL.md para documentação
8. (Opcional) openspace upload_skill para nuvem
```

---

## 8. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Docker necessário | Médio | Já temos Docker; servers podem rodar sem Docker para dev |
| Resource intensive | Baixo | Resource limits por container; on-demand activation |
| Manutenção de parsers | Médio | Parsers são o componente mais frágil; testes automatizados |
| Versões de CLI tools | Baixo | Dockerfiles com versões fixadas (ARG) |
| Segurança dos containers | Baixo | Non-root, cap_drop ALL, no-new-privileges |
| Complexidade crescente | Médio | Modularizar por domínio; skills documentam padrões |

---

## 9. Recomendações

1. **Começar pelos 5 MCPs de segurança** (já implementados neste PR)
2. **Usar OpenSpace** para auto-evolução das skills durante uso
3. **Priorizar MCPs com maior reuse** entre projetos (gitleaks, semgrep, trivy)
4. **Manter Dockerfiles minimalistas** (Alpine base, versões fixadas)
5. **Documentar cada MCP** com skill SKILL.md correspondente
6. **Publicar skills reutilizáveis** na nuvem OpenSpace para compartilhar entre projetos
7. **Criar agentes especializados** por domínio (security-analyst, devops-engineer, etc.)

---

## 10. Conclusão

O sistema é **totalmente viável** e já conta com toda a infraestrutura necessária:
- OpenSpace para auto-evolução e publicação de skills
- OpenCode para registro e orquestração de MCPs
- Docker para isolamento e portabilidade dos servers
- Padrões maduros do mcp-security-hub como referência

O investimento de ~91h resultaria em um ecossistema de **32 MCPs + skills** cobrindo 10 disciplinas, reutilizáveis em todos os projetos do portfólio.
