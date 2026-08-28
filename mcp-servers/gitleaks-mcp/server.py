#!/usr/bin/env python3
"""Gitleaks MCP Server — detecção de secrets via gitleaks CLI."""

import asyncio
import json
import logging
import tempfile
import uuid
from datetime import datetime
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolResult,
    ListToolsResult,
    ListResourcesResult,
    ReadResourceResult,
    CallToolRequestParams,
    ListToolsRequest,
    ReadResourceRequest,
    ListResourcesRequest,
    TextContent,
    Tool,
    Resource,
)
from pydantic import BaseModel
from pydantic_settings import BaseSettings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("gitleaks-mcp")

OUTPUT_DIR = "/app/output"
MAX_CONCURRENT = 2
DEFAULT_TIMEOUT = 300


class ScanResult(BaseModel):
    scan_id: str
    target: str
    scan_type: str
    started_at: datetime
    completed_at: datetime | None = None
    status: str = "running"
    findings: list = []
    stats: dict = {}
    error: str | None = None
    raw_output: str | None = None


scan_results: dict[str, ScanResult] = {}
active_scans: set[str] = set()

TOOLS = [
    Tool(
        name="gitleaks_scan_repo",
        description="Scan a git repository for secrets and credentials in commit history.",
        input_schema={
            "type": "object",
            "properties": {
                "repo_path": {"type": "string", "description": "Path to the git repository"},
                "timeout": {"type": "integer", "description": "Timeout in seconds", "default": 300},
            },
            "required": ["repo_path"],
        },
    ),
    Tool(
        name="gitleaks_scan_dir",
        description="Scan a directory for secrets without git history (non-git).",
        input_schema={
            "type": "object",
            "properties": {
                "dir_path": {"type": "string", "description": "Directory to scan"},
                "timeout": {"type": "integer", "default": 300},
            },
            "required": ["dir_path"],
        },
    ),
    Tool(
        name="gitleaks_detect",
        description="Quick scan provided text content for secrets.",
        input_schema={
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "Text to scan"},
                "timeout": {"type": "integer", "default": 60},
            },
            "required": ["content"],
        },
    ),
    Tool(
        name="get_scan_results",
        description="Retrieve results from a previous scan by ID.",
        input_schema={
            "type": "object",
            "properties": {"scan_id": {"type": "string"}},
            "required": ["scan_id"],
        },
    ),
    Tool(
        name="list_active_scans",
        description="List currently running scans.",
        input_schema={"type": "object", "properties": {}},
    ),
]


def mask(s: str, n: int = 4) -> str:
    if not s or len(s) <= n:
        return "****"
    return s[:n] + "*" * (len(s) - n)


def parse_output(text: str) -> list[dict]:
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return [
                {
                    "rule_id": item.get("RuleID", "unknown"),
                    "description": item.get("Description"),
                    "secret": mask(item.get("Secret", "")),
                    "file": item.get("File"),
                    "line": item.get("StartLine"),
                    "commit": (item.get("Commit") or "")[:8],
                    "author": item.get("Author"),
                    "date": item.get("Date"),
                    "fingerprint": item.get("Fingerprint"),
                }
                for item in data
            ]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


async def run_scan(target: str, scan_type: str, timeout: int, no_git: bool = False) -> ScanResult:
    sid = str(uuid.uuid4())[:8]
    out_file = Path(OUTPUT_DIR) / f"scan_{sid}.json"
    result = ScanResult(scan_id=sid, target=target, scan_type=scan_type, started_at=datetime.now())
    scan_results[sid] = result
    active_scans.add(sid)

    cmd = [
        "gitleaks", "detect", "--source", target,
        "--report-format", "json", "--report-path", str(out_file),
        "--exit-code", "0",
    ]
    if no_git:
        cmd.append("--no-git")

    try:
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await asyncio.wait_for(proc.communicate(), timeout=float(timeout))
        result.completed_at = datetime.now()
        if out_file.exists():
            raw = out_file.read_text()
            result.raw_output = raw
            findings = parse_output(raw)
            result.findings = findings
            rules = {}
            for f in findings:
                rules[f["rule_id"]] = rules.get(f["rule_id"], 0) + 1
            files = set(f["file"] for f in findings if f.get("file"))
            result.stats = {"total": len(findings), "rules": rules, "files": len(files)}
        result.status = "completed"
    except asyncio.TimeoutError:
        result.status = "timeout"
        result.error = f"Timed out after {timeout}s"
        result.completed_at = datetime.now()
    except Exception as e:
        result.status = "error"
        result.error = str(e)
        result.completed_at = datetime.now()
    finally:
        active_scans.discard(sid)
    return result


