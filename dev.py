#!/usr/bin/env python3
"""GameHub — CLI dev cross-platform (Windows / Linux / WSL2).

Commandes:
    doctor      Diagnostic complet de l'environnement local
    up          Démarre la stack Docker
    down        Arrête la stack Docker
    logs        Suit les logs d'un service
    token       Génère un JWT de test (même secret que auth-service)
    smoke       Smoke test semaine 3 (pur Python, cross-platform)
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).parent.resolve()
AI_DIR = ROOT / "services" / "ai-story-engine"
IS_WINDOWS = platform.system() == "Windows"

G, Y, R, C, B, X = "\033[92m", "\033[93m", "\033[91m", "\033[96m", "\033[1m", "\033[0m"


def ok(m): print(f"  {G}✔{X} {m}")
def warn(m): print(f"  {Y}⚠{X} {m}")
def err(m): print(f"  {R}✘{X} {m}")
def info(m): print(f"{C}ℹ{X} {m}")
def section(t): print(f"\n{B}── {t} ──{X}")


def run(cmd, cwd=None, capture=False):
    if capture:
        return subprocess.run(
            cmd,
            cwd=cwd or ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",   # ← ne plante plus sur octets invalides
        )
    return subprocess.call(cmd, cwd=cwd or ROOT)

def which(name):
    return shutil.which(name)


def read_env(key):
    """Lit une clé depuis .env racine ou .env.local du service."""
    for f in (ROOT / ".env", AI_DIR / ".env.local"):
        if f.exists():
            for line in f.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


# ---------------------------------------------------------------- doctor

def cmd_doctor(_args):
    print(f"\n{B}🩺 Diagnostic GameHub{X}")
    print(f"  OS      : {platform.system()} {platform.release()}")
    print(f"  Python  : {sys.executable}")
    print(f"  Repo    : {ROOT}")

    errors = 0

    section("Python")
    v = sys.version_info
    if v >= (3, 11):
        ok(f"Python {v.major}.{v.minor}.{v.micro}")
    else:
        err(f"Python {v.major}.{v.minor}.{v.micro} — il faut >= 3.11")
        errors += 1

    section("Git")
    if which("git"):
        r = run(["git", "--version"], capture=True)
        ok(r.stdout.strip())
    else:
        err("git absent")
        errors += 1

    r = run(["git", "config", "--global", "core.autocrlf"], capture=True)
    val = (r.stdout or "").strip() or "(non défini)"
    if val == "input":
        ok("core.autocrlf = input")
    else:
        warn(f"core.autocrlf = {val}")
        info("  → git config --global core.autocrlf input")

    if IS_WINDOWS:
        r = run(["git", "config", "--global", "core.longpaths"], capture=True)
        if (r.stdout or "").strip() == "true":
            ok("core.longpaths = true")
        else:
            warn("core.longpaths non activé")
            info("  → git config --global core.longpaths true")

    section("Docker")
    if not which("docker"):
        err("docker absent")
        errors += 1
    else:
        r = subprocess.run(
            ["docker", "info"],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )
        if r.returncode == 0:
            ok("Docker daemon actif")
        else:
            err("Docker daemon INACTIF")
            errors += 1
        r = subprocess.run(
            ["docker", "compose", "version"], capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        if r.returncode == 0:
            ok(f"docker compose v2 — {r.stdout.strip()}")
        else:
            err("docker compose v2 absent")
            errors += 1

    section("Ollama")
    if not which("ollama"):
        err("ollama CLI absent")
        if IS_WINDOWS:
            info("  → winget install Ollama.Ollama")
        else:
            info("  → curl -fsSL https://ollama.com/install.sh | sh")
        errors += 1
    else:
        r = run(["ollama", "--version"], capture=True)
        ok(r.stdout.strip())
        try:
            with urlopen("http://localhost:11434/api/tags", timeout=3) as resp:
                data = json.loads(resp.read())
                models = [m["name"] for m in data.get("models", [])]
                ok(f"Ollama répond — {len(models)} modèle(s)")
                for req in ("qwen2.5:0.5b", "llama3.2:1b"):
                    if any(m.startswith(req) for m in models):
                        ok(f"modèle {req}")
                    else:
                        warn(f"modèle {req} MANQUANT → ollama pull {req}")
        except URLError:
            err("Ollama ne répond pas sur localhost:11434")
            if IS_WINDOWS:
                info("  → Lance l'app Ollama puis relance doctor")
            else:
                info("  → sudo systemctl start ollama")
            errors += 1

    section("Bind Ollama (0.0.0.0:11434 attendu)")
    if IS_WINDOWS:
        r = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )
        out = r.stdout or ""
        lines = [l for l in out.splitlines() if ":11434" in l]
        if any("0.0.0.0:11434" in l for l in lines):
            ok("Écoute sur 0.0.0.0:11434")
        elif lines:
            warn("Écoute sur 127.0.0.1 uniquement → Docker ne pourra pas joindre")
            info("  → Voir Partie B.4")
        else:
            warn("Aucun listener sur 11434")
    else:
        r = subprocess.run(
            ["ss", "-tlnp"],
            capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )
        out = r.stdout or ""
        lines = [l for l in out.splitlines() if ":11434" in l]
        if any("0.0.0.0:11434" in l or "*:11434" in l for l in lines):
            ok("Écoute sur 0.0.0.0:11434")
        elif lines:
            warn("Écoute sur 127.0.0.1 uniquement → Voir Partie C.4")
        else:
            warn("Aucun listener sur 11434")

    section("Fichiers racine")
    for f in (".gitattributes", ".gitignore", ".env", ".env.example", "dev.py"):
        p = ROOT / f
        (ok if p.exists() else err)(f"{f} {'présent' if p.exists() else 'MANQUANT'}")

    section("Service ai-story-engine")
    for f in (
        "services/ai-story-engine/Dockerfile",
        "services/ai-story-engine/requirements.txt",
        "services/ai-story-engine/app/main.py",
    ):
        p = ROOT / f
        (ok if p.exists() else err)(f"{f} {'présent' if p.exists() else 'MANQUANT'}")
        errors += not p.exists()

    section("JWT_SECRET")
    secret = read_env("JWT_SECRET")
    if secret and secret != "change-me-must-match-auth-service":
        ok(f"JWT_SECRET défini ({len(secret)} car.)")
    else:
        warn("JWT_SECRET par défaut ou absent")

    print()
    if errors:
        print(f"{R}{B}❌ {errors} problème(s){X}")
        return 1
    print(f"{G}{B}✅ Environnement prêt{X}")
    return 0


# ---------------------------------------------------------------- up/down/logs

def cmd_up(args):
    cmd = ["docker", "compose", "up", "-d"]
    if args.build:
        cmd.append("--build")
    if args.service:
        cmd.append(args.service)
    print(f"  $ {' '.join(cmd)}")
    return run(cmd)


def cmd_down(_args):
    return run(["docker", "compose", "down"])


def cmd_logs(args):
    cmd = ["docker", "compose", "logs", "-f"]
    if args.service:
        cmd.append(args.service)
    return run(cmd)


# ---------------------------------------------------------------- token

def cmd_token(_args):
    try:
        import datetime as dt
        import jwt
    except ImportError:
        err("PyJWT manquant → pip install -r services/ai-story-engine/requirements-dev.txt")
        return 1

    secret = os.getenv("JWT_SECRET") or read_env("JWT_SECRET")
    if not secret:
        err("JWT_SECRET introuvable (.env racine)")
        return 1

    token = jwt.encode(
        {
            "sub": "demo-user",
            "roles": ["player"],
            "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=2),
        },
        secret, algorithm="HS256",
    )
    print(token)
    return 0


# ---------------------------------------------------------------- smoke

def cmd_smoke(_args):
    base = os.getenv("BASE", "http://localhost:3004")
    print(f"\n{B}🔥 Smoke test — {base}{X}")

    def call(path, body=None, headers=None):
        method = "GET" if body is None else "POST"
        req = Request(f"{base}{path}", method=method)
        data = None
        if body is not None:
            req.add_header("Content-Type", "application/json")
            data = json.dumps(body).encode()
        for k, v in (headers or {}).items():
            req.add_header(k, v)
        try:
            with urlopen(req, data=data, timeout=120) as r:
                return r.status, json.loads(r.read() or b"{}")
        except HTTPError as e:
            return e.code, json.loads(e.read() or b"{}")
        except URLError as e:
            return 0, {"error": str(e)}

    section("/health")
    code, body = call("/health")
    if code != 200 or not body.get("ollama_reachable"):
        err(f"/health KO ({code}) : {body}")
        return 1
    ok(f"Ollama joignable — {', '.join(body.get('loaded_models') or [])}")

    token = os.getenv("TOKEN")
    if not token:
        warn("TOKEN absent → tests authentifiés ignorés")
        return 0

    auth = {"Authorization": f"Bearer {token}"}

    section("/story/generate → light attendu")
    code, body = call("/story/generate", {"prompt": "Un elfe entre dans la forêt."}, auth)
    model = body.get("decision", {}).get("model", "?")
    if code != 200 or not model.startswith("qwen"):
        err(f"attendu qwen2.5:0.5b, reçu {model} (code {code})")
        return 1
    ok(f"modèle={model}  latence={body['meta']['latency_ms']} ms")

    section("/story/generate → heavy attendu")
    code, body = call(
        "/story/generate",
        {"prompt": "Écris le chapitre final avec un twist dramatique."},
        auth,
    )
    model = body.get("decision", {}).get("model", "?")
    if code != 200 or not model.startswith("llama"):
        err(f"attendu llama3.2:1b, reçu {model}")
        return 1
    ok(f"modèle={model}")

    section("/story/generate sans token → 401 attendu")
    code, _ = call("/story/generate", {"prompt": "test"})
    if code != 401:
        err(f"attendu 401, reçu {code}")
        return 1
    ok("401")

    print(f"\n{G}{B}✅ Smoke test semaine 3 OK{X}")
    return 0


# ---------------------------------------------------------------- main

def main():
    p = argparse.ArgumentParser(prog="dev.py", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor").set_defaults(fn=cmd_doctor)

    up = sub.add_parser("up")
    up.add_argument("--build", action="store_true")
    up.add_argument("service", nargs="?")
    up.set_defaults(fn=cmd_up)

    sub.add_parser("down").set_defaults(fn=cmd_down)

    logs = sub.add_parser("logs")
    logs.add_argument("service", nargs="?")
    logs.set_defaults(fn=cmd_logs)

    sub.add_parser("token").set_defaults(fn=cmd_token)
    sub.add_parser("smoke").set_defaults(fn=cmd_smoke)

    args = p.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())