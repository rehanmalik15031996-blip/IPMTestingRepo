# Test Inquiry Submission
$body = @{
    firstName = "Rehan"
    lastName = "Malik"
    email = "rehanmalil99@gmail.com"
    phone = ""
    message = "i want to sleep"
    selectedDate = "January 20, 2026"
} | ConvertTo-Json

Write-Host "Testing Google Cloud Function directly..." -ForegroundColor Yellow
Write-Host "URL: https://send-inquiry-541421913321.europe-west4.run.app" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://send-inquiry-541421913321.europe-west4.run.app" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Testing through Vercel API..." -ForegroundColor Yellow
Write-Host "Note: This requires the function to be deployed first" -ForegroundColor Gray
Write-Host ""

# Test through local API (if running locally) or deployed API
$apiUrl = "http://localhost:3000/api/contact?type=inquiry"
Write-Host "API URL: $apiUrl" -ForegroundColor Cyan

try {
    $apiResponse = Invoke-RestMethod -Uri $apiUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✅ API SUCCESS!" -ForegroundColor Green
    Write-Host ($apiResponse | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "⚠️ API test failed (this is expected if not running locally)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
}

