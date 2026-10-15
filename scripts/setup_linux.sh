#!/usr/bin/env bash
# setup_linux.sh — Setup de l'environnement GameHub sur Linux
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_VERSION="${PYTHON_VERSION:-3.11}"

C_RESET="\033[0m"; C_INFO="\033[36m"; C_OK="\033[32m"; C_WARN="\033[33m"; C_ERR="\033[31m"; C_STEP="\033[35m"
info()  { echo -e "${C_INFO}ℹ $*${C_RESET}"; }
ok()    { echo -e "${C_OK}✔ $*${C_RESET}"; }
warn()  { echo -e "${C_WARN}⚠ $*${C_RESET}"; }
fail()  { echo -e "${C_ERR}✘ $*${C_RESET}" >&2; exit 1; }
step()  { echo -e "\n${C_STEP}▶ $*${C_RESET}"; }

# ---------- 0. Détection distro ----------
step "Détection de la distribution"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID="${ID:-unknown}"
    ok "Distribution : ${PRETTY_NAME:-$DISTRO_ID}"
else
    DISTRO_ID="unknown"
    warn "Impossible de détecter la distro"
fi

pkg_install() {
    case "$DISTRO_ID" in
        ubuntu|debian|linuxmint|pop) sudo apt-get update -y && sudo apt-get install -y "$@" ;;
        arch|manjaro|endeavouros)    sudo pacman -S --needed --noconfirm "$@" ;;
        fedora|rhel|centos)          sudo dnf install -y "$@" ;;
        *) fail "Distro non supportée automatiquement. Installe manuellement : $*" ;;
    esac
}

# ---------- 1. Prérequis de base ----------
step "Prérequis de base"
for cmd in git curl; do
    command -v "$cmd" >/dev/null || pkg_install "$cmd"
done
ok "git, curl OK"

command -v docker >/dev/null || fail "Docker non installé. Installe Docker Engine puis relance."
docker compose version >/dev/null 2>&1 || fail "docker compose (plugin) indisponible."
ok "docker + compose OK"

if ! id -nG "$USER" | grep -qw docker; then
    warn "Ton utilisateur n'est pas dans le groupe 'docker'. Ajoute-le :"
    warn "  sudo usermod -aG docker \$USER && newgrp docker"
fi

# ---------- 2. Ollama ----------
step "Ollama"
if ! command -v ollama >/dev/null 2>&1; then
    info "Installation d'Ollama via le script officiel…"
    curl -fsSL https://ollama.com/install.sh | sh
fi
command -v ollama >/dev/null || fail "Ollama toujours introuvable."
ok "Ollama : $(ollama --version 2>&1 | head -1)"

# ---------- 3. Config Ollama via systemd ----------
step "Configuration Ollama (systemd override)"
OVERRIDE_DIR="/etc/systemd/system/ollama.service.d"
OVERRIDE_FILE="$OVERRIDE_DIR/override.conf"

sudo mkdir -p "$OVERRIDE_DIR"
sudo tee "$OVERRIDE_FILE" >/dev/null <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=30m"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_NUM_PARALLEL=1"
EOF
ok "override.conf écrit"

sudo systemctl daemon-reload
sudo systemctl restart ollama
sleep 2

if systemctl is-active --quiet ollama; then
    ok "Service ollama actif"
else
    fail "Le service ollama n'a pas démarré. Vérifie : journalctl -u ollama -n 50"
fi

# ---------- 4. Bind check ----------
step "Vérification bind 0.0.0.0:11434"
if ss -tln 2>/dev/null | grep -q "0.0.0.0:11434"; then
    ok "Ollama écoute sur 0.0.0.0:11434"
else
    warn "Résultat de ss :"
    ss -tln | grep 11434 || true
    warn "Si tu vois 127.0.0.1:11434, redémarre le service : sudo systemctl restart ollama"
fi

# ---------- 5. Modèles ----------
step "Téléchargement des modèles"
for m in "qwen2.5:0.5b" "llama3.2:1b"; do
    info "pull $m"
    ollama pull "$m"
done
ollama list

# ---------- 6. jq ----------
step "jq"
command -v jq >/dev/null || pkg_install jq
ok "jq : $(jq --version)"

# ---------- 7. Git ----------
step "Configuration Git"
git config --global core.longpaths true
git config --global core.autocrlf input
ok "core.longpaths=true, core.autocrlf=input"

# ---------- 8. .gitattributes ----------
step ".gitattributes"
GA="$PROJECT_ROOT/.gitattributes"
cat > "$GA" <<'EOF'
* text=auto eol=lf

*.sh        text eol=lf
*.ps1       text eol=crlf
Dockerfile  text eol=lf
*.py        text eol=lf
*.yml       text eol=lf
*.yaml      text eol=lf
EOF
ok ".gitattributes à jour"

# ---------- 9. Python / venv ----------
step "Python ${PYTHON_VERSION} et venv"

find_python() {
    for c in "python${PYTHON_VERSION}" "python3" python; do
        if command -v "$c" >/dev/null 2>&1; then
            v=$("$c" -c 'import sys;print(f"{sys.version_info.major}.{sys.version_info.minor}")')
            case "$v" in
                3.11|3.12|3.13) echo "$c"; return 0 ;;
            esac
        fi
    done
    return 1
}

PYBIN="$(find_python || true)"
if [ -z "$PYBIN" ]; then
    warn "Aucun Python 3.11–3.13 trouvé. Installation…"
    pkg_install "python${PYTHON_VERSION}" "python${PYTHON_VERSION}-venv" || \
        pkg_install python3 python3-venv
    PYBIN="$(find_python || echo python3)"
fi
ok "Utilisation de : $PYBIN ($($PYBIN --version))"

SERVICE_DIR="$PROJECT_ROOT/services/ai-story-engine"
mkdir -p "$SERVICE_DIR/app/routers" "$SERVICE_DIR/app/services" \
         "$SERVICE_DIR/tests" "$SERVICE_DIR/scripts"

cd "$SERVICE_DIR"

if [ ! -d .venv ]; then
    info "Création du venv"
    "$PYBIN" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
ok "venv activé : $(python --version)"

python -m pip install --upgrade pip
if [ -f requirements-dev.txt ]; then
    pip install -r requirements-dev.txt
    ok "Dépendances installées"
else
    warn "requirements-dev.txt absent — étape ignorée"
fi

# ---------- Récap ----------
step "Récapitulatif"
cat <<EOF
Prochaines étapes :
  1) cp services/ai-story-engine/.env.example services/ai-story-engine/.env
     OLLAMA_BASE_URL=http://host.docker.internal:11434
  2) cd services/ai-story-engine && source .venv/bin/activate
  3) uvicorn app.main:app --reload --port 8001
  4) curl -s http://localhost:8001/health
EOF
ok "Setup Linux terminé."