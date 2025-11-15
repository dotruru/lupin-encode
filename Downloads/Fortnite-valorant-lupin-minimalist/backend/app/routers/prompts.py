from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.database import get_db
from app.models import Prompt, Attempt
from app.schemas import PromptResponse

router = APIRouter()

@router.get("/", response_model=List[PromptResponse])
async def get_prompts(
    skip: int = 0,
    limit: int = 20,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get list of prompts with optional filtering"""
    query = select(Prompt)

    if category:
        query = query.where(Prompt.category == category)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    prompts = result.scalars().all()

    return prompts

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Get database statistics"""
    # Count prompts
    prompt_count_query = select(func.count(Prompt.id))
    prompt_result = await db.execute(prompt_count_query)
    prompt_count = prompt_result.scalar()

    # Count attempts
    attempt_count_query = select(func.count(Attempt.id))
    attempt_result = await db.execute(attempt_count_query)
    attempt_count = attempt_result.scalar()

    # Count by category
    category_query = select(Prompt.category, func.count(Prompt.id)).group_by(Prompt.category)
    category_result = await db.execute(category_query)
    categories = {row[0]: row[1] for row in category_result}

    return {
        "total_prompts": prompt_count,
        "total_attempts": attempt_count,
        "categories": categories
    }

@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get list of all categories"""
    query = select(Prompt.category).distinct()
    result = await db.execute(query)
    categories = [row[0] for row in result]

    return {"categories": categories}
