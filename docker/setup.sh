#!/usr/bin/env bash
set -euo pipefail

# --- dnsmasq for *.publingo.kom ---
echo "Checking dnsmasq setup..."

if ! command -v dnsmasq &>/dev/null; then
  echo "Installing dnsmasq via Homebrew..."
  brew install dnsmasq
fi

DNSMASQ_CONF="$(brew --prefix)/etc/dnsmasq.conf"

if ! grep -q "publingo.kom" "$DNSMASQ_CONF" 2>/dev/null; then
  echo "Configuring dnsmasq to resolve *.publingo.kom -> 127.0.0.1..."
  echo "address=/publingo.kom/127.0.0.1" >> "$DNSMASQ_CONF"
fi

# Restart dnsmasq
sudo brew services restart dnsmasq

# Set up macOS resolver for .kom TLD
if [ ! -f /etc/resolver/kom ]; then
  echo "Creating /etc/resolver/kom (requires sudo)..."
  sudo mkdir -p /etc/resolver
  echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/kom > /dev/null
fi

echo "DNS ready: *.publingo.kom -> 127.0.0.1"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "Starting Docker Compose stack..."
cd "$REPO_ROOT"
op run --env-file=.env.tpl -- docker compose up --build "$@"
