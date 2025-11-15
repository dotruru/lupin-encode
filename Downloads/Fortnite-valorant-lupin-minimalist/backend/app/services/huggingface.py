import httpx
import json
from typing import List, Dict, Any, Optional

class HuggingFaceService:
    """Service for searching exploit databases using Hugging Face Inference API"""

    BASE_URL = "https://router.huggingface.co/hf-inference/models"
    DEFAULT_MODEL = "meta-llama/Llama-3.2-3B-Instruct"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=60.0)

    async def search_exploits(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Search for prompt injection exploits using Hugging Face Inference API

        Args:
            query: Search query (e.g., "prompt injection techniques 2024")
            max_results: Maximum number of results to return

        Returns:
            Dictionary with search results and metadata
        """
        try:
            # Construct a search-focused prompt
            search_prompt = f"""You are a security researcher. Provide information about: {query}

Focus on:
1. Real-world prompt injection and jailbreak examples
2. LLM vulnerability reports
3. Red team findings and security research
4. Known attack patterns

For up to {max_results} exploits, provide:
- Title/name of the exploit
- Description of how it works
- Example exploit prompt if known
- Severity level (low/medium/high/critical)
- Type (jailbreak, prompt_injection, data_extraction, etc.)

Format response as JSON array."""

            payload = {
                "inputs": search_prompt,
                "parameters": {
                    "max_new_tokens": 2000,
                    "temperature": 0.3,
                    "return_full_text": False
                }
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            response = await self.client.post(
                f"{self.BASE_URL}/{self.DEFAULT_MODEL}",
                json=payload,
                headers=headers
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Hugging Face API error: {response.status_code} - {response.text}",
                    "results": []
                }

            data = response.json()

            # Handle different response formats
            if isinstance(data, list) and len(data) > 0:
                content = data[0].get("generated_text", "")
            elif isinstance(data, dict):
                content = data.get("generated_text", "")
            else:
                content = str(data)

            # If content is empty, return error
            if not content or len(content.strip()) < 10:
                return {
                    "success": False,
                    "error": "Hugging Face returned empty response",
                    "results": []
                }

            # Try to parse JSON from response, but also handle plain text
            parsed_results = []
            try:
                # Look for JSON in the response
                import re
                json_match = re.search(r'\[[\s\S]*\]', content)
                if json_match:
                    parsed_results = json.loads(json_match.group())
                    if isinstance(parsed_results, dict):
                        parsed_results = [parsed_results]
            except:
                pass

            # If no JSON found or parsing failed, parse the text into structured results
            if not parsed_results:
                # Split content into paragraphs and create results
                lines = [line.strip() for line in content.split('\n') if line.strip()]

                # Group lines into exploits (look for numbered lists or patterns)
                current_exploit = {"title": "", "description": ""}
                exploits = []

                for line in lines:
                    # Check if this looks like a title (numbered, or short line)
                    if re.match(r'^\d+[\.\)]\s+', line) or (len(line) < 100 and ':' not in line):
                        if current_exploit["description"]:
                            exploits.append(current_exploit)
                        current_exploit = {
                            "title": re.sub(r'^\d+[\.\)]\s+', '', line),
                            "description": ""
                        }
                    else:
                        if current_exploit["description"]:
                            current_exploit["description"] += " " + line
                        else:
                            current_exploit["description"] = line

                # Add the last exploit
                if current_exploit["description"]:
                    exploits.append(current_exploit)

                # If we found structured exploits, use them
                if exploits:
                    parsed_results = [{
                        "title": exp["title"] or "Discovered Exploit",
                        "description": exp["description"],
                        "source": "huggingface",
                        "source_type": "huggingface"
                    } for exp in exploits]
                else:
                    # Otherwise, just return the whole content as one result
                    parsed_results = [{
                        "title": f"AI Security Research: {query}",
                        "description": content,
                        "source": "huggingface",
                        "source_type": "huggingface"
                    }]

            return {
                "success": True,
                "results": parsed_results[:max_results],  # Limit to requested number
                "query": query
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "results": []
            }

    async def extract_exploit_details(self, description: str) -> Optional[Dict[str, Any]]:
        """
        Extract exploit details from a description using Hugging Face

        Args:
            description: Text description to analyze

        Returns:
            Extracted exploit information
        """
        try:
            prompt = f"""Analyze this security information: {description}

Extract:
- Exploit title/name
- Detailed description
- The actual exploit prompt/content if mentioned
- Exploit type (prompt_injection, jailbreak, data_extraction, etc.)
- Severity level (low, medium, high, critical)
- Affected models if mentioned

Return as JSON."""

            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 1000,
                    "temperature": 0.1,
                    "return_full_text": False
                }
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            response = await self.client.post(
                f"{self.BASE_URL}/{self.DEFAULT_MODEL}",
                json=payload,
                headers=headers
            )

            if response.status_code != 200:
                return None

            data = response.json()

            if isinstance(data, list) and len(data) > 0:
                content = data[0].get("generated_text", "")
            elif isinstance(data, dict):
                content = data.get("generated_text", "")
            else:
                return None

            # Try to parse JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                return json.loads(json_match.group())

            return None

        except Exception as e:
            print(f"Error extracting exploit details: {e}")
            return None

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
