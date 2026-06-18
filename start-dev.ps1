# FarmDirect — Dev Startup Script
# Starts all 3 services: Backend API, ML Pricing Service, and prompts for Frontend

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host ""
Write-Host "=============================" -ForegroundColor Green
Write-Host "  FarmDirect Dev Environment " -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# 1. Start Backend API (port 8000)
Write-Host "[1/3] Starting Backend API on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$root\backend'; python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2

# 2. Start ML Pricing Service (port 8001)
Write-Host "[2/3] Starting ML Pricing Service on port 8001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$root\ml_service'; python run.py"

Start-Sleep -Seconds 2

# 3. Start Frontend
Write-Host "[3/3] Starting Frontend (Expo)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$root\frontend'; npx expo start --clear"

Write-Host ""
Write-Host "All services launching in separate windows." -ForegroundColor Green
Write-Host ""
Write-Host "  Backend API  -> http://localhost:8000" -ForegroundColor White
Write-Host "  ML Service   -> http://localhost:8001" -ForegroundColor White
Write-Host "  Frontend     -> Scan QR in the Expo window" -ForegroundColor White
Write-Host ""
