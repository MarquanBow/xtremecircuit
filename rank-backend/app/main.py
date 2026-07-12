from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import Base, engine, get_db
import app.models as models
import os
import httpx
from datetime import datetime
from pydantic import BaseModel
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from app.models import User, League, Team, Placement, Player
from typing import Optional
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer 

# Automatically build the database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="X-Line Rank API",
    description="Backend ranking engine and Challonge sync system for Beyblade X",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (perfect for local development)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

# --- SECURITY CONFIGURATION ---
SECRET_KEY = "xtreme-circuit-super-secret-key" # In production, this goes in a .env file!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # Tokens last for 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password[:72])

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- THE BOUNCER (AUTH DEPENDENCY) ---

# This tells FastAPI where the login route is, so it knows how to handle tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Verifies the JWT token and ensures the user has Admin privileges."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Decode the token to see who it belongs to
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    # 2. Find the user in the database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    # 3. Verify Admin Status
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
        
    return user

# --- PYDANTIC SCHEMAS ---
class UserAuth(BaseModel):
    email: str
    password: str = Field(..., max_length=72)

class LeagueCreate(BaseModel):
    name: str
    description: str = None

class TeamCreate(BaseModel):
    name: str
    logo_url: str = None
    league_id: int

class PlayerCreate(BaseModel):
    username: str
    challonge_username: str
    team_id: int = None
    league_id: int

class SyncRequest(BaseModel):
    tournament_id: str
    league_id: int
# --- AUTH ROUTES ---

@app.post("/api/signup")
def create_user(user: UserAuth, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the very first user in the database
    is_first_user = db.query(User).count() == 0
    
    # Create the new user
    new_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        is_admin=is_first_user # The very first person to sign up automatically gets Admin rights!
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully", "is_admin": new_user.is_admin}

@app.post("/api/login")
def login(user: UserAuth, db: Session = Depends(get_db)):
    # Find the user
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate their digital badge (JWT Token)
    access_token = create_access_token(
        data={"sub": db_user.email, "id": db_user.id, "is_admin": db_user.is_admin}
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "is_admin": db_user.is_admin,
        "user_id": db_user.id
    }

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

class TeamCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None

class PlayerCreate(BaseModel):
    username: str
    challonge_username: str
    team_id: Optional[int] = None   
def calculate_gp_points(rank: int) -> int:
    """The immutable Xtreme Circuit Point Matrix"""
    if rank == 1: return 15
    if rank == 2: return 12
    if rank == 3: return 10
    if rank == 4: return 8
    if 5 <= rank <= 8: return 5
    return 2 # 9th place and below (Participation)

@app.post("/api/sync/challonge")
def sync_challonge_tournament(
    request: SyncRequest, 
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    headers = {"Authorization-Type": "v1", "Authorization": API_KEY}
    
    url = f"https://api.challonge.com/v2/tournaments/{request.tournament_id}.json"
    tourney_res = requests.get(url, headers=headers)
    if tourney_res.status_code != 200:
         raise HTTPException(status_code=400, detail="Failed to fetch tournament from Challonge")
    tourney_data = tourney_res.json()
    
    parts_url = f"https://api.challonge.com/v2/tournaments/{request.tournament_id}/participants.json"
    parts_res = requests.get(parts_url, headers=headers)
    if parts_res.status_code != 200:
         raise HTTPException(status_code=400, detail="Failed to fetch participants")
    participants_data = parts_res.json().get("data", [])

    players_synced = 0
    
    for p in participants_data:
        attrs = p.get("attributes", {})
        challonge_handle = attrs.get("challonge_username") or attrs.get("name")
        final_rank = attrs.get("final_rank")
        
        if not challonge_handle or not final_rank:
            continue
            
        # Match player ONLY within this specific league
        player = db.query(Player).filter(
            Player.challonge_username == challonge_handle,
            Player.league_id == request.league_id
        ).first()
        
        if not player:
            # Auto-create new player and lock them to the active league
            player = Player(
                username=challonge_handle, 
                challonge_username=challonge_handle,
                league_id=request.league_id
            )
            db.add(player)
            db.commit()
            db.refresh(player)

        points = 0
        if final_rank == 1: points = 10
        elif final_rank == 2: points = 7
        elif final_rank == 3: points = 5
        elif final_rank == 4: points = 3
        elif final_rank <= 8: points = 1

        existing_placement = db.query(Placement).filter(
            Placement.player_id == player.id,
            Placement.tournament_id == request.tournament_id
        ).first()

        if not existing_placement:
            new_placement = Placement(
                player_id=player.id,
                tournament_id=request.tournament_id,
                rank=final_rank,
                points_awarded=points
            )
            db.add(new_placement)
            players_synced += 1

    db.commit()

    return {
        "message": "Tournament synced successfully",
        "tournament_name": tourney_data.get("data", {}).get("attributes", {}).get("name"),
        "total_players_synced": players_synced
    }

@app.get("/api/teams")
def get_teams(league_id: int, db: Session = Depends(get_db)):
    """Fetches only the teams belonging to the requested league."""
    return db.query(Team).filter(Team.league_id == league_id).all()

@app.post("/api/teams")
def create_team(
    team: TeamCreate, 
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    new_team = Team(name=team.name, logo_url=team.logo_url, league_id=team.league_id)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return {"message": "Team created", "team": new_team}

@app.post("/api/players")
def create_player(
    player: PlayerCreate, 
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    new_player = Player(
        username=player.username,
        challonge_username=player.challonge_username,
        team_id=player.team_id,
        league_id=player.league_id
    )
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return {"message": "Player created", "player": new_player}


# ---------------------------------------------------------
# LEAGUE MANAGEMENT ROUTES
# ---------------------------------------------------------

@app.post("/api/leagues")
def create_league(
    league: LeagueCreate, 
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Creates a new league owned by the logged-in admin."""
    new_league = League(
        name=league.name,
        description=league.description,
        owner_id=current_admin.id
    )
    
    db.add(new_league)
    try:
        db.commit()
        db.refresh(new_league)
        return new_league
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="A league with this name already exists")

@app.get("/api/leagues/me")
def get_my_leagues(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Fetches only the leagues owned by this specific admin."""
    leagues = db.query(League).filter(League.owner_id == current_admin.id).all()
    return leagues

@app.get("/api/leagues")
def get_public_leagues(db: Session = Depends(get_db)):
    """Public route to list all active circuits."""
    return db.query(League).all()

@app.get("/api/leaderboard")
def get_league_leaderboard(league_id: int, db: Session = Depends(get_db)):
    """Calculates and returns the standings for a specific league."""
    # 1. Grab all players isolated to this specific league
    players = db.query(Player).filter(Player.league_id == league_id).all()
    
    standings = []
    for p in players:
        # Sum up all points this player has earned across all synced tournaments
        total_points = sum(placement.points_awarded for placement in p.placements)
        
        # We only want to show players who have actually scored points
        if total_points > 0:
            standings.append({
                "username": p.username,
                "team": p.team.name if p.team else "Free Agent",
                "points": total_points
            })
            
    # 2. Sort the array by points (highest to lowest)
    standings.sort(key=lambda x: x["points"], reverse=True)
    
    # 3. Assign official ranks based on their sorted position
    for i, player in enumerate(standings):
        player["rank"] = i + 1
        
    return standings