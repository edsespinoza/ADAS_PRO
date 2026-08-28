FROM aquasec/trivy:latest
LABEL org.opencontainers.image.description="Trivy MCP Server - ADAS PRO Security Suite"
RUN trivy plugin install mcp
RUN mkdir -p /root/.cache/trivy
ENV TRIVY_CACHE_DIR=/root/.cache/trivy
ENTRYPOINT ["trivy", "mcp"]
