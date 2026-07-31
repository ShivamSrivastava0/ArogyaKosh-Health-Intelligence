# ArogyaKosh-Health-Intelligence
## FullStack AI RAG ML - *Transforming Medical Records into Health Intelligence*
AI-powered Health Intelligence Platform that transforms medical records into actionable insights using React, Node.js, Machine Learning, RAG, and Generative AI.

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/Python-ML-3776AB?style=for-the-badge&logo=python" />
  <img src="https://img.shields.io/badge/LangChain-RAG-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Google-Gemini-orange?style=for-the-badge" />
</p>

<p align="center">
An AI-powered Health Intelligence Platform that transforms medical records into meaningful insights using <b>Machine Learning</b>, <b>Retrieval-Augmented Generation (RAG)</b>, and <b>Modern Full-Stack Development</b>.
</p>

---

# ✨ Features

- 🔐 Secure JWT Authentication
- 👤 Personal Health Profile
- 👨‍👩‍👧 Family Health Vault
- 📁 Digital Health Locker
- 🧠 AI Lab Report Intelligence
- 📊 ArogyaScore™ Engine
- 📈 Health Timeline
- 🤖 Health RAG Assistant
- ❤️ ArogyaPredict (Machine Learning)
- 👨‍⚕️ AI Pre-Doctor Brief
- 🚑 Emergency QR Medical Card
- 📄 Annual Health Report

---

# 🏗️ System Architecture

```text
React (Vite)
      │
      ▼
Express.js REST API
      │
 ┌────┼──────────────┐
 ▼    ▼              ▼
MongoDB        Cloudinary
                    │
                    ▼
      Flask ML Service
                    │
                    ▼
LangChain + ChromaDB + Gemini
```

---

# 🛠 Tech Stack

## Frontend

- React.js
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- Framer Motion

## Backend

- Node.js
- Express.js
- JWT Authentication
- Multer
- Nodemailer
- pdf-parse

## Database

- MongoDB Atlas
- Mongoose

## AI / Machine Learning

- Python
- Flask
- Scikit-learn
- XGBoost
- SHAP
- LangChain
- ChromaDB
- Google Gemini
- spaCy

## Cloud

- Vercel
- Render
- Hugging Face Spaces
- Cloudinary

---

# 📂 Project Structure

```text
ArogyaKosh-FullStack-AI-RAG-ML/

├── client/
├── server/
├── ml-service/
├── notebooks/
├── README.md
└── .env.example
```

---

# 🚀 Core Modules

| Module | Description |
|---------|-------------|
| Authentication | Secure JWT-based authentication |
| Health Profile | Personal medical information |
| Family Vault | Multi-member health management |
| Health Locker | Secure cloud document storage |
| Lab Intelligence | Automatic report parsing & trends |
| ArogyaScore | AI-powered health scoring |
| Health RAG | Chat with your medical records |
| ArogyaPredict | ML risk prediction |
| Doctor Brief | AI-generated appointment summary |
| Emergency QR | Instant emergency medical access |
| Annual Report | AI-powered yearly health report |

````md
# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/your-username/ArogyaKosh-FullStack-AI-RAG-ML.git
cd ArogyaKosh-FullStack-AI-RAG-ML
```

## Install Dependencies

### Frontend

```bash
cd client
npm install
```

### Backend

```bash
cd ../server
npm install
```

### ML Service

```bash
cd ../ml-service
pip install -r requirements.txt
```

---

# 🔑 Environment Variables

```env
# Backend
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
EMAIL_USER=
EMAIL_PASS=

# Frontend
VITE_API_URL=

# ML Service
MODEL_PATH=
```

---

# ▶️ Run Locally

### Frontend

```bash
npm run dev
```

### Backend

```bash
npm run dev
```

### ML Service

```bash
python app.py
```

---

# 🧠 Machine Learning

The project includes four end-to-end Jupyter notebooks:

- ❤️ Heart Disease Prediction
- 🩸 Diabetes Prediction
- 📈 Lab Trend Analysis
- 🔬 Lab Report NLP Extraction

Each notebook covers:

- Exploratory Data Analysis (EDA)
- Data Cleaning
- Feature Engineering
- Model Training
- Evaluation Metrics
- SHAP Explainability
- Model Export

---

# 🤖 AI Features

### 🧠 Health RAG Assistant

```
Medical Reports
        │
        ▼
Document Parsing
        │
        ▼
LangChain
        │
        ▼
ChromaDB
        │
        ▼
Gemini
        │
        ▼
AI Answers with Citations
```

### ❤️ ArogyaPredict

- Heart Disease Risk
- Diabetes Risk
- Hypertension Risk
- Explainable AI using SHAP

---

# ☁️ Deployment

| Service | Platform |
|----------|----------|
| Frontend | Vercel |
| Backend | Render |
| ML API | Hugging Face Spaces |
| Database | MongoDB Atlas |
| Storage | Cloudinary |

---

# 📸 Screenshots

> *(Add project screenshots here after development)*

- Dashboard
- Health Intelligence
- Lab Report Intelligence
- Health RAG Assistant
- ArogyaPredict
- Emergency QR Card
- Pre-Doctor Brief

---

# 🚀 Future Enhancements

- 📱 Mobile Application
- ⌚ Wearable Integration
- 🌍 Multi-language Support
- 🗣 Voice Assistant
- 🏥 Hospital Integration
- 👨‍⚕️ Doctor Portal

---

# ⚠️ Disclaimer

- ArogyaPredict provides statistical health risk estimates and **does not replace professional medical advice.**
- The Health RAG Assistant answers **only from the user's uploaded medical documents.**
- ArogyaKosh is designed as a **personal health management platform**, not a medical diagnosis system.

---

# 👨‍💻 Author

**Shivam Srivastava**

If you found this project helpful, consider ⭐ starring the repository!

---
````
