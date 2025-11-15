from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import agent, prompts, exploits, chat, projects
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    await init_db()
    yield
    # Shutdown: cleanup if needed

app = FastAPI(title="Lupin - Jailbreak Agent", version="1.0.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"])
app.include_router(exploits.router, prefix="/api/exploits", tags=["exploits"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])

@app.get("/")
async def root():
    return {"message": "Lupin Agent API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
