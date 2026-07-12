from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.database import Base, engine, get_db
import app.models as models

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