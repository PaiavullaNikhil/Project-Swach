# 🛠️ How to Run Project Swach (Citizen Module)

Follow these steps to get both the backend and the mobile app running on your local machine.

---

## 1. Backend Setup (FastAPI)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```
2. **Setup virtual environment** (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**:
   - Copy `.env.example` to `.env`.
   - Add your **MONGODB_URI**, **CLOUDINARY** keys, and **GEMINI_API_KEY**.
5. **Start the server**:
   ```bash
   uvicorn main:app --reload
   ```

---

## 2. Mobile App Setup (Expo)

1. **Navigate to the mobile directory**:
   ```bash
   cd mobile
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure API URL**:
   - Open `constants/theme.ts`.
   - Update `API_URL` with your computer's **Local IP Address** (e.g., `http://192.168.1.10:8000`).
4. **Start Expo Go**:
   ```bash
   npx expo start
   ```
5. **Run on your device**:
   - Scan the QR code using the **Expo Go** app (Android) or the Camera app (iOS).

---

## 📝 Prerequisites
- **MongoDB Atlas**: Get a connection string from [MongoDB Atlas](https://www.mongodb.com/).
- **Cloudinary**: Create an account at [Cloudinary](https://cloudinary.com/) for image storage.
- **Gemini AI**: Get an API key from [Google AI Studio](https://aistudio.google.com/).
