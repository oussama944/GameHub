# 🛠️ Guide de développement GameHub

> Ce projet se développe sur **2 machines** : un PC Windows et un PC Linux.
> Le code est **100 % identique** ; seules les configs locales (`.env`, Ollama, Docker) diffèrent.
>
> **Deux scénarios couverts** :
> - 🚀 **Première instance** : installation initiale sur un PC (à faire une seule fois)
> - 🔁 **Quotidien** : workflow de tous les jours (pull, lancer, tester)

---

## 📋 Table des matières

- [Prérequis communs](#-prérequis-communs)
- [🚀 Première instance — Windows](#-première-instance--windows)
- [🚀 Première instance — Linux](#-première-instance--linux)
- [🔁 Quotidien — Windows](#-quotidien--windows)
- [🔁 Quotidien — Linux](#-quotidien--linux)
- [🐛 Troubleshooting rapide](#-troubleshooting-rapide)
- [✅ Checklist](#-checklist)

---

## 📦 Prérequis communs

Outil à installer sur **chaque PC** :

| Outil | Version | Rôle |
|---|---|---|
| Python | ≥ 3.11 | CLI `dev.py`, venv, tests |
| Git | ≥ 2.30 | Versioning |
| Docker + Compose v2 | ≥ 24 | Stack conteneurisée |
| Ollama | ≥ 0.4 | Modèles IA locaux |
| jq (optionnel) | ≥ 1.6 | Parsing JSON en CLI |

**Modèles Ollama requis** :

```bash
ollama pull qwen2.5:0.5b     # ~400 Mo RAM — modèle léger
ollama pull llama3.2:1b      # ~800 Mo RAM — modèle lourd
```

**Variables d'environnement JWT** : le `JWT_SECRET` du fichier `.env` racine doit être **strictement identique** sur les 2 PC (`supersecret-dev` par défaut).

---

## 🚀 Première instance — Windows

> À faire **une seule fois** sur le PC Windows. PowerShell 7 recommandé.

### 1. Installer les outils

```powershell
winget install Python.Python.3.12
winget install Git.Git
winget install Microsoft.PowerShell
winget install Ollama.Ollama
winget install jqlang.jq
```

Redémarrer le terminal après installation.

### 2. Configurer Git

```powershell
git config --global core.autocrlf input
git config --global core.longpaths true
git config --global init.defaultBranch main
```

### 3. Configurer Ollama pour Docker

Ollama doit écouter sur `0.0.0.0` (et non `127.0.0.1`) pour être joignable depuis les conteneurs.

```powershell
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "30m", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_MAX_LOADED_MODELS", "1", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_NUM_PARALLEL", "1", "User")
```

Redémarrer Ollama pour appliquer :

```powershell
Get-Process ollama* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
Start-Process "$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe"
Start-Sleep -Seconds 8
```

**Vérifier le bind** (doit afficher `0.0.0.0:11434`) :

```powershell
netstat -ano | Select-String ":11434"
```

### 4. Pare-feu Windows

```powershell
New-NetFirewallRule -DisplayName "Ollama Dev 11434" `
  -Direction Inbound -Protocol TCP -LocalPort 11434 `
  -Action Allow -Profile Private,Domain
```

### 5. Télécharger les modèles

```powershell
ollama pull qwen2.5:0.5b
ollama pull llama3.2:1b
```

### 6. Plafonner la RAM WSL2

Créer `C:\Users\<TON_USER>\.wslconfig` :

```ini
[wsl2]
memory=4GB
processors=2
swap=1GB
```

Puis :

```powershell
wsl --shutdown
```

Redémarrer Docker Desktop (tray → Restart).

### 7. Cloner le repo et créer `.env`

```powershell
cd C:\Users\<TON_USER>\Documents\perso
git clone <url-du-repo> GameHub
cd GameHub

Copy-Item .env.example .env
notepad .env   # vérifier que JWT_SECRET=supersecret-dev
```

### 8. Créer le venv racine + venv service

```powershell
# venv racine (pour dev.py token)
cd C:\Users\<TON_USER>\Documents\perso\GameHub
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install PyJWT
deactivate

# venv service (pour tests locaux)
cd services\ai-story-engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
deactivate
cd ..\..
```

> 💡 Si tu vois `running scripts is disabled` :
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 9. Vérifier l'environnement

```powershell
python dev.py doctor
```

Attendu : `✅ Environnement prêt`.

---

## 🚀 Première instance — Linux

> À faire **une seule fois** sur le PC Linux. Ubuntu/Debian.

### 1. Installer les outils

```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip git curl jq

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# ⚠️ Se déconnecter/reconnecter pour que le groupe soit pris en compte

# Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Configurer Git

```bash
git config --global core.autocrlf input
git config --global init.defaultBranch main
```

### 3. Configurer Ollama pour Docker

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=30m"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_NUM_PARALLEL=1"
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**Vérifier le bind** (doit afficher `0.0.0.0:11434`) :

```bash
ss -tlnp | grep 11434
```

### 4. Pare-feu (si ufw actif)

```bash
sudo ufw status
# Si "active" :
sudo ufw allow from 172.16.0.0/12 to any port 11434 proto tcp comment 'Docker -> Ollama'
```

### 5. Télécharger les modèles

```bash
ollama pull qwen2.5:0.5b
ollama pull llama3.2:1b
```

### 6. Cloner le repo et créer `.env`

```bash
cd ~/dev
git clone <url-du-repo> GameHub
cd GameHub

cp .env.example .env
nano .env   # vérifier que JWT_SECRET=supersecret-dev
```

### 7. Créer les venv Python

```bash
# venv racine
cd ~/dev/GameHub
python3 -m venv .venv
source .venv/bin/activate
pip install PyJWT
deactivate

# venv service
cd services/ai-story-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
deactivate
cd ../..
```

### 8. Vérifier l'environnement

```bash
python3 dev.py doctor
```

Attendu : `✅ Environnement prêt`.

---

## 🔁 Quotidien — Windows

> Workflow à répéter chaque jour de dev sur le PC Windows.

### 1. Récupérer les changements

```powershell
cd C:\Users\<TON_USER>\Documents\perso\GameHub
git pull
```

### 2. Activer le venv racine

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Vérifier l'environnement (10 s)

```powershell
python dev.py doctor
```

### 4. Démarrer la stack

```powershell
python dev.py up           # démarrage normal
python dev.py up --build   # si le code Python a changé
```

### 5. Suivre les logs

```powershell
python dev.py logs                      # tous les services
python dev.py logs ai-story-engine      # service spécifique
```

### 6. Tester

```powershell
# Générer un token JWT
$env:TOKEN = python dev.py token

# Smoke test complet
python dev.py smoke
```

### 7. Arrêter en fin de session

```powershell
python dev.py down
deactivate
```

### 8. Commit / push

```powershell
git add .
git commit -m "feat: ..."
git push
```

---

## 🔁 Quotidien — Linux

> Workflow à répéter chaque jour de dev sur le PC Linux.

### 1. Récupérer les changements

```bash
cd ~/dev/GameHub
git pull
```

### 2. Activer le venv racine

```bash
source .venv/bin/activate
```

### 3. Vérifier l'environnement (10 s)

```bash
python dev.py doctor
```

### 4. Démarrer la stack

```bash
python dev.py up           # démarrage normal
python dev.py up --build   # si le code Python a changé
```

### 5. Suivre les logs

```bash
python dev.py logs                      # tous les services
python dev.py logs ai-story-engine      # service spécifique
```

### 6. Tester

```bash
# Générer un token JWT
export TOKEN=$(python dev.py token)

# Smoke test complet
python dev.py smoke
```

### 7. Arrêter en fin de session

```bash
python dev.py down
deactivate
```

### 8. Commit / push

```bash
git add .
git commit -m "feat: ..."
git push
```

---

## 🐛 Troubleshooting rapide

| Symptôme | Windows | Linux |
|---|---|---|
| Conteneur ne joint pas Ollama | `netstat -ano \| Select-String ":11434"` → doit être `0.0.0.0` | `ss -tlnp \| grep 11434` → doit être `0.0.0.0` |
| `Activate.ps1` bloqué | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` | — |
| `curl` bizarre | Utiliser **`curl.exe`** (pas `curl`) | `curl` fonctionne normalement |
| `\r: command not found` | `.gitattributes` + `git add --renormalize .` | Idem |
| RAM saturée | `.wslconfig` → `memory=4GB` + restart Docker Desktop | `docker stats --no-stream` pour identifier le pod |
| `jq` absent | `winget install jqlang.jq` + relancer terminal | `sudo apt install jq` |
| Ollama injoignable | Quit Ollama (tray) puis relancer | `sudo systemctl restart ollama` |
| Docker daemon inactif | Démarrer Docker Desktop | `sudo systemctl start docker` |
| Permission Docker refusée | — | `sudo usermod -aG docker $USER` + reconnexion |
| `JWT_SECRET` incohérent | Vérifier `.env` racine | Vérifier `.env` racine |
| Conteneur `unhealthy` | `docker compose logs ai-story-engine` | Idem |

---

## ✅ Checklist

### Après la première instance (une seule fois)

- [ ] `python dev.py doctor` → ✅ sur les 2 PC
- [ ] `ollama list` → `qwen2.5:0.5b` + `llama3.2:1b` sur les 2 PC
- [ ] `.env` racine avec `JWT_SECRET=supersecret-dev` sur les 2 PC
- [ ] `netstat`/`ss` montre `0.0.0.0:11434` sur les 2 PC
- [ ] Windows : `.wslconfig` avec `memory=4GB`
- [ ] Windows : `git config --global core.longpaths true`
- [ ] Linux : `groups | grep docker` non vide

### Après chaque session quotidienne

- [ ] `docker compose ps` → 4 services + 3 DB en `Up`
- [ ] `python dev.py smoke` → ✅
- [ ] Changements commités et pushés

### Avant chaque `git push` (sanity check)

```bash
# Sur les 2 OS : doit ne rien afficher (sauf .ps1 légitimes)
git ls-files --eol | grep -Ev "i/lf|i/crlf"
```

---

## 📚 Commandes `dev.py` — mémo

| Commande | Description |
|---|---|
| `python dev.py doctor` | Diagnostic complet de l'environnement |
| `python dev.py up` | Démarre la stack Docker |
| `python dev.py up --build` | Démarre en rebuildant les images |
| `python dev.py up ai-story-engine` | Démarre un seul service |
| `python dev.py down` | Arrête la stack |
| `python dev.py logs [service]` | Suit les logs |
| `python dev.py token` | Génère un JWT de test |
| `python dev.py smoke` | Smoke test semaine 3 |

---

## 🔗 Architecture des ports

| Service | Port hôte | Port interne | Rôle |
|---|---|---|---|
| quiz-service | 3001 | 3000 | API quiz (Node) |
| auth-service | 3002 | 3000 | Auth JWT (Node) |
| story-service | 3003 | 3000 | CRUD histoires (Node) |
| **ai-story-engine** | **3004** | **8000** | **Génération IA (FastAPI)** |
| quiz-db | 5433 | 5432 | Postgres quiz |
| auth-db | 5434 | 5432 | Postgres auth |
| story-db | 5435 | 5432 | Postgres story |
| Ollama (hôte) | 11434 | — | Modèles IA (hors Docker) |

---

## 💡 Notes

- **`host.docker.internal`** : résolu nativement par Docker Desktop (Windows/Mac). Sur Linux, il est mappé via `extra_hosts: ["host.docker.internal:host-gateway"]` dans `docker-compose.yml`.
- **JWT partagé** : `auth-service` émet les tokens, `ai-story-engine` les vérifie. Le `JWT_SECRET` doit être **identique** dans les deux services (externalisé dans `.env` racine).
- **Coexistence story-service / ai-story-engine** : les deux services tournent en parallèle. `story-service` gère le CRUD persistant ; `ai-story-engine` gère la génération IA pure (sans DB).