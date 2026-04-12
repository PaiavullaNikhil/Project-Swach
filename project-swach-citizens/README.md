# 🇮🇳 Project Swach - Citizen Module

Project Swach is a decentralized, AI-powered waste management system that empowers citizens to report and validate garbage issues in real-time.

## 📱 Features
- **Anonymous Reporting**: Report waste issues without needing an account.
- **AI Verification**: Gemini Vision automatically validates photos of waste.
- **Geo-Mapping**: Instant Ward/MLA tagging via reverse geocoding.
- **Cloud Powered**: Images are stored securely on Cloudinary.
- **Community Upvoting**: Support existing reports to increase their priority.

## 📂 Project Structure
- **/mobile**: React Native (Expo) application for citizens.
- **/backend**: FastAPI server with MongoDB (Beanie ODM) and Gemini AI.

## 🚀 Getting Started
Check the [HOW_TO_RUN.md](./HOW_TO_RUN.md) file for detailed setup and execution instructions for both the mobile and backend components.

## 🔑 Requirements
- Node.js (for Expo)
- Python 3.9+ (for Backend)
- MongoDB Atlas account
- Cloudinary account
- Google AI Studio (Gemini) API Key
