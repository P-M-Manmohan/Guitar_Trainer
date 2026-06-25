import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="Guitar Trainer ML Service",
    description="Python backend service utilizing MediaPipe and OpenCV for hand tracking and guitar fingering assessment.",
    version="0.1.0"
)

# Set up CORS middleware to allow cross-origin requests from the web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
