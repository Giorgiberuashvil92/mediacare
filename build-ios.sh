#!/bin/bash

# iOS Project Build Script for Xcode

echo "📱 Medicare iOS Project Setup"
echo "=============================="
echo ""

cd /Users/gio/Documents/Medicare

# Check if ios folder exists
if [ ! -d "ios" ]; then
    echo "📦 iOS project-ის შექმნა..."
    npx expo prebuild --platform ios
else
    echo "✅ iOS project უკვე არსებობს"
fi

# Install CocoaPods dependencies
if [ -d "ios" ]; then
    echo ""
    echo "📦 CocoaPods dependencies-ის დაყენება..."
    cd ios
    pod install
    cd ..
    
    echo ""
    echo "🚀 Xcode-ში გახსნა..."
    # Try .xcworkspace first, fallback to .xcodeproj
    if [ -f "ios/medicare.xcworkspace" ]; then
        open ios/medicare.xcworkspace
    elif [ -f "ios/medicare.xcodeproj" ]; then
        open ios/medicare.xcodeproj
    else
        # Try to find any .xcworkspace or .xcodeproj
        WORKSPACE=$(find ios -name "*.xcworkspace" -type d | head -1)
        PROJECT=$(find ios -name "*.xcodeproj" -type d | head -1)
        
        if [ ! -z "$WORKSPACE" ]; then
            open "$WORKSPACE"
        elif [ ! -z "$PROJECT" ]; then
            open "$PROJECT"
        else
            echo "❌ Xcode project ვერ მოიძებნა ios/ folder-ში"
            exit 1
        fi
    fi
    
    echo ""
    echo "✅ მზადაა!"
    echo ""
    echo "📝 შემდეგი ნაბიჯები:"
    echo "1. Xcode-ში აირჩიე შენი iOS მოწყობილობა (simulator-ის ნაცვლად)"
    echo "2. Project → Signing & Capabilities → აირჩიე Team"
    echo "3. დააჭირე Run (⌘ + R)"
    echo ""
    echo "💡 Metro Bundler-ის გასაშვებად ცალკე terminal-ში:"
    echo "   npx expo start"
else
    echo "❌ iOS project-ის შექმნა ვერ მოხერხდა"
    exit 1
fi

