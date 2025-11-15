import json
import logging
import re
from typing import Optional, Dict, Any, List

import httpx


logger = logging.getLogger(__name__)


class ProviderLookupService:
    """Use Perplexity Sonar to identify the company behind a target model."""

    BASE_URL = "https://api.perplexity.ai/chat/completions"
    MODEL = "sonar-pro"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def find_provider(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Ask Perplexity for provider contact info for a given model."""
        if not self.api_key:
            return None

        system_prompt = (
            "You are an AI security researcher. Given a model identifier, "
            "return ONLY JSON describing the organization that operates it. "
            "Infer the provider name, company name, official security or abuse "
            "contact email if one exists, and a list of model name patterns "
            "belonging to that provider."
        )

        user_prompt = f"""
Model identifier: {model_name}

Respond with strictly valid JSON object:
{{
  "provider_name": "<short provider id like anthro>", 
  "company_name": "<official company name>",
  "security_email": "<security@company.com or null>",
  "contact_url": "<security page url or null>",
  "webhook_url": null,
  "model_patterns": ["{model_name.split('/')[0]}/*", "{model_name}"]
}}

If unsure, set the corresponding fields to null. Do not add commentary.
"""

        payload = {
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "top_p": 0.9,
            "max_tokens": 800
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.BASE_URL, json=payload, headers=headers)

        if response.status_code != 200:
            logger.warning("Perplexity provider lookup failed: %s %s", response.status_code, response.text)
            return None

        data = response.json()
        content = ""
        if data.get("choices"):
            content = data["choices"][0]["message"]["content"]

        provider_data = self._extract_json(content)
        if not provider_data:
            logger.warning("Perplexity returned unparseable provider data for %s", model_name)
            return None

        # Basic validation
        provider_name = provider_data.get("provider_name")
        company_name = provider_data.get("company_name")
        if not provider_name and company_name:
            provider_name = company_name.lower().split()[0]
        if not company_name and provider_name:
            company_name = provider_name.title()

        if not provider_name and not company_name:
            return None

        provider_data["provider_name"] = provider_name or company_name
        provider_data["company_name"] = company_name or provider_name

        patterns = provider_data.get("model_patterns")
        if not isinstance(patterns, list) or not patterns:
            base = model_name.split("/")[0] if "/" in model_name else model_name
            patterns = [model_name, f"{base}/*"] if base else [model_name]
        provider_data["model_patterns"] = patterns

        return provider_data

    def _extract_json(self, content: str) -> Optional[Dict[str, Any]]:
        if not content:
            return None

        cleaned = content.strip()
        # Remove Markdown code fences if present
        fence_match = re.match(r"```(?:json)?\s*(.*)```", cleaned, re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to locate JSON substring
            brace_start = cleaned.find("{")
            brace_end = cleaned.rfind("}")
            if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
                snippet = cleaned[brace_start:brace_end + 1]
                try:
                    return json.loads(snippet)
                except json.JSONDecodeError:
                    return None
        return None
