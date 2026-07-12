from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

# --- THE IDENTITY ENGINE ---

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    
    # A user can own multiple leagues
    leagues = relationship("League", back_populates="owner")

class League(Base):
    __tablename__ = "leagues"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="leagues")
    teams = relationship("Team", back_populates="league")
    players = relationship("Player", back_populates="league")

# --- THE TOURNAMENT DATA ---

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    logo_url = Column(String, nullable=True)
    league_id = Column(Integer, ForeignKey("leagues.id")) # Isolates team to a league
    
    league = relationship("League", back_populates="teams")
    players = relationship("Player", back_populates="team")

class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    challonge_username = Column(String, unique=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    league_id = Column(Integer, ForeignKey("leagues.id")) # Isolates player to a league
    
    team = relationship("Team", back_populates="players")
    league = relationship("League", back_populates="players")
    placements = relationship("Placement", back_populates="player")

class Placement(Base):
    __tablename__ = "placements"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"))
    tournament_id = Column(String, index=True) 
    rank = Column(Integer)
    points_awarded = Column(Integer)
    
    player = relationship("Player", back_populates="placements")