from typing import Dict, List
import asyncio

class MessageQueue:
    """Manages user messages for active agent sessions"""

    def __init__(self):
        self._queues: Dict[str, List[str]] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    def create_session(self, session_id: str):
        """Create a new message queue for a session"""
        self._queues[session_id] = []
        self._locks[session_id] = asyncio.Lock()

    async def add_message(self, session_id: str, message: str):
        """Add a user message to the session queue"""
        if session_id not in self._queues:
            return False

        async with self._locks[session_id]:
            self._queues[session_id].append(message)
        return True

    async def get_messages(self, session_id: str) -> List[str]:
        """Get and clear all pending messages for a session"""
        if session_id not in self._queues:
            return []

        async with self._locks[session_id]:
            messages = self._queues[session_id].copy()
            self._queues[session_id].clear()
        return messages

    def remove_session(self, session_id: str):
        """Remove a session's message queue"""
        if session_id in self._queues:
            del self._queues[session_id]
        if session_id in self._locks:
            del self._locks[session_id]

# Global message queue instance
message_queue = MessageQueue()
