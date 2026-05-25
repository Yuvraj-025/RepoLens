# RepoLens - AI Codebase Chat Platform

RepoLens is a web platform that lets developers upload a software repository as a ZIP file and then interact with it using natural language. Once uploaded, the system processes the codebase, generates semantic embeddings for its contents, and enables engineers to ask questions like "where is authentication handled?" or "which files deal with payments?" and get accurate, cited answers pointing to specific files and line numbers.

Shortening the onboarding ramp-up, RepoLens is designed to make any codebase instantly queryable in plain English.

---

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Monaco Editor (for visual file previews), and Lucide React.
- **Backend:** NestJS, Multer (for ZIP uploads), adm-zip (for extraction), Passport & JWT.
- **Database & AI:** PostgreSQL with the `pgvector` extension, Prisma ORM, Gemini Embeddings API (`gemini-embedding-001`), and Google Gemini 2.5 Flash.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker & Docker Compose](https://www.docker.com/) (to run PostgreSQL with `pgvector`)
- Git

### Cloning the Repository

```bash
git clone https://github.com/Yuvraj-025/RepoLens.git
cd RepoLens
```

### Installation

Install dependencies for both the frontend and the backend applications:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

#### Backend Env Configuration
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/repolens?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_CHAT_MODEL="models/gemini-2.5-flash"
PORT=3001
```

#### Frontend Env Configuration
Create a `.env` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

#### Database Schema Setup
Apply the database schema and migrations to the local PostgreSQL database using Prisma:
```bash
cd backend
npx prisma db push
```

---

## Running the Application

### Option A: Quick Start (Windows)

1. **Spin up the Database:**
   ```bash
   docker-compose up -d
   ```

2. **Start Backend Server:**
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Start Frontend Server:**
   ```bash
   cd frontend
   npm run dev
   ```

The application will be accessible at `http://localhost:3000`. The NestJS API server will run at `http://localhost:3001`.
