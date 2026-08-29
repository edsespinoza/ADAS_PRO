FROM aquasec/trivy:0.57.1
LABEL org.opencontainers.image.description="Trivy MCP Server - ADAS PRO Security Suite"
ENV HOME=/home/trivy \
    TRIVY_CACHE_DIR=/home/trivy/.cache/trivy
RUN trivy plugin install mcp \
    && addgroup -g 10001 trivy \
    && adduser -u 10001 -G trivy -D -h /home/trivy trivy \
    && mkdir -p /home/trivy/.local/share/trivy /home/trivy/.cache/trivy \
    && chown -R 10001:10001 /home/trivy
USER 10001:10001
ENTRYPOINT ["trivy", "mcp"]
