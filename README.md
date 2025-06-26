# UEM FaceVision 👁️‍🗨️

**UEM FaceVision** is an AI-based facial recognition system developed using **FastAPI (backend)** and **React (frontend)**. It integrates deep learning models to detect and recognize faces from images or webcam streams. Designed for real-time applications in campus environments like attendance systems or security surveillance.

---

## 🧠 Features

- 🎯 Accurate face detection using **Dlib** & **OpenCV**
- 🧬 Deep face recognition with **Keras .h5 model**
- 📷 Real-time camera capture and face comparison
- 🔐 Secure Firebase-based user authentication
- 📂 Organized frontend-backend architecture
- ⚡ FastAPI REST API serving prediction endpoints


> 🚫 Large files and secrets are `.gitignore`d to follow GitHub policy.

---

## 🚀 How to Run Locally

### ✅ 1. Backend (FastAPI)
```bash
cd backend
uvicorn main:app --reload

### ✅ 1. Frontend (React)
```bash
cd frontend/frontend
npm install
npm start

## 🔐 Firebase Auth Setup

- Place your `firebase_service.json` in `backend/`
- Use your Firebase config in React at `src/firebase.js` (this file should **not** be committed to GitHub)

---

## 🛑 Notes

- 🔒 GitHub Push Protection is enabled (prevents committing secrets and large files)
- 🔥 Files like `.h5`, `.dat`, and `.json` (e.g., models and Firebase keys) are **not pushed to GitHub** — keep them locally or download during deployment
- 🧠 Ideal for college-level facial recognition projects, e-attendance systems, or academic demos

---

## ✨ Author

👨‍💻 **Shiva Pareek**  
📍 B.Tech CSE, UEM Jaipur  
🔗 [Instagram](https://instagram.com/samrat_edition)  
📧 pareekshiva2004@gmail.com




