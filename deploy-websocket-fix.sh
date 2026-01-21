#!/bin/bash

# WebSocket Fix Deployment Script
# Run this script to deploy the WebSocket fixes to Railway

echo "🚀 Deploying WebSocket Fixes to Railway..."
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git remote add origin <your-repo-url>"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "📝 Found uncommitted changes. Adding files..."
    
    # Add specific files
    git add next.config.ts
    git add server.js
    git add lib/socket/client.ts
    git add WEBSOCKET_DEPLOYMENT.md
    git add WEBSOCKET_FIX_SUMMARY.md
    git add .env.production.example
    
    echo "✅ Files staged for commit"
    echo ""
    
    # Show what will be committed
    echo "Files to be committed:"
    git diff --cached --name-only
    echo ""
    
    # Commit changes
    read -p "Enter commit message (or press Enter for default): " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Fix WebSocket 404 errors in production deployment"
    fi
    
    git commit -m "$commit_msg"
    echo "✅ Changes committed"
    echo ""
fi

# Check current branch
current_branch=$(git branch --show-current)
echo "📍 Current branch: $current_branch"
echo ""

# Confirm push
read -p "Push to Railway? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Push to remote
echo "⬆️  Pushing to remote..."
git push origin $current_branch

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Code pushed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Go to Railway dashboard"
    echo "   2. Wait for deployment to complete"
    echo "   3. Check logs for: 'Socket.IO server running'"
    echo "   4. Update environment variables if needed:"
    echo "      - NEXTAUTH_URL=https://auction.sandipmaity.me"
    echo "      - NEXT_PUBLIC_SOCKET_URL=https://auction.sandipmaity.me"
    echo "   5. Test at: https://auction.sandipmaity.me"
    echo ""
    echo "📖 See WEBSOCKET_FIX_SUMMARY.md for detailed deployment guide"
else
    echo "❌ Push failed. Please check your git configuration."
    exit 1
fi
