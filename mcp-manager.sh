#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
SGW_PRO_DIR="/home/edson-espinoza/Área de trabalho/Projetos IA/Projetos/SGW_PRO"
SAAS_DIR="/home/edson-espinoza/Área de trabalho/Projetos IA/Projetos/sgw_pro_saas"
ADAS_DIR="/home/edson-espinoza/Área de trabalho/Projetos IA/Projetos/ADAS_PRO/landing-page"

PROJECTS=(
  "$SGW_PRO_DIR:$SAAS_DIR:$ADAS_DIR"
)

usage() {
  cat <<EOF
Uso: mcp-manager.sh <comando> [opções]

Comandos:
  list [projeto]              Listar todos MCPs (nome|status|desc)
  status [projeto]            Mostrar resumo ativos/inativos
  add <nome> <cmd> [args...]  Adicionar novo MCP
      --desc "descrição"       Descrição do MCP
      --disable                Adicionar desabilitado (padrão: habilitado)
      --no-type                Não incluir "type": "local"
  remove <nome>               Remover MCP de todos projetos
  enable <nome>               Habilitar MCP
  disable <nome>              Desabilitar MCP
  update <nome> <chave> <valor>  Atualizar campo (ex: command, description)
  sync <origem> <destino>     Copiar MCPs de um projeto para outro
  install-deps                Instalar dependências (uv, longhand, etc)
  self-update                 Sincronizar script entre projetos
  help                        Mostrar esta ajuda

Projetos:
  sgw    = SGW_PRO (atual)
  saas   = sgw_pro_saas
  adas   = ADAS_PRO/landing-page
  all    = todos (padrão)

Exemplos:
  mcp-manager.sh list
  mcp-manager.sh add my-mcp "npx -y @foo/bar" --desc "Ferramenta foo"
  mcp-manager.sh enable playwright
  mcp-manager.sh remove longhand
  mcp-manager.sh sync sgw saas
EOF
}

get_config_path() {
  case "$1" in
    sgw|SGw|SGW_PRO)  echo "$SGW_PRO_DIR/opencode.json" ;;
    saas|SAAS|sgw_pro_saas)  echo "$SAAS_DIR/opencode.json" ;;
    adas|ADAS|ADAS_PRO|adaspro)  echo "$ADAS_DIR/opencode.json" ;;
    *)  echo "Projeto inválido: $1 (use sgw, saas, adas ou all)"; exit 1 ;;
  esac
}

get_projects() {
  local filter="$1"
  case "$filter" in
    all|"")  echo "$SGW_PRO_DIR/opencode.json"; echo "$SAAS_DIR/opencode.json"; echo "$ADAS_DIR/opencode.json" ;;
    sgw|SGW_PRO)  echo "$SGW_PRO_DIR/opencode.json" ;;
    saas|sgw_pro_saas)  echo "$SAAS_DIR/opencode.json" ;;
    adas|ADAS|ADAS_PRO|adaspro)  echo "$ADAS_DIR/opencode.json" ;;
    *)
      if [[ -f "$filter" ]]; then
        echo "$filter"
      else
        echo "Projeto inválido: $filter"; exit 1
      fi
      ;;
  esac
}

project_name() {
  local path="$1"
  if [[ "$path" == *"SGW_PRO"* ]]; then echo "SGW_PRO";
  elif [[ "$path" == *"ADAS_PRO"* ]]; then echo "ADAS_PRO";
  else echo "sgw_pro_saas"; fi
}

