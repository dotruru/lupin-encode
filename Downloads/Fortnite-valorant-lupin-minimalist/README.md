# LUPIN
**Jailbreak Agent and PIE Tracker**

LUPIN is an autonomous security testing platform for evaluating LLM safety. It combines an intelligent jailbreak agent with a comprehensive exploit tracking system to help researchers and developers understand and defend against prompt injection vulnerabilities.

Made with love by the CrakHaus.

---

## What is LUPIN?

LUPIN helps you test the security boundaries of Large Language Models through two main features:

1. **Autonomous Jailbreak Agent** - An AI agent that attempts to bypass LLM safety guardrails using historical attack patterns and iterative refinement
2. **PIE Tracker** - A CVE-style database for cataloging, testing, and monitoring Prompt Injection Exploits (PIEs)

Think of it as a red-team security suite specifically designed for LLM safety testing.

---

## Key Features

### 🤖 Autonomous Jailbreak Agent (Lupin)

**What it does:** Lupin is an AI agent that autonomously attempts to find vulnerabilities in LLM safety systems by crafting and testing jailbreak prompts.

**How it works:**
- Analyzes a database of 15+ proven jailbreak techniques
- Autonomously decides which strategies to try based on historical success patterns
- Drafts and refines prompts using an internal notepad
- Tests prompts against your target LLM in real-time
- Learns from failures and adapts its approach iteratively
- Streams its thought process live so you can watch it work

**Core capabilities:**
- **Database Query** - Searches historical jailbreak patterns
- **Web Search** - Finds new techniques from online sources
- **Jailbreak Testing** - Executes prompts against target models
- **Internal Notepad** - Maintains working drafts and refinements
- **Success Detection** - Automatically identifies when guardrails are bypassed

### ⛓️ Arc Safety Vault (NEW - On-Chain SLA Tracking)

**What it does:** Track LLM safety metrics on-chain with automated rewards and penalties based on test results.

**How it works:**
- Create projects with USDC escrow deposits
- Run automated safety tests against your LLM
- Smart contract applies deterministic logic:
  - Score ≥ threshold → Escrow → Rewards (withdrawable)
  - Score < threshold → Escrow → Bounty Pool (penalties)
  - Critical failures double the penalty
- Fully transparent, auditable, on-chain

**Key benefits:**
- **Financial Incentives** - Reward good safety, penalize poor safety
- **Trustless** - Smart contract enforces rules, no central authority
- **Transparent** - All results recorded on-chain
- **Research Funding** - Bounty pool rewards security researchers

See `QUICKSTART_ARC.md` for setup and `ARC_INTEGRATION_README.md` for full docs.

### 🔒 PIE Tracker (Prompt Injection Exploit Database)

**What it does:** A comprehensive system for cataloging, testing, and monitoring prompt injection vulnerabilities, similar to how CVEs track software vulnerabilities.

**Core features:**
- **Exploit Database** - Store and categorize prompt injection attacks with unique PIE IDs
- **Severity Ratings** - Classify exploits by risk level (Low, Medium, High, Critical)
- **Hugging Face Integration** - Automatically discover new exploits from research datasets
- **Regression Testing** - Run all known exploits against your models to measure safety
- **Safety Metrics** - Track security improvements over time with scoring system
- **Exploit Management** - Add, edit, archive, and organize vulnerabilities
- **Test History** - View historical regression test results and trends

**Why it's useful:**
- Monitor your model's vulnerability to known attacks
- Track security improvements across model versions
- Build a knowledge base of attack patterns
- Identify which exploit categories your model is susceptible to

### 🧪 Manual & Automated Testing

**Manual Testing:**
- Send individual prompts to any LLM
- Test specific attack vectors
- Analyze model responses in real-time

**Automated Regression Testing:**
- Run entire exploit database against target model
- Generate safety scores and metrics
- Track blocked vs. successful exploits
- Monitor execution time and performance