async def scan_content(content: str, timeout: int) -> ScanResult:
    sid = str(uuid.uuid4())[:8]
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
    tmp.write(content)
    tmp.close()
    result = ScanResult(scan_id=sid, target="<content>", scan_type="content", started_at=datetime.now())
    scan_results[sid] = result
    active_scans.add(sid)
    out_file = Path(OUTPUT_DIR) / f"scan_{sid}.json"

    try:
        cmd = [
            "gitleaks", "detect", "--source", tmp.name,
            "--report-format", "json", "--report-path", str(out_file),
            "--exit-code", "0", "--no-git",
        ]
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await asyncio.wait_for(proc.communicate(), timeout=float(timeout))
        result.completed_at = datetime.now()
        if out_file.exists():
            raw = out_file.read_text()
            result.raw_output = raw
            result.findings = parse_output(raw)
            result.stats = {"total": len(result.findings)}
        result.status = "completed"
    except asyncio.TimeoutError:
        result.status = "timeout"
        result.completed_at = datetime.now()
    except Exception as e:
        result.status = "error"
        result.error = str(e)
        result.completed_at = datetime.now()
    finally:
        active_scans.discard(sid)
        Path(tmp.name).unlink(missing_ok=True)
    return result


def fmt(r: ScanResult) -> dict:
    return {
        "scan_id": r.scan_id, "target": r.target, "scan_type": r.scan_type,
        "status": r.status, "stats": r.stats,
        "findings": r.findings[:50], "error": r.error,
    }


app = Server("gitleaks-mcp")


async def handle_list_tools(ctx, request):
    return ListToolsResult(tools=TOOLS)


async def handle_call_tool(ctx, params: CallToolRequestParams):
    name, args = params.name, params.arguments or {}
    try:
        if name == "gitleaks_scan_repo":
            if len(active_scans) >= MAX_CONCURRENT:
                return CallToolResult(content=[TextContent(type="text", text="Max concurrent scans reached")])
            p = Path(args["repo_path"])
            if not p.exists():
                return CallToolResult(content=[TextContent(type="text", text=f"Not found: {args['repo_path']}")])
            r = await run_scan(str(p), "repo", args.get("timeout", DEFAULT_TIMEOUT))
            return CallToolResult(content=[TextContent(type="text", text=json.dumps(fmt(r), indent=2))])
        elif name == "gitleaks_scan_dir":
            if len(active_scans) >= MAX_CONCURRENT:
                return CallToolResult(content=[TextContent(type="text", text="Max concurrent scans reached")])
            p = Path(args["dir_path"])
            if not p.exists():
                return CallToolResult(content=[TextContent(type="text", text=f"Not found: {args['dir_path']}")])
            r = await run_scan(str(p), "dir", args.get("timeout", DEFAULT_TIMEOUT), no_git=True)
            return CallToolResult(content=[TextContent(type="text", text=json.dumps(fmt(r), indent=2))])
        elif name == "gitleaks_detect":
            if not args.get("content", "").strip():
                return CallToolResult(content=[TextContent(type="text", text="Content is empty")])
            r = await scan_content(args["content"], args.get("timeout", 60))
            return CallToolResult(content=[TextContent(type="text", text=json.dumps(fmt(r), indent=2))])
        elif name == "get_scan_results":
            r = scan_results.get(args["scan_id"])
            return CallToolResult(content=[TextContent(type="text", text=json.dumps(fmt(r), indent=2) if r else "Not found")])
        elif name == "list_active_scans":
            active = [{"scan_id": s, "target": scan_results[s].target} for s in active_scans if s in scan_results]
            return CallToolResult(content=[TextContent(type="text", text=json.dumps({"active": active, "count": len(active)}, indent=2))])
        return CallToolResult(content=[TextContent(type="text", text=f"Unknown tool: {name}")])
    except Exception as e:
        return CallToolResult(content=[TextContent(type="text", text=f"Error: {e}")])


async def handle_list_resources(ctx, request):
    return ListResourcesResult(resources=[
        Resource(uri=f"gitleaks://results/{sid}", name=f"Scan {sid}", mimeType="application/json")
        for sid, r in scan_results.items() if r.status == "completed"
    ])


async def handle_read_resource(ctx, params: ReadResourceRequest):
    uri = str(params.uri) if hasattr(params, "uri") else str(params)
    if "gitleaks://results/" in uri:
        sid = uri.split("gitleaks://results/")[1]
        r = scan_results.get(sid)
        if r:
            return ReadResourceResult(contents=[{"uri": uri, "mimeType": "application/json",
                                                  "text": json.dumps(fmt(r), indent=2)}])
    return ReadResourceResult(contents=[{"uri": uri, "mimeType": "application/json",
                                          "text": json.dumps({"error": "not found"})}])


app.add_request_handler("tools/list", ListToolsRequest, handle_list_tools)
app.add_request_handler("tools/call", CallToolRequestParams, handle_call_tool)
app.add_request_handler("resources/list", ListResourcesRequest, handle_list_resources)
app.add_request_handler("resources/read", ReadResourceRequest, handle_read_resource)


async def main():
    logger.info("Starting Gitleaks MCP Server")
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