cmd_list() {
  local proj="${1:-all}"
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    echo "=== $(project_name "$path") ==="
    if ! jq -e '.mcp' "$path" >/dev/null 2>&1; then
      echo "  (sem MCPs configurados)"
      echo; continue
    fi
    if ! jq -e '.mcp | length > 0' "$path" >/dev/null 2>&1; then
      echo "  (sem MCPs cadastrados)"
      echo; continue
    fi
    jq -r '
      .mcp | to_entries[] |
      [
        .key,
        (if .value.enabled then "ATIVO" else "INATIVO" end),
        (.value.description // "-")
      ] | @tsv
    ' "$path" | while IFS=$'\t' read -r name status desc; do
      printf "  %-22s %s   %s\n" "$name" "$status" "$desc"
    done
    echo
  done <<< "$(get_projects "$proj")"
}

cmd_status() {
  local proj="${1:-all}"
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    local name="$(project_name "$path")"
    local total=$(jq '.mcp | length' "$path")
    local ativos=$(jq '[.mcp[] | select(.enabled==true)] | length' "$path")
    local inativos=$((total - ativos))
    echo "$name: $ativos ativos, $inativos inativos (total $total)"
  done <<< "$(get_projects "$proj")"
}

cmd_add() {
  local name="$1"; shift
  [[ -z "$name" ]] && echo "Nome do MCP é obrigatório" && exit 1

  local desc=""
  local enabled=true
  local add_type=true
  local cmd_args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --desc) desc="$2"; shift 2 ;;
      --disable) enabled=false; shift ;;
      --no-type) add_type=false; shift ;;
      *) cmd_args+=("$1"); shift ;;
    esac
  done

  [[ ${#cmd_args[@]} -eq 0 ]] && echo "Comando é obrigatório" && exit 1

  local cmd_json
  if [[ ${#cmd_args[@]} -eq 1 ]]; then
    cmd_json=$(jq -n --arg s "${cmd_args[0]}" '$s')
  else
    cmd_json=$(jq -n --argjson args "$(printf '%s\n' "${cmd_args[@]}" | jq -R . | jq -s .)" '$args')
  fi

  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if jq -e ".mcp[\"$name\"]" "$path" >/dev/null 2>&1; then
      echo "$(project_name "$path"): MCP '$name' já existe — pulando"
      continue
    fi

    local obj="{ \"command\": $cmd_json, \"enabled\": $enabled, \"description\": $(jq -n --arg s "$desc" '$s') }"
    if $add_type; then
      obj=$(echo "$obj" | jq '. + {"type": "local"}')
    fi

    jq --arg key "$name" --argjson val "$obj" '.mcp[$key] = $val' "$path" > "${path}.tmp" && mv "${path}.tmp" "$path"
    echo "$(project_name "$path"): MCP '$name' adicionado ($([ "$enabled" = true ] && echo 'ATIVO' || echo 'INATIVO'))"
  done <<< "$(get_projects "all")"
}

cmd_remove() {
  local name="$1"
  [[ -z "$name" ]] && echo "Nome do MCP é obrigatório" && exit 1

  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if ! jq -e ".mcp[\"$name\"]" "$path" >/dev/null 2>&1; then
      echo "$(project_name "$path"): MCP '$name' não encontrado — pulando"
      continue
    fi
    jq "del(.mcp[\"$name\"])" "$path" > "${path}.tmp" && mv "${path}.tmp" "$path"
    echo "$(project_name "$path"): MCP '$name' removido"
  done <<< "$(get_projects "all")"
}

cmd_toggle() {
  local action="$1" name="$2"
  local val=$( [[ "$action" == "enable" ]] && echo true || echo false )
  local label=$( [[ "$action" == "enable" ]] && echo "ATIVADO" || echo "DESATIVADO" )

  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if ! jq -e ".mcp[\"$name\"]" "$path" >/dev/null 2>&1; then
      echo "$(project_name "$path"): MCP '$name' não encontrado — pulando"
      continue
    fi
    jq --argjson val "$val" ".mcp[\"$name\"].enabled = \$val" "$path" > "${path}.tmp" && mv "${path}.tmp" "$path"
    echo "$(project_name "$path"): MCP '$name' $label"
  done <<< "$(get_projects "all")"
}

cmd_update() {
  local name="$1" key="$2" value="$3"
  [[ -z "$name" ]] && echo "Nome do MCP é obrigatório" && exit 1
  [[ -z "$key" ]] && echo "Chave é obrigatória" && exit 1

  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    if ! jq -e ".mcp[\"$name\"]" "$path" >/dev/null 2>&1; then
      echo "$(project_name "$path"): MCP '$name' não encontrado — pulando"
      continue
    fi

    if [[ "$key" == "command" ]]; then
      local cmd_json
      if [[ "$value" =~ ^\[ ]]; then
        cmd_json="$value"
      else
        cmd_json=$(jq -n --arg s "$value" '[$s]')
      fi
      jq --argjson cmd "$cmd_json" ".mcp[\"$name\"].command = \$cmd" "$path" > "${path}.tmp" && mv "${path}.tmp" "$path"
    elif [[ "$key" == "enabled" ]]; then
      jq --argjson val "$( [[ "$value" == "true" ]] && echo true || echo false )" ".mcp[\"$name\"].enabled = \$val" "$path" > "${path}.tmp" && mv "${path}.tmp" "$path"
    else
      jq --arg val "$value" ".mcp[\"$name\"][\"$key\"] = \$val" "$path" > "${path}.tmp" && mv "${path}.tmp" "$path"
    fi
    echo "$(project_name "$path"): MCP '$name'.$key = $value"
  done <<< "$(get_projects "all")"
}

cmd_sync() {
  local src="$1" dst="$2"
  [[ -z "$src" || -z "$dst" ]] && echo "Uso: mcp-manager.sh sync <origem> <destino>" && exit 1

  local src_path=$(get_config_path "$src")
  local dst_path=$(get_config_path "$dst")
  [[ ! -f "$src_path" ]] && echo "Projeto origem não encontrado: $src_path" && exit 1
  [[ ! -f "$dst_path" ]] && echo "Projeto destino não encontrado: $dst_path" && exit 1

  local src_mcps=$(jq '.mcp | keys' "$src_path")
  local dst_mcps=$(jq '.mcp | keys' "$dst_path")

  # Merge: add missing, update existing
  for name in $(echo "$src_mcps" | jq -r '.[]'); do
    local src_config=$(jq --arg n "$name" '.mcp[$n]' "$src_path")
    jq --arg n "$name" --argjson c "$src_config" '.mcp[$n] = $c' "$dst_path" > "${dst_path}.tmp" && mv "${dst_path}.tmp" "$dst_path"
  done

  echo "Sincronizado: $(jq '.mcp | length' "$src_path") MCPs copiados de $src para $dst"
}

cmd_install_deps() {
  echo "=== Instalando dependências dos MCPs ==="

  if ! command -v uv &>/dev/null; then
    echo "Instalando uv..."
    curl -fsSL https://astral.sh/uv/install.sh | bash
  else
    echo "uv: $(uv --version) ✅"
  fi

  if ! command -v longhand &>/dev/null; then
    if command -v pip3 &>/dev/null; then
      echo "Instalando longhand..."
      pip3 install longhand 2>&1 | tail -3
    elif python3 -m pip --version &>/dev/null; then
      echo "Instalando longhand..."
      python3 -m pip install longhand 2>&1 | tail -3
    else
      echo "longhand: pip não encontrado — instale manualmente: pip install longhand && longhand setup"
    fi
  else
    echo "longhand: $(longhand --version 2>/dev/null || echo 'instalado') ✅"
  fi

  echo "Verificando node/npx..."
  if command -v npx &>/dev/null; then
    echo "npx: $(npx --version 2>/dev/null) ✅"
  else
    echo "npx não encontrado — instale Node.js"
  fi

  echo ""
  echo "Dica: Para ativar longhand, execute: mcp-manager.sh enable longhand"
}

cmd_self_update() {
  local canonical="$SCRIPTS_DIR/mcp-manager.sh"
  local proj1="$SGW_PRO_DIR/mcp-manager.sh"
  local proj2="$SAAS_DIR/mcp-manager.sh"

  for dest in "$proj1" "$proj2"; do
    cp "$canonical" "$dest"
    chmod +x "$dest"
    echo "✅ $(basename "$(dirname "$dest")")/mcp-manager.sh atualizado"
  done

  echo "✅ self-update concluído"
}

main() {
  local cmd="${1:-help}"; shift || true

  case "$cmd" in
    list|ls)    cmd_list "${1:-all}" ;;
    status|st)  cmd_status "${1:-all}" ;;
    add)        cmd_add "$@" ;;
    remove|rm)  cmd_remove "$@" ;;
    enable|on)  cmd_toggle "enable" "$@" ;;
    disable|off) cmd_toggle "disable" "$@" ;;
    update|up)  cmd_update "$@" ;;
    sync)       cmd_sync "$@" ;;
    install-deps|deps) cmd_install_deps ;;
    self-update|sync-self) cmd_self_update ;;
    help|--help|-h) usage ;;
    *)
      echo "Comando desconhecido: $cmd"
      echo
      usage
      exit 1
      ;;
  esac
}

main "$@"
