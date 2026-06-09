# Start backend (now includes ML routes)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\harsh\Downloads\farmdirect\farmdirect\backend'; python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000"

# Start ngrok
Start-Process powershell -ArgumentList "-NoExit", "-Command", "C:\ngrok\ngrok.exe start backend"

Write-Host "Waiting for ngrok to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Fetch ngrok URL
$tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
$backendUrl = ($tunnels.tunnels | Where-Object { $_.config.addr -like "*8000*" }).public_url

# Update api.ts
$api = Get-Content "frontend\src\api.ts" -Raw
$api = $api -replace 'const BASE_URL = ".*"', "const BASE_URL = `"$backendUrl`""
$api = $api -replace 'const ML_BASE_URL = ".*"', "const ML_BASE_URL = `"$backendUrl`""
Set-Content "frontend\src\api.ts" $api

Write-Host "Backend: $backendUrl" -ForegroundColor Green
Write-Host "api.ts updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run: cd frontend && npx expo start --clear" -ForegroundColor Cyan
