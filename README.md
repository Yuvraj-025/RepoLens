# RepoLens - AI Codebase Chat Platform

RepoLens is a web platform that lets developers upload a software repository as a ZIP file and then interact with it using natural language. Once uploaded, the system processes the codebase, generates semantic embeddings for its contents, and enables engineers to ask questions like "where is authentication handled?" or "which files deal with payments?" and get accurate, cited answers pointing to specific files and line numbers.

Shortening the onboarding ramp-up, RepoLens is designed to make any codebase instantly queryable in plain English.

---

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Monaco Editor (for visual file previews), and Lucide React.
- **Backend:** NestJS, Multer (for ZIP uploads), adm-zip (for extraction), Passport & JWT.
- **Database & AI:** PostgreSQL with the `pgvector` extension, Prisma ORM, Gemini Embeddings API (`text-embedding-004`), and Google Gemini 2.5 Flash.

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
GEMINI_CHAT_MODEL="gemini-2.5-flash"
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

## Running the Application Locally

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

---

## Continuous Integration (GitHub Actions)

RepoLens includes a GitHub Actions CI workflow configured at `.github/workflows/ci.yml`.

The pipeline automatically triggers on any push or pull request to the `main` branch, performing the following checks:
- **Backend CI**: Installs dependencies and runs `npm run build` (generates the Prisma client and compiles the NestJS project).
- **Frontend CI**: Installs dependencies and runs `npm run build` (verifies Next.js compilation).

---

## Production Deployment (Render)

RepoLens is configured to deploy directly from the `main` branch to **Render**.

### 1. Database Setup (Render PostgreSQL)
Render databases come with native support for extensions like `pgvector`.
1. Create a new **PostgreSQL** database on Render.
2. Choose a name and region.
3. Save the **Internal Database URL** for the backend configuration.

### 2. Backend Setup (Render Web Service)
1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Branch**: `main`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `node dist/main.js` (or `npm run start`)
   - **Release Command (Optional but Recommended)**: `npx prisma db push`
3. Add the following Environment Variables in the service settings:
   - `DATABASE_URL`: *Your Render Internal Database URL*
   - `JWT_SECRET`: *A secure random JWT secret string*
   - `GEMINI_API_KEY`: *Your Google AI Studio Gemini API Key*
   - `FRONTEND_URL`: *Your Render frontend URL (e.g., `https://repolens.onrender.com`)*
   - `NODE_ENV`: `production`

### 3. Frontend Setup (Render Web Service)
Since Next.js 14 requires server-side execution, deploy the frontend as a Render Web Service.
1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Configure settings:
   - **Root Directory**: `frontend`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
3. Add the following Environment Variable:
   - `NEXT_PUBLIC_API_URL`: *Your Render backend Web Service URL (e.g., `https://repolens-backend.onrender.com`)*
4. Once the frontend is running, ensure you copy its live URL and update the `FRONTEND_URL` variable in your backend service settings.
