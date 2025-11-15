from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from app.database import get_db
from app.schemas import AgentStartRequest
from app.services.agent import LupinAgent
from app.services.scraper import initialize_database, scrape_reddit_jailbreak
from app.services.message_queue import message_queue

router = APIRouter()

class UserMessage(BaseModel):
    session_id: str
    message: str

OPENROUTER_KEY = "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"

@router.get("/start")
async def start_agent(
    target_model: str,
    api_key: str,
    db: AsyncSession = Depends(get_db)
):
    """Start the Lupin agent with SSE streaming"""
    try:
        agent = LupinAgent(
            db=db,
            target_model=target_model,
            api_key=api_key,
            openrouter_key=OPENROUTER_KEY
        )

        return EventSourceResponse(agent.run())

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-message")
async def send_user_message(user_message: UserMessage):
    """Send a message to guide the running agent"""
    success = await message_queue.add_message(user_message.session_id, user_message.message)
    if success:
        return {"success": True, "message": "Message sent to agent"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@router.post("/initialize-db")
async def initialize_prompts_db(db: AsyncSession = Depends(get_db)):
    """Initialize database with scraped prompts"""
    try:
        result = await initialize_database(db)
        return {
            "success": True,
            "message": "Database initialized",
            "counts": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scrape-reddit")
async def scrape_reddit(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Scrape prompts from r/ChatGPTJailbreak"""
    try:
        count = await scrape_reddit_jailbreak(db, limit=limit)
        return {
            "success": True,
            "message": f"Scraped {count} prompts from Reddit",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
