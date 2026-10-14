# === 1. Inscription (email unique pour éviter "already exists") ===
$email = "demo-$(Get-Date -Format 'yyyyMMddHHmmss')@gamehub.dev"
$body = @{ email = $email; password = "password123" } | ConvertTo-Json
$register = Invoke-RestMethod -Method Post -Uri http://localhost:3002/api/auth/register `
  -ContentType "application/json" -Body $body
$token = $register.token
Write-Host "[1] Token recu : $($token.Substring(0,20))... (user=$email)" -ForegroundColor Green

# === 2. Me ===
$me = Invoke-RestMethod -Method Get -Uri http://localhost:3002/api/auth/me `
  -Headers @{ Authorization = "Bearer $token" }
Write-Host "[2] User : $($me.email)" -ForegroundColor Green

# === 3. Creer une histoire ===
$storyBody = @{
  title = "Le chateau"
  content = "Tu arrives devant un chateau."
  choices = @(@{ text = "Entrer" }, @{ text = "Fuir" })
} | ConvertTo-Json -Depth 5

$story = Invoke-RestMethod -Method Post -Uri http://localhost:3003/api/stories `
  -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } `
  -Body $storyBody
Write-Host "[3] Story creee : $($story.title) (id=$($story.id))" -ForegroundColor Green

# === 4. Lister les histoires (public) ===
$stories = Invoke-RestMethod -Method Get -Uri http://localhost:3003/api/stories
Write-Host "[4] Nombre d'histoires : $($stories.Count)" -ForegroundColor Green

# === 5. Lire l'histoire + ses choix ===
$storyId = $story.id
$detail = Invoke-RestMethod -Method Get -Uri "http://localhost:3003/api/stories/$storyId"
Write-Host "[5] Choix de l'histoire : $($detail.choices.Count)" -ForegroundColor Green

# === 6. Creer un quiz (protege) ===
$quizBody = @{ title = "Quiz TS"; description = "Test" } | ConvertTo-Json
$quiz = Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/quizzes `
  -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } `
  -Body $quizBody
Write-Host "[6] Quiz cree : $($quiz.title)" -ForegroundColor Green

Write-Host "`n=== TOUT FONCTIONNE ===" -ForegroundColor Cyan