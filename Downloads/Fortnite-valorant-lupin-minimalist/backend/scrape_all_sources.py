"""
Comprehensive scraper for multiple jailbreak/system prompt sources
Using GitHub token for authenticated requests (5000 req/hour)
"""
import asyncio
import requests
import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, desc
from app.models import Exploit, Base
from datetime import datetime
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')

# Set up headers with authentication
HEADERS = {
    'Authorization': f'token {GITHUB_TOKEN}' if GITHUB_TOKEN else None,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'LUPIN-Exploit-Scraper'
}
if not HEADERS['Authorization']:
    del HEADERS['Authorization']

# ===== L1B3RT4S (Already done, but keeping for completeness) =====
LIBERTAS_FILES = [
    "ALIBABA.mkd", "AMAZON.mkd", "ANTHROPIC.mkd", "APPLE.mkd", "BRAVE.mkd",
    "CHATGPT.mkd", "COHERE.mkd", "CURSOR.mkd", "DEEPSEEK.mkd", "FETCHAI.mkd",
    "GOOGLE.mkd", "GRAYSWAN.mkd", "GROK-MEGA.mkd", "HUME.mkd", "INCEPTION.mkd",
    "INFLECTION.mkd", "LIQUIDAI.mkd", "META.mkd", "MICROSOFT.mkd", "MIDJOURNEY.mkd",
    "MISTRAL.mkd", "MOONSHOT.mkd", "MULTION.mkd", "NOUS.mkd", "NVIDIA.mkd",
    "OPENAI.mkd", "PERPLEXITY.mkd", "REFLECTION.mkd", "REKA.mkd",
    "SYSTEMPROMPTS.mkd", "WINDSURF.mkd", "XAI.mkd", "ZAI.mkd", "ZYPHRA.mkd",
    "-MISCELLANEOUS-.mkd"
]

# ===== CL4R1T4S (System Prompts) =====
CLARITAS_BASE = "https://raw.githubusercontent.com/elder-plinius/CL4R1T4S/main/"

def get_github_files_recursive(owner: str, repo: str, path: str = "") -> list:
    """Get all files from a GitHub repo recursively using authenticated requests"""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        # Check rate limit
        remaining = response.headers.get('X-RateLimit-Remaining')
        limit = response.headers.get('X-RateLimit-Limit')
        if remaining:
            print(f"Rate limit: {remaining}/{limit} remaining")
        
        if response.status_code != 200:
            print(f"Status {response.status_code} for {path}")
            if response.status_code == 403:
                print("Rate limit exceeded. Waiting...")
                time.sleep(60)
            return []
        
        items = response.json()
        files = []
        
        for item in items:
            if item['type'] == 'file' and (item['name'].endswith('.md') or item['name'].endswith('.txt')):
                files.append({
                    'path': item['path'],
                    'name': item['name'],
                    'download_url': item['download_url']
                })
            elif item['type'] == 'dir':
                # Recursively get files from subdirectories
                time.sleep(0.2)  # Be polite
                subfiles = get_github_files_recursive(owner, repo, item['path'])
                files.extend(subfiles)
        
        return files
    except Exception as e:
        print(f"Error getting files from {path}: {e}")
        return []

def download_file(url: str) -> str:
    """Download file content"""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.text
        return ""
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return ""