---

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- OpenRouter API key ([get one here](https://openrouter.ai/keys))
- Optional: Hugging Face API key for exploit discovery

### Installation

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd Fortnite-valorant
```

**2. Start the Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend will run on `http://localhost:8000`

**3. Start the Frontend**
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on `http://localhost:5173`

**4. Access LUPIN**
Open your browser to `http://localhost:5173`

---

## How to Use

### 🎯 Running the Jailbreak Agent

1. Navigate to the **LUPIN** tab
2. Configure your target:
   - **Target Model**: Enter any model from OpenRouter (e.g., `anthropic/claude-3-sonnet`)
   - **API Key**: Paste your OpenRouter API key
3. Click **START AGENT**
4. Watch Lupin work in real-time:
   - See which jailbreak techniques it's trying
   - View its thought process as it refines prompts
   - Monitor success/failure of each attempt
5. Agent will iterate until it finds a successful jailbreak or reaches max attempts

**Example workflow:**
```
Lupin queries database → Finds "role-play" technique →
Drafts prompt in notepad → Tests against target model →
Analyzes response → Refines approach → Tries again
```

### 📊 Managing the PIE Database

**Browse Exploits:**
1. Go to the **Exploits Tracker** tab
2. View all cataloged exploits with:
   - PIE ID (e.g., PIE-2024-001)
   - Severity level
   - Exploit type
   - Target models
3. Filter by severity, status, or type
4. Click any exploit to view full details

**Discover New Exploits:**
1. Switch to **Discovery** tab
2. Enter search terms (e.g., "DAN prompt 2024")
3. Add your Hugging Face API key
4. Click **Search**
5. Review results and import relevant exploits to your database

**Add Manual Exploits:**
1. Click **Add New Exploit**
2. Fill in details:
   - Title and description
   - Exploit content (the actual prompt)
   - Type (jailbreak, injection, etc.)
   - Severity level
   - Target models
3. Save to database with auto-generated PIE ID

### 🔬 Running Regression Tests

**Automated Testing:**
1. Go to the **Exploits Tracker** tab
2. Click **Run Regression Test**
3. Configure test:
   - Select target model
   - Enter API key
4. Click **Start Test**
5. View results:
   - Safety score (0-100)
   - Number of blocked exploits
   - Successful exploit count
   - Execution time

**Analyzing Results:**
- **Safety Score**: Higher is better (100 = all exploits blocked)
- **Test History**: View trends over time
- **Per-Exploit Results**: See which specific attacks succeeded/failed
- **Metrics Dashboard**: Track improvements across model versions

### 🧪 Manual Testing

1. Navigate to **Test Your LLM** tab
2. Choose **Manual** mode
3. Enter your prompt
4. Select target model and add API key
5. Click **Send** to test
6. Analyze the model's response for safety guardrails

---

## Understanding the Agent

**How Lupin thinks:**

Lupin is an autonomous AI agent powered by a specialized LLM (GLM-4.5). It has been given:
- **Tools**: 5 functions it can call (query database, search web, test prompts, use notepad)
- **Strategy**: A system prompt teaching it jailbreak methodology
- **Autonomy**: The ability to decide its own actions based on results

**Agent decision flow:**
1. **Research** - Queries database for similar successful jailbreaks
2. **Strategy** - Analyzes what techniques worked before
3. **Draft** - Creates a working prompt using notepad
4. **Test** - Sends prompt to target model
5. **Evaluate** - Checks if response shows guardrail bypass
6. **Adapt** - If failed, refines approach and tries different technique
7. **Iterate** - Repeats until success or max attempts

**Common techniques Lupin uses:**
- Role-playing scenarios
- Hypothetical questions
- Instruction override attempts
- Context manipulation
- Encoding/obfuscation
- Multi-turn conversations

---

## Tech Stack

**Backend:**
- **FastAPI** - High-performance async API framework
- **SQLAlchemy** - Async database ORM
- **SQLite** - Lightweight database for exploits and attempts
- **SSE (Server-Sent Events)** - Real-time agent streaming
- **OpenRouter API** - Access to multiple LLM providers

**Frontend:**
- **React 18 + TypeScript** - Type-safe UI components
- **Vite** - Lightning-fast build tool
- **Minimalistic Design System** - Hand-crafted, accessible interface

---

## Architecture Overview

```
┌─────────────────┐
│   React UI      │ ← User interacts with LUPIN
└────────┬────────┘
         │ HTTP/SSE
┌────────▼────────┐
│   FastAPI       │ ← Handles requests, streams agent thoughts
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│SQLite│  │OpenRouter│ ← Stores exploits, talks to LLMs
└──────┘  └─────────┘
```

**Key components:**
1. **Frontend** - Minimalist UI with real-time SSE streaming
2. **API Layer** - FastAPI endpoints for agent control and data management
3. **Database** - SQLite storing prompts, exploits, attempts, test runs
4. **Agent Runtime** - Autonomous decision-making powered by GLM-4.5
5. **LLM Interface** - OpenRouter integration for testing any model

---

## Security & Responsible Use

### ⚠️ Important Notice

LUPIN is a **defensive security tool** designed for legitimate research and testing purposes only.

**Intended use cases:**
- ✅ Red-team testing your own LLM applications
- ✅ Security research and vulnerability assessment
- ✅ Educational purposes and learning about LLM safety
- ✅ Regression testing during model development
- ✅ Building defenses against prompt injection attacks

**Prohibited use cases:**
- ❌ Attacking systems you don't own or have permission to test
- ❌ Bypassing safety systems for harmful content generation
- ❌ Malicious exploitation of production systems
- ❌ Automated attacks without authorization

By using LUPIN, you agree to use it responsibly and ethically. The developers are not responsible for misuse of this tool.

---

## Roadmap

**Coming soon:**
- [ ] Export exploit database as JSON/CSV
- [ ] GitHub integration for importing public exploit collections
- [ ] Advanced analytics dashboard with success rate trending
- [ ] Multi-model batch testing (test multiple models simultaneously)
- [ ] Custom jailbreak technique builder
- [ ] Integration with Weights & Biases for experiment tracking
- [ ] Agent fine-tuning based on successful patterns
- [ ] Real-time web search for latest techniques

**Community contributions welcome!**

---

## FAQ

**Q: What models can I test?**
A: Any model available on OpenRouter - Claude, GPT-4, Gemini, Llama, and 100+ others.

**Q: Do I need to pay for API access?**
A: Yes, you'll need an OpenRouter API key. Some models offer free tiers.

**Q: Is my data stored anywhere?**
A: All data is stored locally in your SQLite database. Nothing is sent to external servers except API calls to your configured LLM provider.

**Q: How does the safety score work?**
A: Safety Score = (Blocked Exploits / Total Exploits) × 100. Higher scores mean better protection.

**Q: Can I add my own jailbreak techniques?**
A: Yes! Use the "Add New Exploit" feature to manually catalog your own findings.

**Q: Is this tool affiliated with Lupin III?**
A: No, the name is inspired by the gentleman thief character's cleverness and persistence.

---

## Contributing

We welcome contributions! Whether it's:
- Adding new jailbreak patterns to the database
- Improving the agent's reasoning system
- UI/UX enhancements
- Bug fixes and optimizations
- Documentation improvements

Feel free to open issues or submit pull requests.

---

## License

MIT License - See LICENSE file for details.

This software is provided for **educational and research purposes only**. Use responsibly.

---

**Made with love by the CrakHaus** ❤️
