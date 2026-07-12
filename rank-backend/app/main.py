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
def sync_challonge_tournament(request: SyncRequest, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    headers = {"Authorization-Type": "v1", "Authorization": API_KEY}
    
    # 1. Fetch Tournament Data
    url = f"https://api.challonge.com/v2/tournaments/{request.tournament_id}.json"
    tourney_res = requests.get(url, headers=headers)
    if tourney_res.status_code != 200:
         raise HTTPException(status_code=400, detail="Failed to fetch tournament from Challonge")
    tourney_data = tourney_res.json()
    
    # 2. Fetch Participants (where the ranks are)
    parts_url = f"https://api.challonge.com/v2/tournaments/{request.tournament_id}/participants.json"
    parts_res = requests.get(parts_url, headers=headers)
    if parts_res.status_code != 200:
         raise HTTPException(status_code=400, detail="Failed to fetch participants")
    participants_data = parts_res.json().get("data", [])

    players_synced = 0
    
    # 3. Process each participant
    for p in participants_data:
        attrs = p.get("attributes", {})
        
        # Get their Challonge handle (fallback to their display name if they don't have an account)
        challonge_handle = attrs.get("challonge_username") or attrs.get("name")
        final_rank = attrs.get("final_rank")
        
        if not challonge_handle or not final_rank:
            continue
            
        # Check if they exist in our database
        player = db.query(Player).filter(Player.challonge_username == challonge_handle).first()
        
        # --- NEW: AUTO-CREATE PLAYER IF MISSING ---
        if not player:
            player = Player(
                username=challonge_handle, 
                challonge_username=challonge_handle
            )
            db.add(player)
            db.commit()
            db.refresh(player)
        # ------------------------------------------

        # Calculate Grand Prix points
        points = 0
        if final_rank == 1: points = 10
        elif final_rank == 2: points = 7
        elif final_rank == 3: points = 5
        elif final_rank == 4: points = 3
        elif final_rank <= 8: points = 1

        # Check if this placement is already recorded (prevents duplicate points if you sync twice)
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
        "total_players_synced": players_synced,
        "unmapped_bladers": [] # Left blank since everyone is auto-mapped now!
    }

@app.post("/api/teams")
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    # Check if team already exists
    existing_team = db.query(Team).filter(Team.name == team.name).first()
    if existing_team:
        raise HTTPException(status_code=400, detail="A team with this name already exists.")
    
    new_team = Team(name=team.name, logo_url=team.logo_url)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return {"message": "Team created successfully", "team": {"id": new_team.id, "name": new_team.name}}

@app.post("/api/players")
def create_player(player: PlayerCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    # Check if username or challonge handle is already taken
    existing_user = db.query(Player).filter(
        (Player.username == player.username) | 
        (Player.challonge_username == player.challonge_username)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Challonge handle already registered.")
    
    # Optional: Verify team exists if a team_id is provided
    if player.team_id:
        team_check = db.query(Team).filter(Team.id == player.team_id).first()
        if not team_check:
            raise HTTPException(status_code=404, detail="Team ID not found.")

    new_player = Player(
        username=player.username,
        challonge_username=player.challonge_username,
        team_id=player.team_id
    )
    db.add(new_player)
    db.commit()
    db.refresh(new_player)
    return {"message": "Player registered successfully", "player": {"id": new_player.id, "username": new_player.username}}

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    """Calculates total GP points per player and returns the sorted standings."""
    results = db.query(
        Player.username,
        Team.name.label("team_name"),
        func.sum(Placement.points_awarded).label("total_points")
    ).outerjoin(Team, Player.team_id == Team.id)\
     .join(Placement, Player.id == Placement.player_id)\
     .group_by(Player.id, Player.username, Team.name)\
     .order_by(func.sum(Placement.points_awarded).desc())\
     .all()
     
    # Format the data for the React frontend, automatically assigning ranks
    return [
        {
            "rank": index + 1, 
            "username": row.username, 
            "team": row.team_name or "Free Agent", 
            "points": row.total_points
        }
        for index, row in enumerate(results)
    ]

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