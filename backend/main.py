from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, items_router, reviews_router, ai_router
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="English Partner API",
    description="Backend API for English learning and review",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(items_router.router)
app.include_router(reviews_router.router)
app.include_router(ai_router.router)


@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "English Partner API is running"}


@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "english-partner-api",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    from config import settings
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
