# backend/app/jobs/__init__.py
"""
Background Jobs für Sales Flow AI.
"""

from .aggregate_learning import aggregate_learning_data

__all__ = ["aggregate_learning_data"]
