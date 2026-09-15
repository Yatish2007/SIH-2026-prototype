from fastapi import FastAPI

app = FastAPI(
    title="CAPACITY CONNECT API",
    description="Digital Capacity Building and Learning Management Portal",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "CAPACITY CONNECT Backend is running",
        "status": "success"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}