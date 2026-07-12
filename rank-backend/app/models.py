from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, UniqueConstraint, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    players = relationship("Player", back_populates="team")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False, unique=True)
    challonge_username = Column(String(100), nullable=False, unique=True)
    # Corrected 'ondelete' parameter position:
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    team = relationship("Team", back_populates="players")
    placements = relationship("Placement", back_populates="player")


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(String(100), primary_key=True, index=True)  # Challonge URL identifier slug
    name = Column(String(150), nullable=False)
    held_on = Column(Date, nullable=False)

    # Relationships
    placements = relationship("Placement", back_populates="tournament")


class Placement(Base):
    __tablename__ = "placements"

    id = Column(Integer, primary_key=True, index=True)
    # Corrected 'ondelete' parameter positions:
    tournament_id = Column(String(100), ForeignKey("tournaments.id", ondelete="CASCADE"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    final_rank = Column(Integer, nullable=False)
    points_awarded = Column(Integer, nullable=False)

    # Relationships
    tournament = relationship("Tournament", back_populates="placements")
    player = relationship("Player", back_populates="placements")

    # Guardrail integrity
    __table_args__ = (
        UniqueConstraint('tournament_id', 'player_id', name='_tournament_player_uc'),
    )