def parse_system_prompts(content: str, filename: str, source: str) -> list:
    """Parse system prompts from markdown/text files"""
    exploits = []
    
    # Extract company/model name from filename
    company = filename.replace('.md', '').replace('.txt', '').replace('_', ' ').strip()
    
    # Split by headers or clear separators
    sections = re.split(r'\n#{1,3}\s+', content)
    
    for section in sections:
        if len(section.strip()) < 100:
            continue
        
        # Extract title
        lines = section.split('\n')
        title = lines[0].strip() if lines else company
        
        # Clean title
        title = re.sub(r'^[\d\.\-\*\s]+', '', title)
        if not title or len(title) < 5:
            continue
        
        # Get the content
        content_text = '\n'.join(lines[1:]).strip() if len(lines) > 1 else section.strip()
        
        # Look for code blocks (system prompts are often in code blocks)
        code_blocks = re.findall(r'```(?:xml|python|bash|text|markdown)?\n?(.*?)```', content_text, re.DOTALL)
        
        if code_blocks:
            prompt_content = "\n\n---\n\n".join(code_blocks).strip()
        else:
            # Take first substantial paragraph
            paragraphs = [p.strip() for p in content_text.split('\n\n') if len(p.strip()) > 50]
            prompt_content = paragraphs[0][:2000] if paragraphs else content_text[:2000]
        
        # Build description
        desc_text = content_text[:500] if not code_blocks else "System prompt for " + company
        
        if prompt_content and len(prompt_content) > 50:
            exploits.append({
                'title': title[:200],
                'description': desc_text[:500],
                'exploit_content': prompt_content[:2000],
                'target_model': company,
                'source': source,
                'source_type': 'github'
            })
    
    return exploits

def parse_chatgpt_system_prompt_repo(content: str, filename: str) -> list:
    """Parse ChatGPT system prompt repository format"""
    exploits = []
    
    # This repo has a specific format with system prompts
    # Look for sections separated by headers or dividers
    
    # Split by markdown headers
    sections = re.split(r'\n#+\s+', content)
    
    for section in sections:
        if len(section.strip()) < 100:
            continue
        
        lines = section.split('\n')
        title = lines[0].strip()[:200] if lines else filename
        
        # Clean title
        title = re.sub(r'^[\d\.\-\*\s]+', '', title)
        
        # Extract prompt content
        content_text = '\n'.join(lines[1:]).strip()
        
        # Look for actual prompts in various formats
        code_blocks = re.findall(r'```(?:xml|python|bash|text|markdown|json)?\n?(.*?)```', content_text, re.DOTALL)
        
        if code_blocks:
            prompt_content = "\n\n---\n\n".join(code_blocks).strip()
        else:
            # Try to find quoted sections or specific patterns
            quoted = re.findall(r'>\s*(.+?)(?:\n\n|\Z)', content_text, re.DOTALL)
            if quoted:
                prompt_content = "\n\n".join(quoted).strip()
            else:
                prompt_content = content_text[:2000]
        
        if prompt_content and len(prompt_content) > 50:
            exploits.append({
                'title': title,
                'description': f"System prompt from ChatGPT prompt repository",
                'exploit_content': prompt_content[:2000],
                'target_model': 'ChatGPT',
                'source': 'chatgpt_system_prompt',
                'source_type': 'github'
            })
    
    return exploits

async def generate_cve_id(session: AsyncSession) -> str:
    """Generate next PIE ID"""
    year = datetime.utcnow().year
    
    result = await session.execute(
        select(Exploit.cve_id)
        .where(Exploit.cve_id.like(f"PIE-{year}-%"))
        .order_by(desc(Exploit.cve_id))
        .limit(1)
    )
    latest = result.scalar()
    
    if latest:
        try:
            num = int(latest.split('-')[-1])
            next_num = num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return f"PIE-{year}-{next_num:03d}"

