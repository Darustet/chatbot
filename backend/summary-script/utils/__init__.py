"""
Shared utilities for thesis processing across all providers.
Exported functions:
    - generate_thesis_points(abstract_text): AI summarization with fallback
    - manual_summarize(text, num_points=4): Manual sentence extraction
"""

from .summarizer import generate_thesis_points, manual_summarize

__all__ = ['generate_thesis_points', 'manual_summarize']
