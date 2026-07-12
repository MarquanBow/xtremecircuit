from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.database import Base, engine, get_db
import app.models as models
import os
import httpx
from datetime import datetime
from pydantic import BaseModel
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from app.models import Tournament, Placement, Player

# Automatically build the database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="X-Line Rank API",
    description="Backend ranking engine and Challonge sync system for Beyblade X",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {
        "status": "Online",
        "message": "X-Line Rank Backend is firing on all cylinders."
    }

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """
    Checks backend health and validates database connectivity.
    """
    try:
        # Execute a simple test query to verify connection integrity
        db.execute(models.text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": f"error: {str(e)}"}
    
    # ---------------------------------------------------------
# PATH B: THE CHALLONGE SYNC ENGINE
# ---------------------------------------------------------

CHALLONGE_USER = os.getenv("CHALLONGE_USER")
CHALLONGE_API_KEY = os.getenv("CHALLONGE_API_KEY")

class SyncRequest(BaseModel):
    tournament_id: str  # Can be the alphanumeric URL slug or the numeric ID

def calculate_gp_points(rank: int) -> int:
    """The immutable Xtreme Circuit Point Matrix"""
    if rank == 1: return 15
    if rank == 2: return 12
    if rank == 3: return 10
    if rank == 4: return 8
    if 5 <= rank <= 8: return 5
    return 2 # 9th place and below (Participation)

@app.post("/api/sync/challonge")
async def sync_tournament(request: SyncRequest, db: Session = Depends(get_db)):
    if not CHALLONGE_API_KEY:
        raise HTTPException(status_code=500, detail="Challonge API Key is missing in the server environment.")

    # 1. Fetch tournament AND participant data in one single network request
    url = f"https://api.challonge.com/v1/tournaments/{request.tournament_id}.json"
    params = {"include_participants": 1}
    auth = (CHALLONGE_USER, CHALLONGE_API_KEY)

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, auth=auth)

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Tournament not found. Check the ID.")
    elif response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Challonge API rejected the request.")

    data = response.json()["tournament"]

    # 2. Guardrail: Ensure the tournament is actually finished
    if data["state"] != "complete":
        raise HTTPException(status_code=400, detail="Cannot sync. This tournament is not marked as 'Complete'.")

    # 3. Register the Tournament in the database if it doesn't exist
    tourney_id = str(data["id"])
    tourney = db.query(Tournament).filter(Tournament.id == tourney_id).first()
    
    if not tourney:
        # Extract just the date (YYYY-MM-DD) from Challonge's timestamp
        completed_date = datetime.fromisoformat(data["completed_at"].split("T")[0]).date()
        tourney = Tournament(id=tourney_id, name=data["name"], held_on=completed_date)
        db.add(tourney)
        db.commit()
        db.refresh(tourney)

    # 4. Process the Bladers and award points
    participants = data["participants"]
    synced_count = 0
    unmapped_bladers = []

    for p_data in participants:
        p = p_data["participant"]
        # Players might register with a display name or fall back to their username
        c_name = p["name"] if p["name"] else p["username"]
        rank = p["final_rank"]

        if rank is None:
            continue

        # Look up the player in our custom database
        player = db.query(Player).filter(Player.challonge_username == c_name).first()
        
        if not player:
            unmapped_bladers.append(c_name)
            continue

        # Award Points and create Placement record
        points = calculate_gp_points(rank)
        new_placement = Placement(
            tournament_id=tourney.id,
            player_id=player.id,
            final_rank=rank,
            points_awarded=points
        )
        db.add(new_placement)
        
        try:
            db.commit()
            synced_count += 1
        except IntegrityError:
            # The UniqueConstraint blocked us. This player already got their points for this event!
            db.rollback()

    return {
        "status": "Success",
        "tournament_name": tourney.name,
        "total_players_synced": synced_count,
        "unmapped_bladers": unmapped_bladers,
        "message": "Bracket successfully mapped to the Xtreme Circuit standings."
    }