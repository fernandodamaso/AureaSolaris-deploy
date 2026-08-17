# Aurea Solaris Web API

The Web V1 API package targets Python 3.12. Install and validate it from the repository root so local commands match CI.

```bash
python -m pip install -e "./services/api[dev]"
python -m pytest services/api/tests/test_health.py services/api/tests/test_errors.py -q
python -m pytest services/api/tests -q
python -m ruff check services/api
python -m mypy --config-file services/api/pyproject.toml services/api/src
```

`aurea_api.main.create_app()` builds the application shell without opening database or astrology-engine connections at import time. `/health` reports process health, while `/ready` fails closed until database and engine readiness probes are injected by later infrastructure work.

Request logs contain only the request ID, HTTP method, matched route template, status, and duration. They do not include authorization values or request bodies. CORS origins come only from `AUREA_ALLOWED_ORIGINS`.

The explicit mypy config path is required because mypy does not discover a nested `pyproject.toml` from the repository root. Keep database credentials and other secrets in ignored or deployment-managed environment storage only.
