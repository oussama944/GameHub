#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$PythonVersion = "3.11",
    [switch]$SkipFirewall
)

$ErrorActionPreference = "Stop"

function Info  ($m) { Write-Host "ℹ $m" -ForegroundColor Cyan }
function Ok    ($m) { Write-Host "✔ $m" -ForegroundColor Green }
function Warn  ($m) { Write-Host "⚠ $m" -ForegroundColor Yellow }
function Fail  ($m) { Write-Host "✘ $m" -ForegroundColor Red; exit 1 }
function Step  ($m) { Write-Host "`n▶ $m" -ForegroundColor Magenta }

# ---------- 0. Vérifs préalables ----------
Step "Vérifications préalables"

if ($PSVersionTable.PSVersion.Major -lt 7) {
    Fail "PowerShell 7+ requis. Installe-le : winget install Microsoft.PowerShell"
}
Ok "PowerShell $($PSVersionTable.PSVersion)"

foreach ($cmd in @("git","docker","winget")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Fail "$cmd introuvable. Installe-le avant de relancer."
    }
}
Ok "git, docker, winget OK"

docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Fail "docker compose indisponible. Démarre Docker Desktop." }
Ok "docker compose OK"

if (-not (Test-Path $ProjectRoot)) { Fail "ProjectRoot introuvable : $ProjectRoot" }
Set-Location $ProjectRoot
Ok "Racine projet : $ProjectRoot"

# ---------- 1. WSL2 ----------
Step "WSL2"
try {
    wsl --status *> $null
    Ok "WSL2 présent"
} catch {
    Warn "WSL non détecté — installe-le : wsl --install ; puis redémarre"
}
Info "Vérifie dans Docker Desktop → Settings → General : 'Use WSL 2 based engine'"

# ---------- 2. Ollama ----------
Step "Ollama"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Info "Installation via winget…"
    winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
    Warn "Ferme/rouvre le terminal pour que le PATH soit pris en compte, puis relance ce script."
    exit 0
}
Ok "Ollama présent : $(ollama --version 2>&1 | Select-Object -First 1)"

# ---------- 3. Variables d'env Ollama ----------
Step "Variables d'environnement Ollama (portée User)"
$ollamaVars = @{
    "OLLAMA_HOST"              = "0.0.0.0:11434"
    "OLLAMA_KEEP_ALIVE"        = "30m"
    "OLLAMA_MAX_LOADED_MODELS" = "1"
    "OLLAMA_NUM_PARALLEL"      = "1"
}
foreach ($k in $ollamaVars.Keys) {
    [Environment]::SetEnvironmentVariable($k, $ollamaVars[$k], "User")
    Ok "$k = $($ollamaVars[$k])"
}

# ---------- 4. Redémarrage Ollama ----------
Step "Redémarrage d'Ollama pour relire les variables"
Get-Process ollama* -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
$ollamaExe = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"
if (Test-Path $ollamaExe) {
    Start-Process $ollamaExe
    Start-Sleep -Seconds 3
    Ok "Ollama relancé"
} else {
    Warn "ollama app.exe introuvable — relance Ollama manuellement"
}

# ---------- 5. Vérif bind 0.0.0.0 ----------
Step "Vérification de l'écoute sur 0.0.0.0:11434"
$netstat = netstat -ano | Select-String ":11434"
if ($netstat -match "0\.0\.0\.0:11434") {
    Ok "Ollama écoute bien sur 0.0.0.0:11434"
} else {
    Warn "Ollama n'écoute pas sur 0.0.0.0. Détail :`n$netstat"
    Warn "Quitte Ollama (tray → Quit), relance-le, puis relance ce script."
}

# ---------- 6. Pare-feu ----------
Step "Règle pare-feu"
if ($SkipFirewall) {
    Warn "SkipFirewall activé — étape ignorée"
} else {
    $rule = Get-NetFirewallRule -DisplayName "Ollama Dev 11434" -ErrorAction SilentlyContinue
    if ($rule) {
        Ok "Règle déjà présente"
    } else {
        try {
            New-NetFirewallRule -DisplayName "Ollama Dev 11434" `
                -Direction Inbound -Protocol TCP -LocalPort 11434 `
                -Action Allow -Profile Private,Domain | Out-Null
            Ok "Règle créée"
        } catch {
            Warn "Impossible de créer la règle (relance en admin si besoin) : $_"
        }
    }
}

