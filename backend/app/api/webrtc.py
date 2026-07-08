from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(prefix="/api/webrtc", tags=["WebRTC Signaling"])

# Active rooms registry mapping room_id to List[WebSocket]
active_rooms: Dict[str, List[WebSocket]] = {}

@router.websocket("/signal/{room_id}")
async def signaling_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    
    if room_id not in active_rooms:
        active_rooms[room_id] = []
        
    active_rooms[room_id].append(websocket)
    print(f"WebRTC: Client joined room {room_id}. Total room connections: {len(active_rooms[room_id])}")

    try:
        while True:
            # Receive signaling data (offer, answer, ICE candidates)
            data = await websocket.receive_text()
            
            # Broadcast message to all other participants in the room
            participants = active_rooms[room_id]
            for client_socket in participants:
                if client_socket != websocket:
                    try:
                        await client_socket.send_text(data)
                    except Exception:
                        # Client disconnected or is in a broken state
                        pass
    except WebSocketDisconnect:
        active_rooms[room_id].remove(websocket)
        if len(active_rooms[room_id]) == 0:
            del active_rooms[room_id]
        print(f"WebRTC: Client disconnected from room {room_id}.")
