#!/usr/bin/env python3
"""Nuclei MCP Server — scan de vulnerabilidades via nuclei CLI."""

import asyncio
import json
import logging
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("nuclei-mcp")

OUTPUT_DIR = "/app/output"
TEMPLATES_DIR = "/home/mcpuser/nuclei-templates"
MAX_CONCURRENT = 2
DEFAULT_TIMEOUT = 600
RATE_LIMIT = 150

TOOLS = [
    Tool(name="nuclei_scan", description="Comprehensive vulnerability scan using Nuclei templates.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string", "description": "Target URL or host"},
             "severity": {"type": "array", "items": {"type": "string", "enum": ["info", "low", "medium", "high", "critical"]}},
             "tags": {"type": "array", "items": {"type": "string"}},
             "rate_limit": {"type": "integer", "default": 150},
             "timeout": {"type": "integer", "default": 600},
         }, "required": ["target"]}),
    Tool(name="quick_scan", description="Fast scan focusing on high/critical severity issues.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string"},
             "timeout": {"type": "integer", "default": 300},
         }, "required": ["target"]}),
    Tool(name="template_scan", description="Scan with specific template categories.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string"},
             "templates": {"type": "array", "items": {"type": "string"}},
             "severity": {"type": "array", "items": {"type": "string"}},
             "timeout": {"type": "integer", "default": 600},
         }, "required": ["target", "templates"]}),
    Tool(name="list_templates", description="List available Nuclei template categories.",
         input_schema={"type": "object", "properties": {}}),
    Tool(name="get_scan_results", description="Retrieve previous scan results by ID.",
         input_schema={"type": "object", "properties": {
             "scan_id": {"type": "string"},
         }, "required": ["scan_id"]}),
    Tool(name="list_active_scans", description="List running scans.",
         input_schema={"type": "object", "properties": {}}),
]

TEMPLATE_CATEGORIES = ["cves", "vulnerabilities", "exposures", "misconfiguration", "technologies",
                       "default-logins", "takeovers", "file", "fuzzing", "network", "ssl", "dns"]

scan_results: dict = {}
active_scans: set = set()


def parse_jsonl(text: str) -> list[dict]:
    findings = []
    for line in text.strip().split("\n"):
        if not line.strip():
            continue
        try:
            d = json.loads(line)
            info = d.get("info", {})
            findings.append({
                "template_id": d.get("template-id", d.get("templateID", "unknown")),
                "template_name": info.get("name"),
                "severity": info.get("severity", "unknown"),
                "host": d.get("host", d.get("matched-at", "")),
                "matched_at": d.get("matched-at"),
                "tags": info.get("tags", []),
                "description": info.get("description"),
            })
        except (json.JSONDecodeError, Exception):
            continue
    return findings


async def run_scan(target: str, scan_type="scan", templates=None, tags=None,
                   severity=None, rate_limit=RATE_LIMIT, timeout=DEFAULT_TIMEOUT):
    sid = str(uuid.uuid4())[:8]
    out_file = Path(OUTPUT_DIR) / f"scan_{sid}.jsonl"
    result = {"scan_id": sid, "target": target, "scan_type": scan_type,
              "started_at": datetime.now().isoformat(), "status": "running"}
    scan_results[sid] = result
    active_scans.add(sid)

    cmd = ["nuclei", "-target", target, "-jsonl", "-output", str(out_file),
           "-rate-limit", str(rate_limit), "-silent"]
    if Path(TEMPLATES_DIR).exists():
        cmd.extend(["-templates", TEMPLATES_DIR])
    if scan_type == "quick":
        cmd.extend(["-severity", "high,critical", "-tags", "cve,rce,lfi,xss,sqli,ssrf"])
    elif scan_type == "template" and templates:
        cmd.extend(["-tags", ",".join(templates)])
    if severity:
        cmd.extend(["-severity", ",".join(severity)])
    if tags:
        cmd.extend(["-tags", ",".join(tags)])

    try:
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await asyncio.wait_for(proc.communicate(), timeout=float(timeout))
        result["completed_at"] = datetime.now().isoformat()
        if out_file.exists():
            raw = out_file.read_text()
            findings = parse_jsonl(raw)
        else:
            findings = []
        sev_counts = {}
        for f in findings:
            sev_counts[f["severity"]] = sev_counts.get(f["severity"], 0) + 1
        result["findings"] = findings
        result["stats"] = {"total": len(findings), "by_severity": sev_counts,
                           "templates": len(set(f["template_id"] for f in findings))}
        result["status"] = "completed"
    except asyncio.TimeoutError:
        result["status"] = "timeout"
        result["error"] = f"Timed out after {timeout}s"
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
    finally:
        active_scans.discard(sid)
    return result


def fmt(r):
    return {"scan_id": r["scan_id"], "target": r["target"], "scan_type": r["scan_type"],
            "status": r["status"], "stats": r.get("stats", {}),
            "findings": r.get("findings", [])[:50], "error": r.get("error")}


app = Server("nuclei-mcp")


async def handle_list_tools(ctx, request):
    return ListToolsResult(tools=TOOLS)


async def handle_call_tool(ctx, params: CallToolRequestParams):
    name, args = params.name, params.arguments or {}
    try:
        if name in ("nuclei_scan", "quick_scan", "template_scan"):
            if len(active_scans) >= MAX_CONCURRENT:
                return CallToolResult(content=[TextContent(type="text", text="Max concurrent scans reached")])
            r = await run_scan(
                target=args["target"],
                scan_type="quick" if name == "quick_scan" else ("template" if name == "template_scan" else "scan"),
                templates=args.get("templates"), tags=args.get("tags"),
                severity=args.get("severity"), timeout=args.get("timeout", DEFAULT_TIMEOUT),
            )
            return CallToolResult(content=[TextContent(type="text", text=json.dumps(fmt(r), indent=2))])
        elif name == "list_templates":
            return CallToolResult(content=[TextContent(type="text", text=json.dumps({
                "categories": TEMPLATE_CATEGORIES,
                "severity_levels": ["info", "low", "medium", "high", "critical"],
            }, indent=2))])
        elif name == "get_scan_results":
            r = scan_results.get(args["scan_id"])
            return CallToolResult(content=[TextContent(type="text", text=json.dumps(fmt(r), indent=2) if r else "Not found")])
        elif name == "list_active_scans":
            active = [{"scan_id": s, "target": scan_results[s].get("target")} for s in active_scans if s in scan_results]
            return CallToolResult(content=[TextContent(type="text", text=json.dumps({"active": active, "count": len(active)}, indent=2))])
        return CallToolResult(content=[TextContent(type="text", text=f"Unknown tool: {name}")])
    except Exception as e:
        return CallToolResult(content=[TextContent(type="text", text=f"Error: {e}")])


async def handle_list_resources(ctx, request):
    return ListResourcesResult(resources=[
        Resource(uri=f"nuclei://results/{sid}", name=f"Scan {sid}", mimeType="application/json")
        for sid, r in scan_results.items() if r.get("status") == "completed"
    ])


async def handle_read_resource(ctx, params):
    uri = str(params.uri) if hasattr(params, "uri") else str(params)
    if "nuclei://results/" in uri:
        sid = uri.split("nuclei://results/")[1]
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
    logger.info("Starting Nuclei MCP Server")
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
