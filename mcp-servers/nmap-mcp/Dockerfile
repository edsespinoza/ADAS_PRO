FROM python:3.12-alpine
LABEL org.opencontainers.image.description="Nmap MCP Server - ADAS PRO Security Suite"
RUN addgroup -g 1000 mcpuser && adduser -D -u 1000 -G mcpuser mcpuser
RUN apk add --no-cache ca-certificates tini nmap nmap-scripts
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py ./
RUN mkdir -p /app/output && chown -R mcpuser:mcpuser /app
USER mcpuser
ENV NMAP_OUTPUT_DIR=/app/output NMAP_TIMEOUT=300 NMAP_MAX_CONCURRENT=3 PYTHONUNBUFFERED=1
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD pgrep -f "python.*server.py" > /dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["python", "server.py"]
