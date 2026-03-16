#!/usr/bin/env bash
set -euo pipefail

# --- dnsmasq for *.eleming.kom and *.eleming.yo ---
echo "Checking dnsmasq setup..."

if ! command -v dnsmasq &>/dev/null; then
  echo "Installing dnsmasq via Homebrew..."
  brew install dnsmasq
fi

DNSMASQ_CONF="$(brew --prefix)/etc/dnsmasq.conf"

# Platform domains: *.eleming.kom -> 127.0.0.1
if ! grep -q "eleming.kom" "$DNSMASQ_CONF" 2>/dev/null; then
  echo "Configuring dnsmasq to resolve *.eleming.kom -> 127.0.0.1..."
  echo "address=/eleming.kom/127.0.0.1" >> "$DNSMASQ_CONF"
fi

# User site domains: *.eleming.yo -> 127.0.0.1
if ! grep -q "eleming.yo" "$DNSMASQ_CONF" 2>/dev/null; then
  echo "Configuring dnsmasq to resolve *.eleming.yo -> 127.0.0.1..."
  echo "address=/eleming.yo/127.0.0.1" >> "$DNSMASQ_CONF"
fi

# Restart dnsmasq
sudo brew services restart dnsmasq

# Set up macOS resolver for .dev TLD
if [ ! -f /etc/resolver/kom ]; then
  echo "Creating /etc/resolver/kom (requires sudo)..."
  sudo mkdir -p /etc/resolver
  echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/kom > /dev/null
fi

# Set up macOS resolver for .yo TLD
if [ ! -f /etc/resolver/yo ]; then
  echo "Creating /etc/resolver/yo (requires sudo)..."
  sudo mkdir -p /etc/resolver
  echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/yo > /dev/null
fi

echo "DNS ready: *.eleming.kom and *.eleming.yo -> 127.0.0.1"

# Clean up old /etc/hosts entries if present
if grep -q "eleming.local" /etc/hosts 2>/dev/null; then
  echo ""
  echo "Note: old eleming.local entries found in /etc/hosts."
  echo "You can remove them manually: sudo sed -i '' '/eleming.local/d' /etc/hosts"
fi

echo ""
echo "Starting Docker Compose stack (secrets from 1Password)..."
op run --env-file=.env.tpl -- docker compose up --build "$@"