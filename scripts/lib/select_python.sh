#!/usr/bin/env bash

aurea_select_python() {
  local requested="${PYTHON:-}" candidate
  local -a candidates=()

  [[ -z "$requested" ]] || candidates+=("$requested")
  candidates+=(python3 python python.exe)
  PYTHON=""

  for candidate in "${candidates[@]}"; do
    [[ -z "$candidate" ]] && continue
    if command -v "$candidate" >/dev/null 2>&1 \
      && "$candidate" --version >/dev/null 2>&1; then
      PYTHON="$candidate"
      return 0
    fi
  done

  printf 'Python 3 is required.\n' >&2
  return 1
}
