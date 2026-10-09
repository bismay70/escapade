"""Run additional durable workers with python -m backend.worker (shared local DB)."""
import asyncio
from backend.agent import TravelAgent
from backend.storage import Store
from backend.studio import Engine

if __name__ == '__main__':
    asyncio.run(Engine(Store(), TravelAgent()).worker())
