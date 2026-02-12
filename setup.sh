#!/bin/bash

echo "🔌 Stripboard Designer - Quick Start"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this script from the stripboard-designer directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "🚀 To start the development server, run:"
    echo "   npm run dev"
    echo ""
    echo "📖 Then open http://localhost:5173 in your browser"
    echo ""
    echo "💡 Check out DEVELOPMENT.md for tips on building features with Cursor!"
else
    echo ""
    echo "❌ Installation failed. Please check the error messages above."
    exit 1
fi
