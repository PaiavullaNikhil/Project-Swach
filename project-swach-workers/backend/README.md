# 🌿 Project Swach - Citizens Backend

This is the FastAPI backend for the Citizens module of Project Swach. It handles report submissions, AI verification, and cloud storage.

## 🛠️ Setup Instructions

1. **Clone the repository** and navigate to this folder.
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`.
   - Fill in the required API keys (details below).

## 🔑 How to get API Keys

### 1. MongoDB Atlas (Database)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a Free Cluster.
3. Click "Connect" -> "Drivers" -> Copy the **Connection String**.
4. Replace `<password>` with your database user's password in the `.env` file.

### 2. Cloudinary (Photo Storage)
1. Sign up/Login at [Cloudinary](https://cloudinary.com/).
2. On your **Dashboard**, copy your:
   - `Cloud Name`
   - `API Key`
   - `API Secret`
3. Paste these into your `.env` file.

### 3. Google Gemini (AI Verification)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Create a new **API Key**.
3. Paste it into `GEMINI_API_KEY` in your `.env` file.

## 🚀 Running the Server
```bash
uvicorn main:app --reload
```

The server will be available at `http://localhost:8000`.
You can access the auto-generated API documentation at `http://localhost:8000/docs`.
