---
name: creator-mcp
description: "Cria novos servidores MCP customizados seguindo o padrão mcp-security-hub. Use quando precisar transformar qualquer ferramenta CLI em um servidor MCP com tools, resources e Docker."
type: reference
allowed-tools: Bash(docker *), Bash(python *), Bash(pip *)
metadata:
  author: "ADAS PRO Security"
  version: "1.0.0"
  tags: mcp, creator, docker, python, protocol
---

# Creator MCP — Gerador de Servidores MCP

## Quando Usar
- Transformar uma ferramenta CLI em servidor MCP
- Criar MCP server customizado para API externa
- Envolver um script Python/Shell como tool MCP
- Criar servidor MCP para novo projeto

## Arquitetura MCP Server (Padrão)

```
CLI Tool / API / Script
    ↓ spawn via asyncio.create_subprocess_exec()
    ↓ output capturado (stdout/stderr/files)
    ↓ output parseado (XML/JSON/texto)
    ↓ resultados em memória (dict)
    ↓ exposto como MCP Tool via JSON-RPC sobre stdio
```

## Template Mínimo (Python)

```python
#!/usr/bin/env python3
import asyncio, json, uuid
from datetime import datetime
from pathlib import Path
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool
from pydantic import BaseModel

class ScanResult(BaseModel):
    scan_id: str
    target: str
    status: str = "running"
    data: dict = {}
    error: str | None = None

scan_results: dict[str, ScanResult] = {}
app = Server("meu-mcp")

@app.list_tools()
async def list_tools():
    return [Tool(
        name="minha_tool",
        description="Descrição da tool",
        inputSchema={
            "type": "object",
            "properties": {
                "target": {"type": "string", "description": "Alvo"}
            },
            "required": ["target"]
        }
    )]

@app.call_tool()
async def call_tool(name, arguments):
    if name == "minha_tool":
        scan_id = str(uuid.uuid4())[:8]
        # Executar CLI tool
        proc = await asyncio.create_subprocess_exec(
            "minha-ferramenta", arguments["target"],
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
        result = {"scan_id": scan_id, "output": stdout.decode()}
        return [TextContent(type="text", text=json.dumps(result, indent=2))]

async def main():
    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

## Dockerfile Padrão

```dockerfile
FROM python:3.12-alpine
RUN addgroup -g 1000 mcpuser && adduser -D -u 1000 -G mcpuser mcpuser
RUN apk add --no-cache ca-certificates tini <CLI_TOOL>
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py ./
RUN mkdir -p /app/output && chown -R mcpuser:mcpuser /app
USER mcpuser
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["python", "server.py"]
```

## requirements.txt Padrão

```
mcp>=1.0.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
```

## Registrar no opencode.json

```json
{
  "mcp": {
    "meu-mcp": {
      "type": "local",
      "command": ["docker", "run", "-i", "--rm", "meu-mcp:latest"],
      "enabled": false,
      "description": "Meu MCP server customizado"
    }
  }
}
```

## Padrões de Parse de Output

| Formato CLI | Parser | Exemplo |
|---|---|---|
| XML | `xml.etree.ElementTree` | nmap |
| JSON | `json.loads()` | gitleaks, trivy |
| JSONL | `json.loads()` por linha | nuclei |
| Texto/Regex | `re.search()` por linha | nikto |

## Checklist para Novo MCP
1. [ ] Identificar ferramenta CLI ou API
2. [ ] Definir tools (o que expor)
3. [ ] Criar server.py com template mínimo
4. [ ] Implementar parser de output
5. [ ] Criar Dockerfile
6. [ ] Testar: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | docker run -i --rm meu-mcp:latest`
7. [ ] Registrar em opencode.json
8. [ ] Criar skill SKILL.md para documentação
