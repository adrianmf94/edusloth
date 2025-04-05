import os
import uvicorn

if __name__ == "__main__":
    # Create uploads directory
    os.makedirs("uploads", exist_ok=True)

    # Run app with uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
