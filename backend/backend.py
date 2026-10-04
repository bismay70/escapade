"""Compatibility import for the old dummy module. The real graph lives in agent.py."""
from backend.agent import TravelAgent

__all__ = ["TravelAgent"]
