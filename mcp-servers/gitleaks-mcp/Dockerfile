FROM python:3.12-alpine
LABEL org.opencontainers.image.description="Gitleaks MCP Server - ADAS PRO Security Suite"
RUN addgroup -g 1000 mcpuser && adduser -D -u 1000 -G mcpuser mcpuser
RUN apk add --no-cache ca-certificates tini git curl
ARG GITLEAKS_VERSION=8.30.0
RUN ARCH=$(uname -m) && if [ "$ARCH" = "x86_64" ]; then ARCH="x64"; fi && if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && curl -fsSL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${ARCH}.tar.gz" -o /tmp/gitleaks.tar.gz && tar -xzf /tmp/gitleaks.tar.gz -C /usr/local/bin gitleaks && chmod +x /usr/local/bin/gitleaks && rm /tmp/gitleaks.tar.gz
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py ./
RUN mkdir -p /app/output && chown -R mcpuser:mcpuser /app
USER mcpuser
ENV GITLEAKS_OUTPUT_DIR=/app/output GITLEAKS_TIMEOUT=300 GITLEAKS_MAX_CONCURRENT=2
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD pgrep -f "python.*server.py" > /dev/null || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["python", "server.py"]
