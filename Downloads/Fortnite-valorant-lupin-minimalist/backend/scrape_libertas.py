"""
Scraper for L1B3RT4S GitHub repository
https://github.com/elder-plinius/L1B3RT4S
"""
import asyncio
import requests
import re
import time
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Exploit, Base
from datetime import datetime

# Files to scrape (skipping very large token files and system files)
FILES_TO_SCRAPE = [
    "ALIBABA.mkd", "AMAZON.mkd", "ANTHROPIC.mkd", "APPLE.mkd", "BRAVE.mkd",
    "CHATGPT.mkd", "COHERE.mkd", "CURSOR.mkd", "DEEPSEEK.mkd", "FETCHAI.mkd",
    "GOOGLE.mkd", "GRAYSWAN.mkd", "GROK-MEGA.mkd", "HUME.mkd", "INCEPTION.mkd",
    "INFLECTION.mkd", "LIQUIDAI.mkd", "META.mkd", "MICROSOFT.mkd", "MIDJOURNEY.mkd",
    "MISTRAL.mkd", "MOONSHOT.mkd", "MULTION.mkd", "NOUS.mkd", "NVIDIA.mkd",
    "OPENAI.mkd", "PERPLEXITY.mkd", "REFLECTION.mkd", "REKA.mkd",
    "SYSTEMPROMPTS.mkd", "WINDSURF.mkd", "XAI.mkd", "ZAI.mkd", "ZYPHRA.mkd",
    "-MISCELLANEOUS-.mkd", "#MOTHERLOAD.txt"
]

BASE_URL = "https://raw.githubusercontent.com/elder-plinius/L1B3RT4S/main/"

def download_file(filename: str) -> str:
    """Download a file from the repository"""
    url = BASE_URL + filename
    print(f"Downloading {filename}...")
    try:
        response = requests.get(url, timeout=30.0)
        if response.status_code == 200:
            return response.text
        else:
            print(f"Failed to download {filename}: {response.status_code}")
            return ""
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        return ""

def parse_jailbreaks(content: str, filename: str) -> list:
    """Parse jailbreak prompts from markdown content"""
    exploits = []
    
    # Extract company/model name from filename
    company = filename.replace(".mkd", "").replace(".txt", "").replace("-", " ").strip()
    target_model = f"{company} AI"
    
    # Split by headers or sections
    # Look for markdown headers or numbered sections
    sections = re.split(r'\n(?=#{1,3}\s+|\d+\.\s+[A-Z])', content)
    
    for section in sections:
        if len(section.strip()) < 50:
            continue
            
        # Extract title (first line or header)
        title_match = re.match(r'^(?:#{1,3}\s+)?(.+?)(?:\n|$)', section)
        if not title_match:
            continue
        
        title = title_match.group(1).strip()
        
        # Skip if title is too generic
        if title.lower() in ['introduction', 'overview', 'description', 'example', 'note']:
            continue
        
        # Clean title
        title = re.sub(r'^\d+\.\s*', '', title)
        title = re.sub(r'^[#*\s]+', '', title)
        
        if not title or len(title) < 3:
            continue
        
        # Extract the actual exploit content (look for code blocks or prompts)
        exploit_content = ""
        description = ""
        
        # Look for code blocks
        code_blocks = re.findall(r'```(?:xml|python|bash|text|markdown)?\n?(.*?)```', section, re.DOTALL)
        if code_blocks:
            exploit_content = "\n\n---\n\n".join(code_blocks).strip()
        
        # If no code blocks, look for quoted sections
        if not exploit_content:
            quoted = re.findall(r'>\s*(.+?)(?:\n\n|\Z)', section, re.DOTALL)
            if quoted:
                exploit_content = "\n\n".join(quoted).strip()
        
        # If still no exploit content, use the main body after title
        if not exploit_content:
            body = section[title_match.end():].strip()
            # Take first substantial paragraph as exploit
            paragraphs = [p.strip() for p in body.split('\n\n') if len(p.strip()) > 50]
            if paragraphs:
                exploit_content = paragraphs[0][:1000]
        
        # Build description (different from exploit content)
        body_text = section[title_match.end():].strip()
        # Remove code blocks from description
        desc_text = re.sub(r'```(?:xml|python|bash|text|markdown)?.*?```', '', body_text, flags=re.DOTALL)
        # Remove quoted sections
        desc_text = re.sub(r'>\s*.+?(?:\n\n|\Z)', '', desc_text, flags=re.DOTALL)
        # Take first 2-3 sentences
        sentences = [s.strip() for s in desc_text.split('.') if len(s.strip()) > 20]
        description = '. '.join(sentences[:2]) + '.' if sentences else f"Jailbreak technique for {company}"
        
        # Only add if we have actual exploit content
        if exploit_content and len(exploit_content) > 30:
            exploits.append({
                'title': title[:200],
                'description': description[:500],
                'exploit_content': exploit_content[:2000],
                'target_model': target_model,
                'source': 'L1B3RT4S',
                'source_type': 'github',
                'company': company
            })
    
    return exploits

async def generate_cve_id(session: AsyncSession) -> str:
    """Generate next PIE ID"""
    from sqlalchemy import select, func, desc
    
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
    from sqlalchemy import select
    
    added = 0
    skipped = 0
    
    for exploit_data in exploits:
        # Check if similar exploit already exists
        result = await session.execute(
            select(Exploit).where(
                Exploit.title == exploit_data['title'],
                Exploit.source == 'L1B3RT4S'
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            skipped += 1
            continue
        
        # Generate CVE ID
        cve_id = await generate_cve_id(session)
        
        # Determine severity based on content
        severity = 'medium'
        if any(word in exploit_data['title'].lower() for word in ['critical', 'severe', 'dangerous']):
            severity = 'high'
        elif any(word in exploit_data['title'].lower() for word in ['simple', 'basic', 'minor']):
            severity = 'low'
        
        # Create exploit
        exploit = Exploit(
            cve_id=cve_id,
            title=exploit_data['title'],
            description=exploit_data['description'],
            exploit_content=exploit_data['exploit_content'],
            exploit_type='jailbreak',
            severity=severity,
            source='L1B3RT4S',
            source_type='github',
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

async def main():
    """Main scraping function"""
    print("Starting L1B3RT4S scraper...")
    print(f"Will scrape {len(FILES_TO_SCRAPE)} files")
    
    # Setup database
    engine = create_async_engine('sqlite+aiosqlite:///lupin.db', echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Download files
    all_exploits = []
    
    for filename in FILES_TO_SCRAPE:
        content = download_file(filename)
        if content:
            exploits = parse_jailbreaks(content, filename)
            print(f"  Found {len(exploits)} exploits in {filename}")
            all_exploits.extend(exploits)
        time.sleep(0.5)  # Be nice to GitHub
    
    print(f"\nTotal exploits parsed: {len(all_exploits)}")
    
    # Add to database
    async with async_session() as session:
        added, skipped = await add_exploits_to_db(all_exploits, session)
        print(f"\n✓ Added {added} new exploits to database")
        print(f"✓ Skipped {skipped} duplicates")
    
    await engine.dispose()
    print("\nScraping complete!")

if __name__ == "__main__":
    asyncio.run(main())
