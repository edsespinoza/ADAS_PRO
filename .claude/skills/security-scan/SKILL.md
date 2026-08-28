---
name: security-scan
description: "Orquestra scans de segurança nos MCPs do mcp-security-hub (nmap, nuclei, gitleaks, semgrep, trivy). Use quando precisar escanear o projeto, infraestrutura ou código por vulnerabilidades, secrets, CVEs ouconfigurações inseguras."
type: reference
allowed-tools: Bash(docker *), Bash(echo *)
metadata:
  author: "ADAS PRO Security"
  version: "1.0.0"
  tags: security, mcp, scan, vulnerability, secrets, sast
---

# Security Scan — Suite de Segurança MCP

## Quando Usar
- Scan de portas da infraestrutura (`nmap`)
- Scan de vulnerabilidades web (`nuclei`)
- Detecção de secrets no repositório (`gitleaks`)
- Análise estática de código (`semgrep`)
- Scan de containers/filesystem (`trivy`)

## Pré-requisitos
```bash
# Build das imagens Docker (uma vez)
docker compose -f docker-compose.security.yml build
```

## Como Rodar (stdio via Docker)

### Gitleaks — Scan de Secrets
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"gitleaks_scan_repo","arguments":{"repo_path":"/scan"}}}' | \
  docker run -i --rm -v "$(pwd):/scan:ro" adas-gitleaks-mcp:latest
```

### Nmap — Scan de Portas
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"quick_scan","arguments":{"target":"adaspro.com.br"}}}' | \
  docker run -i --rm --cap-add=NET_RAW adas-nmap-mcp:latest
```

### Nuclei — Scan de Vulnerabilidades
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"quick_scan","arguments":{"target":"https://adaspro.com.br"}}}' | \
  docker run -i --rm adas-nuclei-mcp:latest
```

### Semgrep — Análise Estática
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"scan","arguments":{"languages":["javascript","typescript"],"rules":["security"]}}}' | \
  docker run -i --rm -v "$(pwd):/src:ro" adas-semgrep-mcp:latest
```

### Trivy — Scan de Container/Filesystem
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"trivy_scan_filesystem","arguments":{"path":"/scan"}}}' | \
  docker run -i --rm -v "$(pwd):/scan:ro" adas-trivy-mcp:latest
```

## Ordem Recomendada de Scan
1. **gitleaks** — verificar secrets antes de qualquer deploy
2. **semgrep** — análise estática do código
3. **trivy** — scan do Dockerfile e dependências
4. **nuclei** — scan de vulnerabilidades no site (após deploy)
5. **nmap** — verificar portas expostas (infra)

## Opções MCP Comuns
Todos os servers suportam:
- `get_scan_results` — recuperar resultados de scan anterior por scan_id
- `list_active_scans` — listar scans em execução
- Concorrência máxima configurável via env vars

## Segurança
- Todos os containers rodam como non-root (UID 1000)
- `cap_drop: ALL` + capabilities específicas apenas quando necessário
- `no-new-privileges:true` em todos os containers
- Resource limits (CPU/memória) em cada container
