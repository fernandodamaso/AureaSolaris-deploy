#!/bin/bash
# Aurea Solaris - Environment Setup Script
# Idempotent setup for worker sessions

# Install Node.js dependencies
if [ -f "package.json" ]; then
  npm install
fi

# Ensure docs directory exists
mkdir -p docs

# Ensure .factory/library exists
mkdir -p .factory/library
