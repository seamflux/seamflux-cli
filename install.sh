#!/bin/bash

set -e

# Configuration
AGENT_NAME="seamflux"
GITHUB_REPO="https://github.com/seamflux/seamflux-cli"
RAW_URL="https://raw.githubusercontent.com/seamflux/seamflux-cli/main"
INSTALL_DIR="$HOME/.openclaw/agents/$AGENT_NAME"
AGENT_DIR="$INSTALL_DIR/agent"

# Agent files to download
AGENT_FILES=(
  "AGENTS.md"
  "BOOT.md"
  "BOOTSTRAP.md"
  "HEARTBEAT.md"
  "IDENTITY.md"
  "SOUL.md"
  "TOOLS.md"
)

echo "Installing SeamFlux agent to $INSTALL_DIR..."

# Create directories
mkdir -p "$AGENT_DIR"

# Download agent files
echo "Downloading agent files..."
for file in "${AGENT_FILES[@]}"; do
  echo "  - Downloading $file..."
  curl -fsSL "$RAW_URL/agent/$file" -o "$AGENT_DIR/$file" || {
    echo "Error: Failed to download $file"
    exit 1
  }
done

echo "Agent files downloaded successfully to $AGENT_DIR"

# Add agent to openclaw if command exists
if command -v openclaw &> /dev/null; then
  echo "Adding agent to openclaw..."
  openclaw agents add "$AGENT_NAME" --workspace "$INSTALL_DIR"
else
  echo "Note: 'openclaw' command not found. Skipping agent registration."
  echo "You can manually register later with:"
  echo "  openclaw agents add $AGENT_NAME --workspace $INSTALL_DIR"
fi

echo ""
echo "SeamFlux agent installed successfully!"
echo "Location: $AGENT_DIR"
