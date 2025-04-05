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
- **Databases**: PostgreSQL, MongoDB
- **Storage**: AWS S3 (for file storage)
- **AI Services**: OpenAI API

## Local Development Setup

### Requirements

- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL
- MongoDB
- AWS Account (for S3 storage)
- OpenAI API Key (for AI features)

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

#### PostgreSQL

Using Homebrew (macOS):

1. Install PostgreSQL:
   ```bash
   brew install postgresql@15
   ```

2. Start PostgreSQL service:
   ```bash
   brew services start postgresql@15
   ```

3. Create database and user:
   ```bash
   psql postgres -c "CREATE DATABASE edusloth;"
   psql postgres -c "CREATE USER postgres WITH PASSWORD 'password';"
   psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE edusloth TO postgres;"
   ```

#### MongoDB

Using Homebrew (macOS):

1. Install MongoDB:
   ```bash
   brew install mongodb-community
   ```

2. Start MongoDB service:
   ```bash
   brew services start mongodb-community
   ```

The application will automatically create the MongoDB database when it first connects.

### Docker Alternative

Instead of installing databases locally, you can use Docker:

1. Create a `docker-compose.yml` file in the project root:
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=password
         - POSTGRES_DB=edusloth
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data

     mongodb:
       image: mongo:6
       ports:
         - "27017:27017"
       volumes:
         - mongodb_data:/data/db

   volumes:
     postgres_data:
     mongodb_data:
   ```

2. Start the containers:
   ```bash
   docker-compose up -d
   ```

### Additional Requirements

#### FFmpeg
The audio processing features require FFmpeg:

On macOS:
```bash
brew install ffmpeg
```

On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

On Windows, download from the [official website](https://ffmpeg.org/download.html) and add to PATH.

## Environment Configuration

### Backend (.env)

Essential environment variables:
```
# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=EduSloth
SERVER_NAME=localhost
SERVER_HOST=http://localhost:8000
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]

# Security
SECRET_KEY=your-secure-random-string

# PostgreSQL
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=edusloth

# MongoDB
MONGODB_URL=mongodb://localhost:27017/
MONGODB_DB=edusloth

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# AWS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=eu-central-1
S3_BUCKET=edusloth-files
```

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

- **Database connection issues**: Ensure PostgreSQL and MongoDB are running and credentials are correct
- **Audio processing errors**: Verify FFmpeg is properly installed
- **File upload issues**: Check AWS credentials and S3 bucket permissions
- **AI feature errors**: Verify OpenAI API key is valid and has sufficient credits

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
