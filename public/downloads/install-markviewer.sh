#!/bin/bash
# MarkViewer macOS Installer
# This script removes the quarantine flag and launches the app

echo "Installing MarkViewer..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$SCRIPT_DIR/MarkViewer.app"

# Check if the app exists in the same directory
if [ ! -d "$APP_PATH" ]; then
    echo "Error: MarkViewer.app not found in the same folder as this script."
    echo "Please extract the ZIP file first and run this script from the same folder."
    exit 1
fi

# Remove quarantine attribute
echo "Removing macOS quarantine flag..."
xattr -cr "$APP_PATH"

# Open the app
echo "Launching MarkViewer..."
open "$APP_PATH"

echo "Done! MarkViewer should now be running."
