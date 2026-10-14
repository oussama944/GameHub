function Test-HttpStatus {
  param(
    [string]$Label,
    [string]$Url,
    [string]$Method,
    [string]$Body,
    [hashtable]$Headers,
    [int]$Expected
  )
  try {
    $params = @{ Method = $Method; Uri = $Url }
    if ($Body)    { $params.Body = $Body; $params.ContentType = "application/json" }
    if ($Headers) { $params.Headers = $Headers }
    Invoke-RestMethod @params | Out-Null
    Write-Host "[$Label] ECHEC : attendu $Expected, recu 200" -ForegroundColor Red
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq $Expected) {
      Write-Host "[$Label] OK : $code" -ForegroundColor Green
    } else {
      Write-Host "[$Label] ECHEC : attendu $Expected, recu $code" -ForegroundColor Red
    }
  }
}

# 1. /me sans token -> 401
Test-HttpStatus -Label "me sans token" `
  -Url "http://localhost:3002/api/auth/me" -Method "Get" -Expected 401

# 2. register sans password -> 400
Test-HttpStatus -Label "register sans password" `
  -Url "http://localhost:3002/api/auth/register" -Method "Post" `
  -Body '{"email":"x@y.com"}' -Expected 400

# 3. register password trop court -> 400
Test-HttpStatus -Label "password trop court" `
  -Url "http://localhost:3002/api/auth/register" -Method "Post" `
  -Body '{"email":"x@y.com","password":"123"}' -Expected 400

# 4. POST /stories sans token -> 401
Test-HttpStatus -Label "stories sans token" `
  -Url "http://localhost:3003/api/stories" -Method "Post" `
  -Body '{"title":"T","content":"C"}' -Expected 401

# 5. POST /quizzes sans token -> 401
Test-HttpStatus -Label "quizzes sans token" `
  -Url "http://localhost:3001/api/quizzes" -Method "Post" `
  -Body '{"title":"T"}' -Expected 401