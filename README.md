# EduSloth

EduSloth is an AI-powered study companion that helps students organize study materials, transcribe audio recordings, and create intelligent reminders for effective learning.

## Features

- User authentication and profile management
- Content management (upload documents, record audio)
- Transcription of audio recordings
- AI-generated summaries, flashcards, quizzes, and mind maps
- Intelligent reminder system
- Study planning and tracking
- Todo list management
- Flashcard study system

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Zustand
- **Backend**: FastAPI, Python
- **Databases**: MongoDB
- **Storage**: AWS S3 (for file storage)
- **AI Services**: Google Generative AI API

## Local Development Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB
- Docker (optional, for database services)
- AWS Account & Credentials (for S3)
- Google Generative AI API Key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your actual configuration.

5. Start the backend server:
   ```bash
   python main.py
   ```
   The backend will run at http://localhost:8000 with API documentation at http://localhost:8000/docs

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will run at http://localhost:3000

### Database Setup

#### MongoDB

1. **Install MongoDB**: Follow the official MongoDB installation guide for your OS.
   Alternatively, use Docker (see `docker-compose.yml`).

2. **Run MongoDB**: Ensure the MongoDB service is running. If using Docker:
   ```bash
   docker-compose up -d mongodb
   ```

#### PostgreSQL

### Docker

A `docker-compose.yml` file is provided for running database services easily:

```yaml
version: '3'
services:
  mongodb:
    image: mongo:7 # Use a specific version if needed
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

## Environment Variables

Create a `.env` file in the `backend` directory by copying `.env.example`. Key variables include:

# PostgreSQL
# POSTGRES_SERVER=localhost
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=password
# POSTGRES_DB=edusloth

# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=edusloth

# Google AI
GOOGLE_API_KEY=your-google-api-key

# AWS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=eu-central-1
S3_BUCKET=edusloth-files

## Usage

After setting up both frontend and backend:

1. Register a new account at http://localhost:3000/register
2. Log in with your credentials
3. Use the dashboard to navigate to different features:
   - Upload documents
   - Record audio
   - Create reminders
   - Manage study plans
   - Create and study flashcards

## Troubleshooting

- **Database connection issues**: Ensure MongoDB is running and credentials in `backend/.env` are correct. Check firewall settings.
- **Dependency errors**: Run `pip install -r backend/requirements.txt` and `npm install` in `frontend/`.
- **AI feature errors**: Verify Google API key is valid and has sufficient credits. Check network connectivity to AI services.
- **CORS errors**: Ensure `BACKEND_CORS_ORIGINS` in `backend/.env` includes your frontend URL (`http://localhost:3000` by default).

## Connecting to MongoDB (GUI Tools)

There are several excellent free GUI tools available for connecting to MongoDB on Mac:

### 1. MongoDB Compass (Recommended)
MongoDB Compass is the official GUI for MongoDB, offering a user-friendly interface to explore and manipulate your data.

1. Download MongoDB Compass:
   - Visit [MongoDB Compass Download Page](https://www.mongodb.com/try/download/compass)
   - Choose the latest stable version for macOS
   - Download and install the application

2. Connect to your local MongoDB:
   - Open MongoDB Compass
   - Use this connection string: `mongodb://localhost:27017`
   - Click "Connect"
   - Select the `edusloth` database

### 2. Studio 3T (Previously Robo 3T)
Studio 3T offers a free version with essential features for MongoDB management.

1. Download Studio 3T:
   - Visit [Studio 3T Download Page](https://studio3t.com/download/)
   - Download the free version for macOS
   - Install the application

2. Connect to your local MongoDB:
   - Open Studio 3T
   - Click "Connect" > "New Connection"
   - Use these settings:
     - Type: Direct Connection
     - Address: localhost
     - Port: 27017
   - Save and connect
   - Navigate to the `edusloth` database

### 3. NoSQLBooster for MongoDB
Another popular option with a free version that includes core features.

1. Download NoSQLBooster:
   - Visit [NoSQLBooster Download Page](https://nosqlbooster.com/downloads)
   - Download the free version for macOS
   - Install the application

2. Connect to your local MongoDB:
   - Open NoSQLBooster
   - Click "Connect" > "New Connection"
   - Connection URL: `mongodb://localhost:27017`
   - Test and save the connection
   - Open the `edusloth` database

### Useful Collections in EduSloth
Once connected, you'll find these main collections in the `edusloth` database:
- `users`: User accounts and authentication data
- `content`: Study materials and transcribed content
- `reminders`: Study reminders and schedules

### Connection String Reference
- Local development: `mongodb://localhost:27017`
- Database name: `edusloth`
