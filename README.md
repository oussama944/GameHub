# 🎮 GameHub

Plateforme de quiz, histoires interactives, tierlists — et **génération narrative par IA locale**.

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/Ollama-local-black?logo=ollama)](https://ollama.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose_v2-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Vue d'ensemble

GameHub est un **monorepo** de microservices qui combine :

- 🎯 **Quiz Service** — API CRUD de quiz (Node.js + PostgreSQL)
- 🔐 **Auth Service** — Authentification JWT (Node.js + PostgreSQL)
- 📖 **Story Service** — CRUD d'histoires à choix multiples (Node.js + PostgreSQL)
- 🧠 **AI Story Engine** — Génération narrative via LLM local avec **routage de modèles** (Python FastAPI + Ollama)
- 🏆 **Tierlist Service** — Tierlists et votes *(prévu)*

Chaque service est **indépendant**, **conteneurisé**, et **protégé par le même JWT** émis par `auth-service`.

---

## 🏗️ Architecture

```mermaid
graph TB
    Client[🖥️ Client / Frontend]

    subgraph Docker["🐳 Docker Compose"]
        Quiz["🎯 Quiz Service<br/>Node · :3001"]
        Auth["🔐 Auth Service<br/>Node · :3002"]
        Story["📖 Story Service<br/>Node · :3003"]
        AI["🧠 AI Story Engine<br/>FastAPI · :3004"]

        QuizDB[("🗄️ quiz-db<br/>:5433")]
        AuthDB[("🗄️ auth-db<br/>:5434")]
        StoryDB[("🗄️ story-db<br/>:5435")]
    end

    Ollama["🤖 Ollama<br/>(hôte · :11434)<br/>qwen2.5:0.5b<br/>llama3.2:1b"]

    Client --> Quiz
    Client --> Auth
    Client --> Story
    Client -->|JWT| AI

    Quiz --> QuizDB
    Auth --> AuthDB
    Story --> StoryDB

    AI -->|1. Vérifie JWT| Auth
    AI -->|2. Model Router| Ollama

    style AI fill:#ffe6b3,stroke:#c98a00,stroke-width:2px
    style Ollama fill:#e6f2ff,stroke:#0066cc,stroke-width:2px
```

### Flux d'authentification

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant AI as AI Story Engine
    participant O as Ollama (hôte)

    C->>A: POST /auth/login
    A-->>C: JWT (HS256, supersecret)

    C->>AI: POST /story/generate<br/>Authorization: Bearer <JWT>
    AI->>AI: Vérifie JWT (même secret)
    AI->>AI: Model Router → qwen ou llama
    AI->>O: /api/generate
    O-->>AI: Texte généré
    AI-->>C: { content, decision, meta }
```

---

## 🚀 Démarrage rapide

### Prérequis

| Outil | Version | Notes |
|---|---|---|
| **Git** | ≥ 2.30 | — |
| **Docker** + **Compose v2** | ≥ 24 | Docker Desktop (Windows/macOS) ou Docker Engine (Linux) |
| **Ollama** | ≥ 0.4 | **Sur l'hôte**, pas dans Docker |
| **Python** | ≥ 3.11 | Uniquement pour `dev.py` et les tests locaux |
| **Node.js** | ≥ 20 | Uniquement pour le dev local des services Node |

### 1. Installer Ollama et les modèles

Ollama doit tourner **sur la machine hôte** pour bénéficier du cache RAM entre les requêtes.

```bash
# Windows
winget install Ollama.Ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

Puis télécharger les 2 modèles utilisés par le Model Router :

```bash
ollama pull qwen2.5:0.5b     # ~400 Mo RAM — modèle léger
ollama pull llama3.2:1b      # ~800 Mo RAM — modèle lourd
```

> ⚠️ **Important** : Ollama doit écouter sur `0.0.0.0:11434` pour être joignable depuis les conteneurs.
> Voir **[docs/dev-setup.md](docs/dev-setup.md)** pour la configuration Windows/Linux.

### 2. Cloner et configurer

```bash
git clone https://github.com/VotreUsername/GameHub.git
cd GameHub

# Créer le fichier d'environnement racine
cp .env.example .env
# Éditer .env si besoin (JWT_SECRET doit être identique à auth-service)
```

### 3. Lancer la stack

```bash
docker compose up --build -d

# Suivre les logs
docker compose logs -f
```

### 4. Vérifier

```bash
# Statut des conteneurs
docker compose ps
# → 4 services + 3 DB en "Up" (ou "healthy")

# Santé de chaque service
curl http://localhost:3001/health     # quiz-service
curl http://localhost:3002/health     # auth-service
curl http://localhost:3003/health     # story-service
curl http://localhost:3004/health     # ai-story-engine
```

### 5. Tester la génération IA

```bash
# 1) Créer un compte (ou réutiliser un existant)
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"password123"}'

# 2) Se connecter pour récupérer un JWT
TOKEN=$(curl -s -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"password123"}' | jq -r .token)

# 3) Générer une histoire (routage LIGHT automatique)
curl -X POST http://localhost:3004/story/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Un chevalier entre dans la taverne."}' | jq

# 4) Générer un chapitre complexe (routage HEAVY automatique)
curl -X POST http://localhost:3004/story/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Écris le chapitre final avec un twist dramatique."}' | jq
```

### 6. Arrêter

```bash
docker compose down           # arrête les conteneurs
docker compose down -v        # + supprime les volumes (⚠️ perte de données)
```

---

## 🌐 Ports exposés

| Service | Port hôte | Port interne | Technologie |
|---|---|---|---|
| 🎯 **Quiz Service** | `3001` | `3000` | Node.js |
| 🔐 **Auth Service** | `3002` | `3000` | Node.js |
| 📖 **Story Service** | `3003` | `3000` | Node.js |
| 🧠 **AI Story Engine** | `3004` | `8000` | Python FastAPI |
| 🗄️ **Quiz DB** | `5433` | `5432` | PostgreSQL 16 |
| 🗄️ **Auth DB** | `5434` | `5432` | PostgreSQL 16 |
| 🗄️ **Story DB** | `5435` | `5432` | PostgreSQL 16 |
| 🤖 **Ollama** | `11434` | — | Hôte (hors Docker) |

---

## 🧠 AI Story Engine (semaine 3)

Le service `ai-story-engine` est un moteur narratif **FastAPI** qui interroge **Ollama** en local, avec un **routage dynamique de modèles** selon la complexité de la requête.

### Model Router — pourquoi ?

Sur CPU modeste, un modèle `1B` est **~2,5× plus lent** qu'un `0.5B`. Le router envoie donc chaque requête vers le modèle **le plus petit qui satisfait la demande** :

| Condition | Modèle | RAM | Cas d'usage |
|---|---|---|---|
| Prompt court, pas de mot-clé complexe | `qwen2.5:0.5b` | ~400 Mo | dialogue, action rapide |
| Prompt long (≥ 400 car.) ou mot-clé (`chapitre`, `twist`, `intrigue`…) ou `max_tokens ≥ 300` | `llama3.2:1b` | ~800 Mo | intrigue, génération longue |
| Champ `tier` explicite (`light` / `heavy`) | forcé | — | override manuel |

**Chaque réponse HTTP contient la décision complète** dans le champ `decision` :

```json
{
  "content": "Il poussa la porte de la taverne…",
  "decision": {
    "model": "qwen2.5:0.5b",
    "tier": "light",
    "reason": "requête courte/simple (34 car.) → modèle économique",
    "max_tokens": 256,
    "prompt_chars": 34
  },
  "meta": {
    "latency_ms": 412.3,
    "eval_count": 87,
    "total_duration_ms": 398.1
  }
}
```

→ **Traçabilité totale** : on sait toujours **quel modèle** a répondu et **pourquoi**.

### Endpoints

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ❌ | Liveness + état Ollama |
| `GET` | `/story/models` | ✅ | Modèles disponibles + RAM estimée |
| `POST` | `/story/generate` | ✅ | Génère une scène depuis un prompt |
| `POST` | `/story/continue` | ✅ | Continue une histoire existante |

Documentation interactive : http://localhost:3004/docs

---

## 💻 Développement local (sans Docker)

### Services Node.js (quiz / auth / story)

```bash
cd services/quiz-service

# Installer
npm install

# Configurer
cp .env.example .env
# Éditer .env → pointer vers Postgres local
# (par défaut : postgres://postgres:postgres@localhost:5433/quizdb)

# Lancer en mode dev
npm run dev

# Tests
npm test
```

Même procédure pour `auth-service` et `story-service` (adapter les ports DB : `5434` et `5435`).

### Service Python (ai-story-engine)

```bash
cd services/ai-story-engine

# Créer le venv
python -m venv .venv
# Windows : .\.venv\Scripts\Activate.ps1
# Linux   : source .venv/bin/activate

# Installer
pip install -r requirements-dev.txt

# Lancer en mode dev (Ollama doit tourner sur localhost)
export OLLAMA_BASE_URL=http://localhost:11434
# Windows PowerShell : $env:OLLAMA_BASE_URL = "http://localhost:11434"
uvicorn app.main:app --reload --port 8000

# Tests
pytest -v --cov=app --cov-report=term-missing
```

> ⚠️ En mode dev sans Docker, `OLLAMA_BASE_URL` doit pointer sur **`localhost:11434`** (pas `host.docker.internal`).

---

## 🖥️ Développement cross-platform (Windows + Linux)

Ce projet se développe en alternance sur **2 machines** (1 Windows, 1 Linux). Toute la config est gérée via une **CLI Python universelle** : `dev.py`.

### Première installation

Voir le guide détaillé : **[docs/dev-setup.md](docs/dev-setup.md)**

Résumé :

| Étape | Windows | Linux |
|---|---|---|
| Installer Ollama | `winget install Ollama.Ollama` | `curl -fsSL https://ollama.com/install.sh \| sh` |
| Bind Ollama | Variables utilisateur + relaunch | Override systemd + restart |
| Modèles | `ollama pull qwen2.5:0.5b && ollama pull llama3.2:1b` | idem |
| `.env` racine | `Copy-Item .env.example .env` | `cp .env.example .env` |
| Venv | `python -m venv .venv` + `Activate.ps1` | `python3 -m venv .venv` + `source` |
| Diagnostic | `python dev.py doctor` | `python dev.py doctor` |

### Workflow quotidien

**Les 2 OS** — mêmes commandes :

```bash
git pull
python dev.py doctor           # diagnostic environnement
python dev.py up               # démarrage (ou up --build si code changé)
python dev.py logs ai-story-engine
python dev.py down
```

### CLI `dev.py`

| Commande | Description |
|---|---|
| `python dev.py doctor` | Diagnostic complet de l'environnement |
| `python dev.py up` | Démarre la stack Docker |
| `python dev.py up --build` | Démarre en rebuildant les images |
| `python dev.py down` | Arrête la stack |
| `python dev.py logs [svc]` | Suit les logs |
| `python dev.py token` | Génère un JWT de test |
| `python dev.py smoke` | Smoke test semaine 3 |

---

## 🧪 Tests

### Tests unitaires — service Python

```bash
cd services/ai-story-engine
pytest -v --cov=app --cov-report=term-missing
```

Objectif : **≥ 80 %** de couverture.

### Tests unitaires — services Node

```bash
cd services/quiz-service && npm test
cd services/auth-service && npm test
cd services/story-service && npm test
```

### Smoke test intégration (cross-platform)

```bash
# 1) Générer un token de test
# Windows : $env:TOKEN = python dev.py token
# Linux   : export TOKEN=$(python dev.py token)

# 2) Lancer le smoke test
python dev.py smoke
```

Vérifie :
- ✅ `/health` répond
- ✅ Requête simple → modèle `qwen2.5:0.5b`
- ✅ Requête complexe → modèle `llama3.2:1b`
- ✅ Sans token → `401`

---

## 📁 Structure du projet

```
GameHub/
├── .env.example                    # modèle de config (commité)
├── .env                            # config locale (gitignore)
├── .gitattributes                  # fins de ligne normalisées
├── .gitignore
├── docker-compose.yml
├── dev.py                          # CLI cross-platform
├── README.md
│
├── docs/
│   └── dev-setup.md                # guide Windows + Linux détaillé
│
├── initdb/
│   ├── auth-db/                    # scripts SQL init auth
│   └── story-db/                   # scripts SQL init story
│
└── services/
    ├── quiz-service/               # Node.js + Postgres
    ├── auth-service/               # Node.js + Postgres (JWT issuer)
    ├── story-service/              # Node.js + Postgres (CRUD)
    └── ai-story-engine/            # Python FastAPI + Ollama
        ├── app/
        │   ├── main.py
        │   ├── config.py
        │   ├── schemas.py
        │   ├── security.py
        │   ├── routers/
        │   └── services/
        ├── tests/
        ├── Dockerfile
        └── requirements.txt
```

---

## 🔧 Variables d'environnement

### `.env` racine (partagé entre services)

```dotenv
# --- JWT (DOIT être identique dans auth-service et ai-story-engine) ---
JWT_SECRET=supersecret-dev

# --- Ollama (hôte) ---
OLLAMA_BASE_URL=http://host.docker.internal:11434

# --- Modèles IA ---
LIGHT_MODEL=qwen2.5:0.5b
HEAVY_MODEL=llama3.2:1b
AUTH_REQUIRED=true
LOG_LEVEL=INFO
```

> ⚠️ Le fichier `.env` est **gitignore** — il doit être créé sur **chaque machine** à partir de `.env.example`.
> Voir **[docs/dev-setup.md](docs/dev-setup.md)** pour le détail cross-platform.

---

## 🛠️ Stack technique

| Couche | Technologie |
|---|---|
| **Backend Node** | Node.js 20 · Express · PostgreSQL 16 |
| **Backend Python** | FastAPI 0.115 · Pydantic v2 · httpx |
| **IA locale** | Ollama · Qwen2.5-0.5B · Llama-3.2-1B |
| **Auth** | JWT HS256 (secret partagé entre services) |
| **Conteneurisation** | Docker · Docker Compose v2 |
| **Reverse proxy** | Nginx *(prévu semaine 6)* |
| **Orchestration** | Kubernetes k3d *(prévu semaine 6)* |
| **Observabilité** | Prometheus · Grafana *(prévu semaine 8)* |

---

## 🗺️ Roadmap

- [x] **Semaine 1** — Quiz Service + Docker Compose
- [x] **Semaine 2** — Auth Service + Story Service + JWT
- [x] **Semaine 3** — AI Story Engine (FastAPI + Ollama + Model Router)
- [ ] **Semaine 4** — RAG avec Qdrant + FastEmbed
- [ ] **Semaine 5** — CI/CD GitHub Actions + scan Trivy
- [ ] **Semaine 6** — Kubernetes local (k3d) + Ingress
- [ ] **Semaine 7** — Helm + Canary Deployment
- [ ] **Semaine 8** — Observabilité (Prometheus/Grafana + SLO)
- [ ] **Semaine 9** — Sécurité réseau + FinOps (quotas tokens)
- [ ] **Semaine 10** — Tests de charge k6 + Post-Mortem
- [ ] **Semaine 11** — Déploiement Cloud temporaire (Terraform + Hetzner)
- [ ] **Semaine 12** — ADRs + Portfolio + Démo vidéo

---

## 🤝 Contribution

1. Fork le projet
2. Créer une branche : `git checkout -b feat/ma-feature`
3. Commit : `git commit -m "feat: ma feature"`
4. Push : `git push origin feat/ma-feature`
5. Ouvrir une Pull Request

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE).

---

## 🔗 Liens utiles

- 📚 [Guide de développement Windows + Linux](docs/dev-setup.md)
- 🐳 [Documentation Docker Compose](https://docs.docker.com/compose/)
- 🤖 [Ollama](https://ollama.com/)
- ⚡ [FastAPI](https://fastapi.tiangolo.com/)