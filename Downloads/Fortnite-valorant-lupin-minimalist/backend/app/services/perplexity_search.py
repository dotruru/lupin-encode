"""
Perplexity Sonar API service for web searching prompt injection exploits
"""
import httpx
import json
from typing import List, Dict, Any, Optional


class PerplexitySearchService:
    """Service for searching the web for real PIEs using Perplexity Sonar API"""

    BASE_URL = "https://api.perplexity.ai/chat/completions"
    DEFAULT_MODEL = "sonar-pro"  # Use Sonar Pro for in-depth searches with citations

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=120.0)  # Longer timeout for web searches

    async def search_web_for_exploits(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Search the web for real prompt injection exploits using Perplexity Sonar

        Args:
            query: Search query (e.g., "latest prompt injection exploits 2025")
            max_results: Maximum number of results to return

        Returns:
            Dictionary with search results, citations, and metadata
        """
        try:
            # Construct a web search prompt
            search_prompt = f"""Search the web for: {query}

Find real-world examples including:
- Prompt injection techniques and jailbreak exploits
- CVE reports for LLM vulnerabilities
- GitHub repositories with jailbreak prompts
- Security research papers and blog posts
- Red team findings and bug bounty reports
- Recent AI safety incidents

For each exploit found, extract:
- Title/name of the exploit
- Detailed description of how it works
- The actual exploit prompt/payload if available
- Source URL and publication date
- Severity assessment
- Type (prompt_injection, jailbreak, data_extraction, etc.)
- Affected models if mentioned

Provide up to {max_results} distinct exploits with citations."""

            payload = {
                "model": self.DEFAULT_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a security researcher assistant. Search the web for accurate, up-to-date information about LLM security vulnerabilities and exploits. Always cite your sources."
                    },
                    {
                        "role": "user",
                        "content": search_prompt
                    }
                ],
                "temperature": 0.2,
                "top_p": 0.9,
                "return_citations": True,
                "search_recency_filter": "month",  # Focus on recent findings
                "max_tokens": 4000
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            response = await self.client.post(
                self.BASE_URL,
                json=payload,
                headers=headers
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Perplexity API error: {response.status_code} - {response.text}",
                    "results": []
                }

            data = response.json()

            # Extract content and citations from Perplexity response
            content = ""
            citations = []

            if "choices" in data and len(data["choices"]) > 0:
                message = data["choices"][0].get("message", {})
                content = message.get("content", "")
                citations = data.get("citations", [])

            if not content or len(content.strip()) < 10:
                return {
                    "success": False,
                    "error": "Perplexity returned empty response",
                    "results": []
                }

            # Parse the content to extract structured exploit information
            parsed_results = self._parse_exploit_content(content, citations)

            return {
                "success": True,
                "results": parsed_results[:max_results],
                "query": query,
                "citations": citations,
                "source": "perplexity_web_search"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "results": []
            }

    def _parse_exploit_content(self, content: str, citations: List[str]) -> List[Dict[str, Any]]:
        """
        Parse Perplexity response content into structured exploit entries
        Separates description from actual exploit prompt/payload

        Args:
            content: Raw text response from Perplexity
            citations: List of citation URLs

        Returns:
            List of structured exploit dictionaries
        """
        import re

        exploits = []

        # Try to find structured sections in the content
        # Look for patterns like "1. Title" or "### Title" or "**Title**"
        sections = re.split(r'\n(?=\d+\.|###|#{1,3}\s|\*\*[A-Z])', content)

        for section in sections:
            if len(section.strip()) < 20:
                continue

            # Extract title (first line or bolded text)
            title_match = re.match(r'^(?:\d+\.\s*|\#{1,3}\s*|\*\*)?(.+?)(?:\*\*)?[\n:]', section)
            title = title_match.group(1).strip() if title_match else "Web Search Result"

            # Clean up the title - remove ALL AI-style prefixes and formatting
            title = re.sub(r'^\d+\.\s*', '', title)
            title = re.sub(r'^\*\*|\*\*$', '', title)
            title = re.sub(r'^#+\s*', '', title)

            # Remove AI-style introductory phrases (comprehensive list)
            ai_prefixes = [
                r'^Below (?:are|is).*?(?:exploits?|techniques?|attacks?|examples?).*?:?\s*',
                r'^Here (?:are|is).*?(?:exploits?|techniques?|attacks?|examples?).*?:?\s*',
                r'^The following (?:are|is).*?:?\s*',
                r'^This (?:is|are).*?(?:exploit|technique|attack).*?:?\s*',
                r'^I found.*?:?\s*',
                r'^(?:Five|5|Ten|10|Up to \d+).*?(?:exploits?|techniques?).*?:?\s*',
                r'^Real-world.*?(?:exploits?|examples?).*?:?\s*',
                r'^Distinct.*?(?:exploits?|attacks?).*?:?\s*',
                r'^[Tt]itle[/:]?\s*[Nn]ame[:\s]*',
                r'^(?:Summary|Overview|Description)[:\s]*',
            ]

            for pattern in ai_prefixes:
                title = re.sub(pattern, '', title, flags=re.IGNORECASE)

            title = title.strip()

            # If title is still too long or unclear, try to extract the actual exploit name
            if len(title) > 80 or title.count(',') > 1 or not title[0].isupper():
                # Look for explicit name/title patterns
                name_match = re.search(r'(?:Name|Title|Exploit)[:\s]+([^,\n.]+)', section, re.IGNORECASE)
                if name_match:
                    title = name_match.group(1).strip()
                    title = re.sub(r'^\*\*|\*\*$', '', title)
                else:
                    # Take first meaningful clause
                    title = title.split(',')[0].strip()
                    if len(title) > 80:
                        # Last resort: use first capitalized phrase
                        words = title.split()[:8]
                        title = ' '.join(words) if len(words) < 8 else ' '.join(words) + '...'

            # If title is still generic/bad, skip this exploit entirely
            if len(title) < 10 or title.lower().startswith(('below', 'here', 'the following', 'this is')):
                continue

            # Extract exploit prompt/payload (look for code blocks or "Exploit Prompt" sections)
            exploit_content = ""
            description = ""

            # Try to find code blocks with exploit prompts
            code_blocks = re.findall(r'```(?:xml|python|bash|text)?\n?(.*?)```', section, re.DOTALL)
            if code_blocks:
                exploit_content = "\n\n".join(code_blocks).strip()

            # Also look for explicit "Exploit Prompt/Payload" sections
            prompt_match = re.search(r'\*\*Exploit Prompt[:/]?(?:Payload)?\*\*\s*[:\n]+(.*?)(?=\n\s*-\s*\*\*|\n\n---|\Z)', section, re.DOTALL | re.IGNORECASE)
            if prompt_match:
                prompt_text = prompt_match.group(1).strip()
                # Remove code block markers if present
                prompt_text = re.sub(r'^```(?:xml|python|bash|text)?\n?', '', prompt_text)
                prompt_text = re.sub(r'\n?```$', '', prompt_text)
                if not exploit_content:
                    exploit_content = prompt_text
                elif prompt_text and prompt_text not in exploit_content:
                    exploit_content += "\n\n" + prompt_text

            # Build description from non-code, non-prompt content
            # Remove title, code blocks, and prompt sections
            desc_text = section
            desc_text = re.sub(r'^(?:\d+\.\s*|\#{1,3}\s*|\*\*)?(.+?)(?:\*\*)?[\n:]', '', desc_text, count=1)  # Remove title
            desc_text = re.sub(r'```(?:xml|python|bash|text)?.*?```', '', desc_text, flags=re.DOTALL)  # Remove code blocks
            desc_text = re.sub(r'\*\*Exploit Prompt[:/]?(?:Payload)?\*\*.*?(?=\n\s*-\s*\*\*|\n\n---|\Z)', '', desc_text, flags=re.DOTALL | re.IGNORECASE)

            # Extract metadata fields BEFORE cleaning description
            # Extract severity
            severity = "medium"  # Default
            severity_match = re.search(r'\*\*[Ss]everity[:\s]*\*\*\s*([^\n*]+)', section, re.IGNORECASE)
            if not severity_match:
                severity_match = re.search(r'[Ss]everity[:\s]+([^\n,]+)', section, re.IGNORECASE)
            if severity_match:
                severity_text = severity_match.group(1).strip().lower()
                # Normalize severity values
                if 'critical' in severity_text or 'high' in severity_text:
                    severity = 'critical' if 'critical' in severity_text else 'high'
                elif 'medium' in severity_text or 'moderate' in severity_text:
                    severity = 'medium'
                elif 'low' in severity_text:
                    severity = 'low'

            # Extract exploit type
            exploit_type = "prompt_injection"  # Default
            type_match = re.search(r'\*\*[Tt]ype[:\s]*\*\*\s*([^\n*]+)', section, re.IGNORECASE)
            if not type_match:
                type_match = re.search(r'[Tt]ype[:\s]+([^\n,]+)', section, re.IGNORECASE)
            if type_match:
                type_text = type_match.group(1).strip().lower()
                if 'jailbreak' in type_text:
                    exploit_type = 'jailbreak'
                elif 'data extraction' in type_text or 'exfiltration' in type_text:
                    exploit_type = 'data_extraction'
                elif 'injection' in type_text:
                    exploit_type = 'prompt_injection'

            # Extract affected models
            target_models = []
            models_match = re.search(r'\*\*[Aa]ffected [Mm]odels[:\s]*\*\*\s*([^\n*]+)', section, re.IGNORECASE)
            if not models_match:
                models_match = re.search(r'[Aa]ffected [Mm]odels[:\s]+([^\n.]+)', section, re.IGNORECASE)
            if models_match:
                models_text = models_match.group(1).strip()
                # Parse comma-separated or common model names
                target_models = [m.strip() for m in re.split(r',|\sand\s', models_text) if m.strip()]

            # Extract clean, natural description (no AI fluff)
            # Look for the core description field first
            desc_match = re.search(r'\*\*Description[:\s]+\*\*\s*(.*?)(?=\n\s*-\s*\*\*|\n\n---|\Z)', desc_text, re.DOTALL | re.IGNORECASE)

            if desc_match:
                description = desc_match.group(1).strip()
            else:
                # Fallback: extract first substantial paragraph
                paragraphs = [p.strip() for p in desc_text.split('\n\n') if len(p.strip()) > 50]
                description = paragraphs[0] if paragraphs else desc_text.strip()

            # Remove AI-style phrases and formatting
            description = re.sub(r'\*\*[Tt]itle[/:]?[Nn]ame[:\s]*\*\*\s*', '', description)
            description = re.sub(r'\*\*[Dd]escription[:\s]*\*\*\s*', '', description)
            description = re.sub(r'\*\*[Tt]ype[:\s]*\*\*.*?(?=\n|\Z)', '', description)
            description = re.sub(r'\*\*[Ss]everity[:\s]*\*\*.*?(?=\n|\Z)', '', description)
            description = re.sub(r'\*\*[Aa]ffected [Mm]odels[:\s]*\*\*.*?(?=\n|\Z)', '', description)
            description = re.sub(r'\*\*[Ss]ource[:\s]*\*\*.*?(?=\n|\Z)', '', description)
            description = re.sub(r'Type:.*?(?=\n|\Z)', '', description, flags=re.IGNORECASE)
            description = re.sub(r'Severity:.*?(?=\n|\Z)', '', description, flags=re.IGNORECASE)
            description = re.sub(r'Affected [Mm]odels:.*?(?=\n|\Z)', '', description, flags=re.IGNORECASE)

            # Remove bullet points and list markers
            description = re.sub(r'\n\s*-\s*\*\*[^*]+\*\*', '', description)
            description = re.sub(r'\n\s*-\s+', ' ', description)
            description = re.sub(r'^\s*-\s+', '', description)

            # Remove citation markers
            description = re.sub(r'\[\d+\]', '', description)

            # Remove "---" separators
            description = re.sub(r'\n*---+\n*', '', description)

            # Normalize whitespace and make it concise
            description = re.sub(r'\s+', ' ', description).strip()

            # Limit to 2-3 sentences max (natural length)
            sentences = description.split('. ')
            if len(sentences) > 3:
                description = '. '.join(sentences[:3]) + '.'
            elif not description.endswith('.'):
                description += '.'

            # Find citation numbers in the section
            citation_refs = re.findall(r'\[(\d+)\]', section)
            section_citations = [citations[int(ref) - 1] for ref in citation_refs if int(ref) <= len(citations)]

            # ONLY add exploit if we have actual exploit content (jailbreak prompt)
            # Skip exploits that are just descriptions without actual prompts
            if description and len(description) > 30 and exploit_content and len(exploit_content) > 20:
                exploits.append({
                    "title": title[:200],  # Limit title length
                    "description": description[:1000],  # Clean description only
                    "exploit_content": exploit_content[:2000],  # Actual prompt/payload (required)
                    "severity": severity,
                    "exploit_type": exploit_type,
                    "target_models": target_models,
                    "source": "perplexity_web_search",
                    "source_type": "web",
                    "citations": section_citations
                })
            elif description and len(description) > 30:
                # If no exploit content found, mark it clearly
                exploits.append({
                    "title": title[:200],
                    "description": description[:1000],
                    "exploit_content": "No jailbreak prompt released",  # Explicitly mark as unavailable
                    "severity": severity,
                    "exploit_type": exploit_type,
                    "target_models": target_models,
                    "source": "perplexity_web_search",
                    "source_type": "web",
                    "citations": section_citations
                })

        # If no structured exploits found, create one entry with all content
        if not exploits:
            exploits.append({
                "title": "Web Search Results for Exploits",
                "description": content[:1000],
                "exploit_content": "",
                "source": "perplexity_web_search",
                "source_type": "web",
                "citations": citations
            })

        return exploits

    async def extract_exploit_from_url(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Extract exploit details from a specific URL using Perplexity

        Args:
            url: URL to extract exploit information from

        Returns:
            Extracted exploit information
        """
        try:
            prompt = f"""Analyze the content at this URL and extract exploit information: {url}

Extract:
- Exploit title/name
- Detailed description of the vulnerability
- The actual exploit prompt/payload if mentioned
- CVE ID if applicable
- Exploit type (prompt_injection, jailbreak, data_extraction, etc.)
- Severity level (low, medium, high, critical)
- Affected models/systems
- Mitigation strategies if mentioned

Provide structured information with citations."""

            payload = {
                "model": self.DEFAULT_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a security researcher. Extract detailed exploit information from web sources."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.1,
                "return_citations": True,
                "max_tokens": 2000
            }

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            response = await self.client.post(
                self.BASE_URL,
                json=payload,
                headers=headers
            )

            if response.status_code != 200:
                return None

            data = response.json()

            if "choices" in data and len(data["choices"]) > 0:
                message = data["choices"][0].get("message", {})
                content = message.get("content", "")
                citations = data.get("citations", [])

                return {
                    "content": content,
                    "citations": citations,
                    "source_url": url
                }

            return None

        except Exception as e:
            print(f"Error extracting from URL: {e}")
            return None

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
