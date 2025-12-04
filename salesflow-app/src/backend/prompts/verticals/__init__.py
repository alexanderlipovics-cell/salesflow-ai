"""Vertical Prompts Package"""

from .network_marketing import get_network_marketing_prompt
from .field_sales import get_field_sales_prompt
from .general import get_general_prompt

__all__ = [
    "get_network_marketing_prompt",
    "get_field_sales_prompt",
    "get_general_prompt",
]

