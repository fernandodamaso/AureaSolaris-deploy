import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import main_api


class ChatProviderSelectionTests(unittest.TestCase):
    def test_external_consent_is_required_before_provider_call(self):
        with TestClient(main_api.app) as client:
            with patch.object(main_api, "_openai_chat", new=AsyncMock()) as openai:
                response = client.post(
                    "/chat",
                    json={"messages": [{"role": "user", "content": "Olá"}], "provider": "openai"},
                )
        self.assertEqual(response.status_code, 403)
        openai.assert_not_awaited()

    def test_openai_is_selected_without_probe_or_fallback_to_ollama(self):
        with TestClient(main_api.app) as client:
            with patch.object(main_api, "_openai_chat", new=AsyncMock(return_value={"reply": "Resposta", "provider": "openai"})) as openai:
                with patch.object(main_api, "_ollama_available", new=AsyncMock(side_effect=AssertionError("Ollama must not be probed"))):
                    response = client.post(
                        "/chat",
                        json={
                            "messages": [{"role": "user", "content": "Olá"}],
                            "provider": "openai",
                            "allow_external": True,
                        },
                    )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"reply": "Resposta", "provider": "openai"})
        openai.assert_awaited_once()

    def test_gateway_is_selected_explicitly(self):
        with TestClient(main_api.app) as client:
            with patch.object(main_api, "_hermes_gateway_chat", new=AsyncMock(return_value={"reply": "Gateway", "provider": "hermes_gateway"})) as gateway:
                response = client.post(
                    "/chat",
                    json={
                        "messages": [{"role": "user", "content": "Olá"}],
                        "provider": "hermes_gateway",
                        "allow_external": True,
                    },
                )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["provider"], "hermes_gateway")
        gateway.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
