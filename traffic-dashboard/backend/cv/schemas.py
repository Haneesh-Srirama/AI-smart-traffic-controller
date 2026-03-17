from pydantic import BaseModel, Field
from typing import Optional

class TrafficInput(BaseModel):
    """Input for traffic analysis (base64 or image path)."""
    image_data: str = Field(..., description="Base64 encoded image or frame path")

class TrafficOutput(BaseModel):
    """Standardized output from the ML traffic model."""
    vehicle_count: int = Field(..., description="Detected number of vehicles")
    waiting_time: float = Field(..., description="Estimated cumulative wait time in seconds")
    priority_score: float = Field(..., description="Model-computed priority score for the signal phase")
    emergency_vehicle: bool = Field(False, description="Whether an emergency vehicle was detected")

class HealthStatus(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "1.0.0"
