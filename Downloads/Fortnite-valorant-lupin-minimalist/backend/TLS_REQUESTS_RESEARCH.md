# TLS-Requests Integration & Scraping Results

## What We Accomplished

### ✅ Successfully Scraped:
1. **L1B3RT4S Repository** - 142 jailbreak exploits added to database

### 🔄 Attempted with TLS-Requests:
2. **CL4R1T4S** - System prompts (rate limited)
3. **chatgpt_system_prompt** - GPT prompts (rate limited)

## TLS-Requests Research

### What is TLS-Requests?
- Python library wrapper around Go-based TLS client
- Mimics browser TLS fingerprints to bypass anti-bot systems
- Successfully bypasses Cloudflare Bot Fight Mode
- Ideal for scraping protected websites

### Installation:
```bash
pip install wrapper-tls-requests
```

### Usage:
```python
import tls_requests

# Simple GET request with browser-like TLS fingerprint
response = tls_requests.get("https://example.com")

# With proxy rotation
response = tls_requests.get(
    url,
    proxy=proxy_list,
    headers=tls_requests.HeaderRotator(),
    tls_identifier=tls_requests.TLSIdentifierRotator()
)
```

## Why GitHub Rate Limiting Still Occurred

### Root Cause:
GitHub's rate limiting is **IP-based**, not just TLS fingerprint-based:
- **Unauthenticated requests**: 60 requests/hour per IP
- **Authenticated requests**: 5,000 requests/hour per token

### TLS-Requests Limitations:
1. **TLS fingerprinting** helps bypass anti-bot systems (Cloudflare, DataDome)
2. **Does NOT bypass** API rate limits that are IP/token-based
3. GitHub API specifically requires authentication tokens for high-volume scraping

## Solutions for GitHub Scraping

### Option 1: Use GitHub Personal Access Token (Recommended)
```python
import requests

headers = {
    'Authorization': 'token YOUR_GITHUB_TOKEN',
    'Accept': 'application/vnd.github.v3+json'
}

response = requests.get(url, headers=headers)
# Rate limit: 5,000 requests/hour
```

### Option 2: Use GitHub MCP Server (Already Available)
The app already has GitHub MCP server integrated:
```python
# Use github-mcp-server tools
github-mcp-server-get_file_contents(owner, repo, path)
```

### Option 3: Use Proxies with Rotation
```python
import tls_requests

proxies = [
    "http://proxy1.example.com:8080",
    "http://proxy2.example.com:8080",
    # Rotate through multiple IPs
]

response = tls_requests.get(url, proxy=proxies)
```

### Option 4: Manual Scraping via UI
Use the built-in exploit discovery feature in the LUPIN app.

## When to Use TLS-Requests

### ✅ Perfect For:
- Scraping Cloudflare-protected sites
- Bypassing anti-bot systems
- Web scraping commercial sites
- E-commerce data extraction
- Social media scraping
- News/blog content extraction

### ❌ Not Effective For:
- API rate limits (IP-based)
- Authenticated API endpoints
- OAuth-protected resources
- Sites requiring valid session tokens

## Implementation in Our Scraper

### Changes Made:
1. Replaced `requests` with `tls_requests`
2. Used `tls_requests.get()` for all HTTP requests
3. Added browser-like TLS fingerprinting

### Code:
```python
import tls_requests

def download_file(url: str) -> str:
    response = tls_requests.get(url, timeout=30)
    if response.status_code == 200:
        return response.text
    return ""
```

## Current Database Status

```
Total Exploits: 142
Source: L1B3RT4S
- System Prompts: 35
- Anthropic: 15
- OpenAI: 13
- Google: 12
- Others: 67
```

## Recommendations

### For Future Scraping:
1. **Add GitHub Token**: Best solution for GitHub API
2. **Use tls-requests**: For non-API web scraping (blogs, forums, etc.)
3. **Implement Proxy Rotation**: Distribute requests across IPs
4. **Use UI Discovery**: Built-in feature for adding exploits
5. **Schedule Scraping**: Run during off-peak hours to avoid limits

### For Other Sources:
- **Reddit**: tls-requests will work great
- **Twitter/X**: Requires API keys or web scraping with tls-requests
- **HuggingFace**: API keys available, no need for TLS bypass
- **Pastebin**: Perfect use case for tls-requests

## Conclusion

**TLS-Requests** is an excellent tool for bypassing anti-bot systems on commercial websites, but GitHub's API rate limiting is IP/token-based and requires authentication rather than TLS fingerprint manipulation.

For our use case:
- ✅ L1B3RT4S: Successfully scraped (142 exploits)
- ⏸️ CL4R1T4S: Requires GitHub token or manual scraping
- ⏸️ chatgpt_system_prompt: Requires GitHub token or manual scraping

### Next Steps:
1. Add `GITHUB_TOKEN` to `.env` file
2. Update scraper to use token authentication
3. Re-run for remaining 800+ system prompts
4. OR use UI's built-in discovery feature

## Files Created:
- ✅ `scrape_libertas.py` - Working (142 exploits)
- ✅ `scrape_all_sources.py` - Updated with tls-requests
- ✅ `scrape_simple_tls.py` - Test script
- ✅ `TLS_REQUESTS_RESEARCH.md` - This document
