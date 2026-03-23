# StudyNest: Academic Synergy Platform 🎓

StudyNest is an ultra-premium, collaborative environment designed for modern scholars at United International University (UIU). It synchronizes academic life, professional study habits, and collective success through a high-performance interactive ecosystem.

---

## 📄 Software Requirements Specification (SRS)

### 1. Introduction
**StudyNest** is a comprehensive educational platform that bridges the gap between individual study and collective achievement. It provides students with real-time collaboration tools, AI-powered academic assistance, and a structured repository for knowledge sharing.

### 2. Core Modules & Features
- **Intelligent Dashboard**: Real-time stats, focus timer, active study room tracking, and integrated to-do management.
- **Academic Repository**: A secure, searchable library for lecture notes and academic resources with peer-review capabilities.
- **Q&A Forum**: A gamified knowledge-sharing environment where students earn points for helpful contributions.
- **Dynamic Study Rooms**: Real-time collaborative spaces featuring video/audio synchronization and an interactive shared whiteboard.
- **AI Intelligence Suite**:
    - **AI File Check**: Automated document analysis and verification.
    - **AI Usage Checker**: Integrity verification tool.
    - **Humanize Writing**: Advanced paraphrasing and structural refinement.
- **Social Engine**: Direct messaging, specialized study groups, and community-wide leaderboard tracking.

### 3. System Architecture
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion (for premium animations).
- **Backend API**: PHP (REST Architecture) managing core business logic and database interactions.
- **AI Microservice**: Python (Flask) + NLTK handling specialized NLP and AI processing tasks.
- **Real-time Service**: Node.js + WebSocket + WebRTC for low-latency collaboration and video streaming.
- **Database Layer**:
    - **PostgreSQL**: Primary authoritative database for session management, auth, and complex relational data.
    - **MySQL**: Dedicated backup and legacy support layer.

### 4. Non-Functional Requirements
- **Security**: Conditional rendering of AIChatbot on sensitive (Auth/Landing) routes; secure JWT-based authentication.
- **Responsiveness**: Fully optimized for Mobile, Tablet, and Desktop viewports with a premium sliding drawer navigation system.
- **Performance**: Asynchronous resource loading and debounced search operations for maximum UI fluidity.
- **Modular Design**: The landing page and core dashboard are built with a high-granularity component architecture for maximum maintainability.

### 5. External Integrations
- **AI Engine**: Powered by OpenAI (GPT-4o/mini) for intelligent chat and academic analysis.
- **Cloud Infrastructure**: Integrated with **Cloudinary** for secure management of academic uploads, proofs, and video recordings.
- **Real-time Engine**: Custom WebSocket/WebRTC implementation for low-latency peer-to-peer communication.

---

## 🚀 Quick Start & Setup

### 1. Frontend & UI
```bash
cd study-nest
npm install
npm run dev
```

### 2. Backend & AI Support
```bash
cd study-nest
php -S localhost:8000 -t .
```

### 3. Real-time Video/Chat Server
```bash
cd study-nest/src/realtime
npm install
npm start
```

### 4. AI Toolchain (Paraphraser/Summarizer)
```bash
# Setup Virtual Environment (First time only)
python -m venv .venv
.\.venv\Scripts\activate

# Install AI Dependencies
pip install flask flask-cors nltk

# Run the AI Microservice
python src/Python/sampar.py
```

### 5. Chatbot & PHP Dependencies
```bash
composer install
```

---

## 🛠️ Internal Interface Requirements
- **API Endpoint**: `localhost:8000` (PHP)
- **AI Endpoint**: `localhost:5000` (Python/Sampar)
- **WebSocket**: `localhost:5001` (Node.js)
- **Database**: PostgreSQL (Port 5432), MySQL (Port 3306)

---

## 📂 Project Structure
- `/study-nest`: Main application source.
  - `/src/api`: PHP REST API layer.
  - `/src/Components`: Modular UI library.
  - `/src/Pages`: Route-level views.
  - `/src/realtime`: Real-time Node.js server.
- `/database`: Authoritative SQL schemas.

---
*© 2026 StudyNest — Engineering Academic Excellence.*
