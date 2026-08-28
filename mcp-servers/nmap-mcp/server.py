#!/usr/bin/env python3
"""Nmap MCP Server — reconhecimento de rede via nmap CLI."""

import asyncio
import json
import logging
import uuid
import xml.etree.ElementTree as ET
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
logger = logging.getLogger("nmap-mcp")

OUTPUT_DIR = "/app/output"
MAX_CONCURRENT = 3
DEFAULT_TIMEOUT = 300

TOOLS = [
    Tool(name="port_scan", description="Scan ports on a target host or network.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string", "description": "IP, hostname, or CIDR"},
             "ports": {"type": "string", "description": "Port spec (e.g. 22,80,443)"},
             "timing": {"type": "integer", "default": 3, "description": "Timing 0-5"},
             "timeout": {"type": "integer", "default": 300},
         }, "required": ["target"]}),
    Tool(name="service_scan", description="Detect service versions on open ports.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string"}, "ports": {"type": "string"},
             "timeout": {"type": "integer", "default": 300},
         }, "required": ["target"]}),
    Tool(name="os_detection", description="Fingerprint the target OS.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string"}, "timeout": {"type": "integer", "default": 300},
         }, "required": ["target"]}),
    Tool(name="script_scan", description="Run NSE scripts against target.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string"},
             "scripts": {"type": "array", "items": {"type": "string"}},
             "ports": {"type": "string"}, "timeout": {"type": "integer", "default": 300},
         }, "required": ["target"]}),
    Tool(name="quick_scan", description="Fast scan of 100 most common ports with version detection.",
         input_schema={"type": "object", "properties": {
             "target": {"type": "string"},
         }, "required": ["target"]}),
    Tool(name="get_scan_results", description="Retrieve previous scan results by ID.",
         input_schema={"type": "object", "properties": {
             "scan_id": {"type": "string"},
         }, "required": ["scan_id"]}),
    Tool(name="list_active_scans", description="List running scans.",
         input_schema={"type": "object", "properties": {}}),
]

scan_results: dict = {}
active_scans: set = set()


def parse_xml(path: Path) -> dict:
    try:
        tree = ET.parse(path)
        root = tree.getroot()
        hosts = []
        for host in root.findall("host"):
            h = {"status": (host.find("status") or {}).get("state", "unknown"),
                 "addresses": [{"addr": a.get("addr"), "type": a.get("addrtype")} for a in host.findall("address")],
                 "ports": []}
            ports_el = host.find("ports")
            if ports_el is not None:
                for p in ports_el.findall("port"):
                    st = p.find("state")
                    svc = p.find("service")
                    h["ports"].append({
                        "port": p.get("portid"), "protocol": p.get("protocol"),
                        "state": st.get("state") if st is not None else None,
                        "service": svc.get("name") if svc is not None else None,
                        "product": svc.get("product") if svc is not None else None,
                        "version": svc.get("version") if svc is not None else None,
                    })
            os_el = host.find("os")
            if os_el is not None:
                m = os_el.find("osmatch")
                h["os"] = m.get("name") if m is not None else None
            hosts.append(h)
        stats = {}
        rs = root.find("runstats")
        if rs is not None:
            f = rs.find("finished")
            if f is not None:
                stats["elapsed"] = f.get("elapsed")
            hs = rs.find("hosts")
            if hs is not None:
                stats["hosts_up"] = hs.get("up")
        return {"hosts": hosts, "stats": stats}
    except Exception as e:
        return {"hosts": [], "stats": {}, "error": str(e)}


async def run_scan(target: str, scan_type: str, ports=None, scripts=None, timing=3, timeout=DEFAULT_TIMEOUT):
    sid = str(uuid.uuid4())[:8]
    xml_out = Path(OUTPUT_DIR) / f"scan_{sid}.xml"
    result = {"scan_id": sid, "target": target, "scan_type": scan_type,
              "started_at": datetime.now().isoformat(), "status": "running"}
    scan_results[sid] = result
    active_scans.add(sid)

    cmd = ["nmap", "-oX", str(xml_out), f"-T{timing}"]
    if scan_type == "port":
        cmd.append("-sS")
    elif scan_type == "service":
        cmd.extend(["-sV", "--version-intensity", "5"])
    elif scan_type == "os":
        cmd.append("-O")
    elif scan_type == "script":
        cmd.append("-sC")
        if scripts:
            cmd.extend(["--script", ",".join(scripts)])
    elif scan_type == "quick":
        cmd.extend(["-F", "-sV"])
    if ports:
        cmd.extend(["-p", ports])
    cmd.append(target)

    try:
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await asyncio.wait_for(proc.communicate(), timeout=float(timeout))
        result["completed_at"] = datetime.now().isoformat()
        if xml_out.exists():
            parsed = parse_xml(xml_out)
            result["hosts"] = parsed.get("hosts", [])
            result["stats"] = parsed.get("stats", {})
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
    hosts = []
    for h in r.get("hosts", []):
        hosts.append({
            "addresses": h.get("addresses", []),
            "status": h.get("status"),
            "os": h.get("os"),
            "open_ports": [{"port": p.get("port"), "service": p.get("service"), "version": p.get("version")}
                           for p in h.get("ports", []) if p.get("state") == "open"],
        })
    return {"scan_id": r["scan_id"], "target": r["target"], "scan_type": r["scan_type"],
            "status": r["status"], "hosts": hosts, "stats": r.get("stats", {}), "error": r.get("error")}


app = Server("nmap-mcp")


async def handle_list_tools(ctx, request):
    return ListToolsResult(tools=TOOLS)


async def handle_call_tool(ctx, params: CallToolRequestParams):
    name, args = params.name, params.arguments or {}
    try:
        if name in ("port_scan", "service_scan", "os_detection", "script_scan", "quick_scan"):
            if len(active_scans) >= MAX_CONCURRENT:
                return CallToolResult(content=[TextContent(type="text", text="Max concurrent scans reached")])
            type_map = {"port_scan": "port", "service_scan": "service", "os_detection": "os",
                        "script_scan": "script", "quick_scan": "quick"}
            r = await run_scan(
                target=args["target"], scan_type=type_map[name],
                ports=args.get("ports"), scripts=args.get("scripts"),
                timing=args.get("timing", 3), timeout=args.get("timeout", DEFAULT_TIMEOUT),
            )
            return CallToolResult(content=[TextContent(type="text", text=json.dumps(fmt(r), indent=2))])
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
        Resource(uri=f"nmap://results/{sid}", name=f"Scan {sid}", mimeType="application/json")
        for sid, r in scan_results.items() if r.get("status") == "completed"
    ])


async def handle_read_resource(ctx, params):
    uri = str(params.uri) if hasattr(params, "uri") else str(params)
    if "nmap://results/" in uri:
        sid = uri.split("nmap://results/")[1]
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
    logger.info("Starting Nmap MCP Server")
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    async with stdio_server() as (read, write):
        await app.run(read, write, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
