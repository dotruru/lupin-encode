# Multi-Source Scraping Summary

## Sources Identified

### ✅ 1. L1B3RT4S (Jailbreak Prompts) - **COMPLETED**
- **URL**: https://github.com/elder-plinius/L1B3RT4S
- **Status**: ✅ **142 exploits added**
- **Type**: Jailbreak techniques
- **Coverage**: 35+ AI models/companies
  - Anthropic Claude
  - OpenAI GPT
  - Google Gemini  
  - Meta Llama
  - DeepSeek, Mistral, Nvidia, and more

### 🔄 2. CL4R1T4S (System Prompts) - **READY TO SCRAPE**
- **URL**: https://github.com/elder-plinius/CL4R1T4S
- **Type**: Leaked system prompts
- **Structure**: Organized by company folders (ANTHROPIC, OPENAI, GOOGLE, etc.)
- **Files**: 54+ markdown/text files with system prompts
- **Companies covered**:
  - Anthropic (Claude)
  - OpenAI (ChatGPT, GPT-4)
  - Google (Gemini)
  - Cursor, Bolt, Devin
  - Replit, Windsurf, Vercel v0
  - Perplexity, Mistral, Meta
  - And 15+ more

### 🔄 3. chatgpt_system_prompt - **READY TO SCRAPE**
- **URL**: https://github.com/LouisShark/chatgpt_system_prompt  
- **Type**: Community-collected ChatGPT system prompts
- **Files**: 1000+ markdown files
- **Coverage**: Various GPT configurations and custom instructions

### 📋 4. Twitter Thread - **MANUAL EXTRACTION**
- **URL**: https://x.com/elder_plinius/status/1983670493975871588
- **Type**: Twitter thread with jailbreak techniques
- **Status**: Requires manual extraction (Twitter API not accessible)
- **Action**: User should manually copy prompts and add via UI

## Current Database Status

```
Total Exploits: 142
Source: L1B3RT4S
Type: Jailbreak techniques
```

### Breakdown by Target:
1. System Prompts - 35 exploits
2. Anthropic (Claude) - 15 exploits
3. OpenAI (ChatGPT) - 13 exploits
4. Google (Gemini) - 12 exploits
5. Multion - 11 exploits
6. Alibaba (Qwen) - 8 exploits
7. Grok - 6 exploits
8. XAI - 5 exploits
9. DeepSeek - 5 exploits
10. Meta (Llama) - 4 exploits
11. Others - 28 exploits

## Scraper Implementation

### Created Files:
1. **scrape_libertas.py** - L1B3RT4S scraper (✅ Complete)
2. **scrape_all_sources.py** - Multi-source scraper (⚠️ Needs GitHub auth)

### Issues Encountered:
- **GitHub API Rate Limiting**: Unauthenticated requests limited to 60/hour
- **Solution**: Use GitHub MCP server tools or add GitHub token

## How to Complete Scraping

### Option 1: Use UI Discovery Feature
The app has a built-in exploit discovery feature:
1. Go to **EXPLOIT TRACKER** tab
2. Click **SEARCH** view
3. Use search queries like:
   - "Claude system prompt"
   - "GPT jailbreak"
   - "Gemini bypass"
4. Click "Discover & Auto-Add"

### Option 2: Add GitHub Token
Add to `.env`:
```bash
GITHUB_TOKEN=your_token_here
```

### Option 3: Manual Addition
1. Visit the GitHub repos
2. Copy interesting prompts
3. Add via UI in **EXPLOIT TRACKER**
4. Click "+ ADD EXPLOIT"

## Scraper Capabilities

The scrapers can:
- ✅ Download markdown/text files
- ✅ Parse sections and code blocks
- ✅ Extract titles and descriptions
- ✅ Generate unique PIE IDs
- ✅ Classify as jailbreak vs system_prompt
- ✅ Avoid duplicates
- ✅ Batch commit to database
- ✅ Support multiple sources

## Recommendations

### Priority Actions:
1. **High**: Add GitHub token to bypass rate limits
2. **Medium**: Manually extract Twitter thread content
3. **Low**: Run full CL4R1T4S scrape (500+ system prompts)

### Future Enhancements:
- Add Reddit scraping (r/ChatGPTJailbreak)
- Add HuggingFace dataset integration
- Add automated Twitter/X scraping
- Add RSS feed monitoring
- Add webhook for new repo commits

## Files in Backend:
```
backend/
├── scrape_libertas.py          ✅ Working
├── scrape_all_sources.py       ⚠️  Needs auth
└── L1B3RT4S_SCRAPE_SUMMARY.md  ✅ Documentation
```

## Next Steps:
1. Add GitHub token to environment
2. Re-run `python scrape_all_sources.py`
3. Manually add Twitter thread prompts
4. Explore chatgpt_system_prompt repo
5. Use UI discovery for ongoing collection