# ---------- 7. Modèles ----------
Step "Téléchargement des modèles"
foreach ($m in @("qwen2.5:0.5b","llama3.2:1b")) {
    Info "pull $m"
    ollama pull $m
}
ollama list

# ---------- 8. jq ----------
Step "jq"
if (Get-Command jq -ErrorAction SilentlyContinue) {
    Ok "jq déjà installé"
} else {
    winget install --id jqlang.jq -e --accept-source-agreements --accept-package-agreements
    Warn "Redémarre le terminal pour utiliser jq"
}

# ---------- 9. Git ----------
Step "Configuration Git"
git config --global core.longpaths true
git config --global core.autocrlf input
Ok "core.longpaths=true, core.autocrlf=input"

# ---------- 10. .gitattributes ----------
Step ".gitattributes"
$gitattributes = Join-Path $ProjectRoot ".gitattributes"
$content = @"
* text=auto eol=lf

*.sh        text eol=lf
*.ps1       text eol=crlf
Dockerfile  text eol=lf
*.py        text eol=lf
*.yml       text eol=lf
*.yaml      text eol=lf
"@
if (-not (Test-Path $gitattributes) -or (Get-Content $gitattributes -Raw) -ne $content) {
    Set-Content -Path $gitattributes -Value $content -Encoding UTF8 -NoNewline
    Ok ".gitattributes écrit"
} else {
    Ok ".gitattributes déjà à jour"
}

# ---------- 11. WSL2 RAM cap ----------
Step "Cap RAM WSL2 (.wslconfig)"
$wslconfig = Join-Path $env:USERPROFILE ".wslconfig"
if (-not (Test-Path $wslconfig)) {
    @"
[wsl2]
memory=4GB
processors=2
swap=1GB
"@ | Set-Content -Path $wslconfig -Encoding UTF8
    Ok ".wslconfig créé (memory=4GB). Lance 'wsl --shutdown' pour appliquer."
} else {
    Ok ".wslconfig déjà présent — non modifié"
}

# ---------- 12. Python / venv ----------
Step "Python $PythonVersion et venv"
$serviceDir = Join-Path $ProjectRoot "services\ai-story-engine"
if (-not (Test-Path $serviceDir)) {
    New-Item -ItemType Directory -Force -Path `
        "$serviceDir\app\routers", "$serviceDir\app\services", `
        "$serviceDir\tests", "$serviceDir\scripts" | Out-Null
    Ok "Arborescence créée"
}

Push-Location $serviceDir
try {
    if (-not (Test-Path ".venv")) {
        Info "Création du venv avec Python $PythonVersion"
        py -$PythonVersion -m venv .venv
        if ($LASTEXITCODE -ne 0) { Fail "Échec création venv. Installe Python $PythonVersion : winget install Python.Python.$PythonVersion" }
    } else {
        Ok "venv déjà présent"
    }

    $activate = ".\.venv\Scripts\Activate.ps1"
    if (-not (Test-Path $activate)) { Fail "Activate.ps1 introuvable" }

    # Autoriser l'exécution du venv pour l'utilisateur courant
    $policy = Get-ExecutionPolicy -Scope CurrentUser
    if ($policy -in @("Restricted","Undefined","AllSigned")) {
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Ok "ExecutionPolicy CurrentUser → RemoteSigned"
    }

    & $activate
    Ok "venv activé : $(python --version)"

    python -m pip install --upgrade pip
    if (Test-Path "requirements-dev.txt") {
        pip install -r requirements-dev.txt
        Ok "Dépendances installées"
    } else {
        Warn "requirements-dev.txt absent — ignore cette étape pour l'instant"
    }
} finally {
    Pop-Location
}

# ---------- Récap ----------
Step "Récapitulatif"
Write-Host @"
Prochaines étapes :
  1) Crée services\ai-story-engine\.env à partir de .env.example
     OLLAMA_BASE_URL=http://host.docker.internal:11434
  2) cd services\ai-story-engine ; .\.venv\Scripts\Activate.ps1
  3) uvicorn app.main:app --reload --port 8001
  4) Test : curl.exe -s http://localhost:8001/health
"@ -ForegroundColor Cyan
Ok "Setup Windows terminé."