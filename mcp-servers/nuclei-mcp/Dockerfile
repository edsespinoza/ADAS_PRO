FROM python:3.12-alpine
LABEL org.opencontainers.image.description="Nuclei MCP Server - ADAS PRO Security Suite"
RUN addgroup -g 1000 mcpuser && adduser -D -u 1000 -G mcpuser mcpuser
RUN apk add --no-cache ca-certificates tini git curl unzip
ARG NUCLEI_VERSION=3.7.0
RUN ARCH=$(uname -m) && if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi && if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && curl -fsSL "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_${ARCH}.zip" -o /tmp/nuclei.zip && unzip -q /tmp/nuclei.zip -d /tmp && mv /tmp/nuclei /usr/local/bin/nuclei && chmod +x /usr/local/bin/nuclei && rm -rf /tmp/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py ./
RUN mkdir -p /app/output /home/mcpuser/nuclei-templates && chown -R mcpuser:mcpuser /app /home/mcpuser
USER mcpuser
ENV NUCLEI_TEMPLATES_PATH=/home/mcpuser/nuclei-templates NUCLEI_OUTPUT_DIR=/app/output NUCLEI_TIMEOUT=600 NUCLEI_MAX_CONCURRENT=2 NUCLEI_RATE_LIMIT=150
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD pgrep -f "python.*server.py" > /dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["python", "server.py"]
