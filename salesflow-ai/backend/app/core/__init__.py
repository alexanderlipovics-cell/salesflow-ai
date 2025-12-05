"""
Core Package für SalesFlow AI.

Enthält:
- AI Integration (Router, Clients, Types, Policies)
- Security (JWT, Password, Encryption, Sanitization)
- Exceptions (Custom Exception Hierarchy)
"""

from .ai_types import (
    AIModelName,
    AITaskType,
    ImportanceLevel,
    CostSensitivity,
    AIRequestConfig,
    PromptDefinition,
    AIRequestResult,
)

from .ai_policies import (
    TASK_MODEL_MAPPING,
    FALLBACK_CASCADE,
    select_model,
    get_fallback_models,
)

from .ai_clients import (
    BaseAIClient,
    OpenAIClient,
    AnthropicClient,
    AIClientManager,
    estimate_cost,
    TOKEN_PRICES,
)

from .ai_router import (
    AIRouter,
    create_ai_router,
)

from .ai_metrics import (
    AIMetricsCollector,
    AIRequestMetric,
    AggregatedMetrics,
    MetricEventType,
    get_metrics,
    reset_metrics,
)

from .exceptions import (
    SalesFlowException,
    NotFoundError,
    PermissionError as SalesFlowPermissionError,
    ValidationError as SalesFlowValidationError,
    ConflictError,
    InvalidStateError,
    RateLimitExceededError,
    DatabaseError,
)

__all__ = [
    # AI Types
    "AIModelName",
    "AITaskType",
    "ImportanceLevel",
    "CostSensitivity",
    "AIRequestConfig",
    "PromptDefinition",
    "AIRequestResult",
    
    # AI Policies
    "TASK_MODEL_MAPPING",
    "FALLBACK_CASCADE",
    "select_model",
    "get_fallback_models",
    
    # AI Clients
    "BaseAIClient",
    "OpenAIClient",
    "AnthropicClient",
    "AIClientManager",
    "estimate_cost",
    "TOKEN_PRICES",
    
    # AI Router
    "AIRouter",
    "create_ai_router",
    
    # AI Metrics
    "AIMetricsCollector",
    "AIRequestMetric",
    "AggregatedMetrics",
    "MetricEventType",
    "get_metrics",
    "reset_metrics",
    
    # Exceptions
    "SalesFlowException",
    "NotFoundError",
    "SalesFlowPermissionError",
    "SalesFlowValidationError",
    "ConflictError",
    "InvalidStateError",
    "RateLimitExceededError",
    "DatabaseError",
]
