from fastapi import APIRouter, HTTPException, BackgroundTasks
from .schemas import TrafficInput, TrafficOutput, HealthStatus
from .ml_service import ml_service
from .explainer import explainer
from .engine import engine

router = APIRouter(prefix="/api/cv", tags=["Computer Vision"])

@router.post("/predict", response_model=TrafficOutput)
async def predict_traffic(input_data: TrafficInput):
    """
    Endpoint for real-world traffic prediction.
    Receives image data and returns model-computed metrics.
    """
    try:
        results = ml_service.predict_traffic(input_data.image_data)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/health", response_model=HealthStatus)
async def health_check():
    """Service health health-check."""
    return HealthStatus()

@router.post("/explain")
async def get_explanation(phase_data: dict):
    """
    Generates AI reasoning for a specific traffic state.
    """
    return {"explanation": explainer.explain_decision(phase_data)}

@router.post("/process-youtube")
async def process_video(url: str, background_tasks: BackgroundTasks):
    """
    Triggers the CV pipeline on a YouTube URL in the background.
    """
    if engine.is_running:
        return {"status": "busy", "message": "Another video is already being processed."}
    
    background_tasks.add_task(engine.process_youtube, url)
    return {"status": "started", "message": f"Processing started for {url}. Check backend/output/ for results."}
