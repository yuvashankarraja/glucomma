from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.db_models import User, Patient, AIChatHistory, Prediction
from app.schemas.schemas import AIChatQuery, AIChatResponse
from app.services.chatbot_service import query_ai_chatbot

router = APIRouter(prefix="/api/chatbot", tags=["AI Copilot Chatbot"])

@router.post("/query", response_model=AIChatResponse)
def chatbot_query(
    query_data: AIChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="The AI Assistant is currently configured for Patient access.")

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # 1. Fetch recent chat history to pass to LLM context
    history_records = db.query(AIChatHistory).filter(
        AIChatHistory.patient_id == patient.id
    ).order_by(AIChatHistory.timestamp.asc()).all()

    formatted_history = []
    for chat in history_records:
        formatted_history.append({
            "role": chat.role,
            "content": chat.content
        })

    # 2. Fetch specific prediction details if reference prediction_id is passed
    prediction_info = None
    if query_data.prediction_id:
        prediction = db.query(Prediction).filter(Prediction.id == query_data.prediction_id).first()
        if prediction:
            prediction_info = {
                "disease_name": prediction.disease_name,
                "probability": float(prediction.probability),
                "confidence_score": float(prediction.confidence_score),
                "risk_level": prediction.risk_level
            }

    # 3. Query LLM chatbot / Fallback engine
    try:
        assistant_reply = query_ai_chatbot(
            user_message=query_data.message,
            chat_history=formatted_history,
            prediction_info=prediction_info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chatbot pipeline failed: {str(e)}")

    # 4. Save interactions to database
    user_log = AIChatHistory(
        patient_id=patient.id,
        role="user",
        content=query_data.message
    )
    assistant_log = AIChatHistory(
        patient_id=patient.id,
        role="assistant",
        content=assistant_reply
    )
    
    db.add(user_log)
    db.add(assistant_log)
    db.commit()
    db.refresh(assistant_log)

    return AIChatResponse(
        response=assistant_reply,
        timestamp=assistant_log.timestamp
    )

@router.get("/history")
def get_chatbot_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        return []
        
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []

    return db.query(AIChatHistory).filter(
        AIChatHistory.patient_id == patient.id
    ).order_by(AIChatHistory.timestamp.asc()).all()
