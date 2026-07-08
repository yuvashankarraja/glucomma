# Glaucoma EyeCare AI Platform

Welcome to the enterprise-grade AI-powered **Glaucoma EyeCare Diagnostic Web Application**. This platform allows patients to upload retinal fundus images, analyze glaucoma probability, check Grad-CAM localized optic-disc cupping heatmaps, receive RAG-validated dietary/lifestyle chatbot tips, and trigger low-latency WebRTC video appointments with clinical ophthalmologists.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS (v3) + Recharts (Timeline analytics) + Lucide Icons.
- **Backend**: Python FastAPI + SQLAlchemy ORM (SQLite / MySQL support) + JWT Authentication (Role-Based Access Control).
- **Diagnostics**: OpenCV / TensorFlow CNN (Binary Classification + Grad-CAM Heatmaps).
- **RAG Chatbot**: OpenAI / Groq LLM API client + Local Vector Retrieval.
- **Consultation**: WebSocket Signaling relays + WebRTC Peer Connections.

---

## 🔑 Demo Account Credentials

Use these presets to instantly access each portal dashboard (no manual signup required):

| Portal Role | Demo Username (Email) | Password |
| :--- | :--- | :--- |
| **Patient Portal** | `patient@glaucoma.org` | `password123` |
| **Ophthalmologist (Doctor)** | `doctor@glaucoma.org` | `password123` |
| **Clinic Administrator** | `admin@glaucoma.org` | `password123` |

---

## ⚙️ Backend Installation & Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a python virtual environment**:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install python packages**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables (`.env`)**:
   Create a `.env` file inside the `backend/` folder:
   ```env
   # Database connection (Default is SQLite fallback, uncomment for MySQL)
   # DATABASE_URL=mysql+pymysql://db_user:db_password@localhost/glaucoma_db
   
   # Security JWT Secret
   SECRET_KEY=supersecretkey_change_in_production_918237
   
   # RAG Chatbot Integration (Provide OpenAI or Groq Keys)
   OPENAI_API_KEY=your-openai-api-key
   # LLM_MODEL=gpt-3.5-turbo
   
   # Alternative: Groq Cloud API
   # OPENAI_API_KEY=your-groq-api-key
   # LLM_BASE_URL=https://api.groq.com/openai/v1
   # LLM_MODEL=llama3-70b-8192
   ```

5. **Start the FastAPI server**:
   ```bash
   python run.py
   ```
   *The server starts at `http://localhost:8000`. You can inspect the Swagger REST API documentation at `http://localhost:8000/docs`.*

---

## 💻 Frontend Installation & Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node packages**:
   ```bash
   npm install
   ```

3. **Launch the local Vite server**:
   ```bash
   npm run dev
   ```
   *The client dashboard starts at `http://localhost:5173`. Proxies to `/api` and `/uploads` are pre-mapped to port 8000.*

---

## 🗄️ Relational Database Configurations

By default, the application runs on **SQLite** (`glaucoma.db`) with zero configuration, auto-creating and auto-seeding tables on first startup.

To switch to **MySQL**:
1. Run the DDL statements in `database/schema.sql` on your MySQL server instance.
2. Run the seed inputs in `database/seed.sql` to generate demo accounts.
3. Configure the `DATABASE_URL` inside your `backend/.env` file:
   ```env
   DATABASE_URL=mysql+pymysql://<user>:<password>@<host>:<port>/glaucoma_db
   ```

---

## 🧠 Machine Learning CNN Training

The backend includes a dual-mode ML pipeline:
- **Offline Fallback**: If no trained CNN is loaded, the backend runs an OpenCV circle detection algorithm to measure optic cup/disc metrics and draws a red-orange heatmap. The UI is 100% testable out-of-the-box.
- **Production Mode**: To use a neural network, train the model on the Kaggle dataset.

### Steps to Train CNN:
1. Download the retinal scans from [Kaggle Glaucoma Datasets](https://www.kaggle.com/datasets/arnavjain1/glaucoma-datasets).
2. Unpack the dataset and restructure it:
   ```text
   glaucoma_dataset/
   ├── train/
   │   ├── normal/
   │   └── glaucoma/
   └── validation/
       ├── normal/
       └── glaucoma/
   ```
3. Navigate to the `ml/` directory and run the training pipeline:
   ```bash
   python train.py --dataset path/to/glaucoma_dataset --epochs 15 --output glaucoma_model.h5
   ```
4. Copy the compiled `glaucoma_model.h5` weights into the `ml/` folder. The FastAPI server will automatically load it on startup and switch to CNN inference mode!
