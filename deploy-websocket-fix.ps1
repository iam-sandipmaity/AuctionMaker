# WebSocket Fix Deployment Script for Windows PowerShell
# Run this script to deploy the WebSocket fixes to Railway

Write-Host "🚀 Deploying WebSocket Fixes to Railway..." -ForegroundColor Green
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "❌ Git repository not found. Please initialize git first:" -ForegroundColor Red
    Write-Host "   git init"
    Write-Host "   git remote add origin <your-repo-url>"
    exit 1
}

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Found uncommitted changes. Adding files..." -ForegroundColor Yellow
    
    # Add specific files
    git add next.config.ts
    git add server.js
    git add lib/socket/client.ts
    git add WEBSOCKET_DEPLOYMENT.md
    git add WEBSOCKET_FIX_SUMMARY.md
    git add .env.production.example
    
    Write-Host "✅ Files staged for commit" -ForegroundColor Green
    Write-Host ""
    
    # Show what will be committed
    Write-Host "Files to be committed:" -ForegroundColor Cyan
    git diff --cached --name-only
    Write-Host ""
    
    # Commit changes
    $commit_msg = Read-Host "Enter commit message (or press Enter for default)"
    if ([string]::IsNullOrWhiteSpace($commit_msg)) {
        $commit_msg = "Fix WebSocket 404 errors in production deployment"
    }
    
    git commit -m $commit_msg
    Write-Host "✅ Changes committed" -ForegroundColor Green
    Write-Host ""
}

# Check current branch
$current_branch = git branch --show-current
Write-Host "📍 Current branch: $current_branch" -ForegroundColor Cyan
Write-Host ""

# Confirm push
$confirm = Read-Host "Push to Railway? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Push to remote
Write-Host "⬆️  Pushing to remote..." -ForegroundColor Yellow
git push origin $current_branch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Code pushed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Go to Railway dashboard"
    Write-Host "   2. Wait for deployment to complete"
    Write-Host "   3. Check logs for: 'Socket.IO server running'"
    Write-Host "   4. Update environment variables if needed:"
    Write-Host "      - NEXTAUTH_URL=https://auction.sandipmaity.me"
    Write-Host "      - NEXT_PUBLIC_SOCKET_URL=https://auction.sandipmaity.me"
    Write-Host "   5. Test at: https://auction.sandipmaity.me"
    Write-Host ""
    Write-Host "📖 See WEBSOCKET_FIX_SUMMARY.md for detailed deployment guide" -ForegroundColor Yellow
} else {
    Write-Host "❌ Push failed. Please check your git configuration." -ForegroundColor Red
    exit 1
}