async def add_exploits_to_db(exploits: list, session: AsyncSession):
    """Add exploits to database"""
    added = 0
    skipped = 0
    
    for exploit_data in exploits:
        # Check if similar exploit already exists
        result = await session.execute(
            select(Exploit).where(
                Exploit.title == exploit_data['title'],
                Exploit.source == exploit_data['source']
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            skipped += 1
            continue
        
        # Generate CVE ID
        cve_id = await generate_cve_id(session)
        
        # Determine exploit type
        exploit_type = 'system_prompt' if 'system' in exploit_data['source'].lower() or 'claritas' in exploit_data['source'].lower() else 'jailbreak'
        
        # Create exploit
        exploit = Exploit(
            cve_id=cve_id,
            title=exploit_data['title'],
            description=exploit_data['description'],
            exploit_content=exploit_data['exploit_content'],
            exploit_type=exploit_type,
            severity='medium',
            source=exploit_data['source'],
            source_type=exploit_data['source_type'],
            target_models=[exploit_data['target_model']],
            mitigation='',
            status='active',
            discovered_date=datetime.utcnow()
        )
        
        session.add(exploit)
        added += 1
        
        # Commit in batches
        if added % 10 == 0:
            await session.commit()
            print(f"Added {added} exploits so far...")
    
    await session.commit()
    return added, skipped

async def scrape_claritas():
    """Scrape CL4R1T4S repository (system prompts)"""
    print("\n=== Scraping CL4R1T4S (System Prompts) ===")
    
    files = get_github_files_recursive("elder-plinius", "CL4R1T4S", "")
    print(f"Found {len(files)} files in CL4R1T4S")
    
    exploits = []
    
    for file_info in files:
        print(f"Processing {file_info['name']}...")
        content = download_file(file_info['download_url'])
        if content:
            parsed = parse_system_prompts(content, file_info['name'], 'CL4R1T4S')
            print(f"  Found {len(parsed)} system prompts")
            exploits.extend(parsed)
        time.sleep(0.5)
    
    return exploits

async def scrape_chatgpt_system_prompt():
    """Scrape LouisShark/chatgpt_system_prompt repository"""
    print("\n=== Scraping chatgpt_system_prompt ===")
    
    files = get_github_files_recursive("LouisShark", "chatgpt_system_prompt", "")
    print(f"Found {len(files)} files in chatgpt_system_prompt")
    
    exploits = []
    
    for file_info in files[:50]:  # Limit to first 50 files to avoid overwhelming
        print(f"Processing {file_info['name']}...")
        content = download_file(file_info['download_url'])
        if content:
            parsed = parse_chatgpt_system_prompt_repo(content, file_info['name'])
            print(f"  Found {len(parsed)} prompts")
            exploits.extend(parsed)
        time.sleep(0.5)
    
    return exploits

def parse_twitter_thread_manual():
    """
    For Twitter thread, we need to manually extract since we can't scrape Twitter directly
    This is a placeholder - you would need to manually copy the thread content
    """
    print("\n=== Twitter Thread ===")
    print("NOTE: Twitter scraping requires manual extraction.")
    print("Please visit: https://x.com/elder_plinius/status/1983670493975871588")
    print("And manually add any jailbreak prompts from the thread via the UI.")
    return []

async def main():
    """Main scraping function"""
    print("╔══════════════════════════════════════════════════════════╗")
    print("║        Multi-Source Jailbreak Scraper                   ║")
    print("║        Using GitHub Token Authentication                ║")
    print("╚══════════════════════════════════════════════════════════╝")
    
    if GITHUB_TOKEN:
        print(f"✓ GitHub token found (Rate limit: 5000 req/hour)")
    else:
        print("⚠ No GitHub token - using unauthenticated (60 req/hour)")
    print()
    
    # Setup database
    engine = create_async_engine('sqlite+aiosqlite:///lupin.db', echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Scrape all sources
    all_exploits = []
    
    # 1. CL4R1T4S (System Prompts)
    claritas_exploits = await scrape_claritas()
    all_exploits.extend(claritas_exploits)
    
    # 2. ChatGPT System Prompt Repo
    chatgpt_exploits = await scrape_chatgpt_system_prompt()
    all_exploits.extend(chatgpt_exploits)
    
    # 3. Twitter (manual note)
    parse_twitter_thread_manual()
    
    print(f"\n{'='*60}")
    print(f"Total exploits parsed: {len(all_exploits)}")
    print(f"{'='*60}")
    
    # Add to database
    async with async_session() as session:
        added, skipped = await add_exploits_to_db(all_exploits, session)
        print(f"\n✓ Added {added} new exploits to database")
        print(f"✓ Skipped {skipped} duplicates")
    
    await engine.dispose()
    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║                  Scraping Complete!                      ║")
    print("╚══════════════════════════════════════════════════════════╝")

if __name__ == "__main__":
    asyncio.run(main())
