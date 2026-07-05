# Lead Intelligence AI - Enterprise SaaS Cockpit

This repository contains the complete production-ready, strictly typed **Lead Intelligence AI** full-stack SaaS platform. The system orchestrates outreach workflows, visual crawler pipelines, AI qualifications engines, and Salesforce synchronization channels over an elegant premium white-themed dashboard cockpit.

---

## 🏗️ Production Architecture Overview

```mermaid
graph TD
    UI[React + Vite Frontend] -- Axios REST + Auth JWT --> API[Express API Server]
    API -- Prisma Client ORM --> DB[(PostgreSQL / SQLite Database)]
    API -- GPT-4o Prompt Engine --> AI[AI Synthesis Layer]
    API -- Async Jobs --> Queue[Simulated Telemetry Crawlers]
    API -- Sync Hub --> CRM[Salesforce CRM Integration]
    
    subgraph Container Cluster (Docker Compose)
        Nginx[Nginx SPA Proxy] --> UI
        API
        DB
    end
```

---

## 📂 System Core Modules

1.  **Executive Dashboard**: Dynamic SVGs chart coordination tracing weekly conversion margins, intelligent activities logging feed, and global left Sidebar network/database connection diagnostics checking `/health` every 15s.
2.  **Leads Management Directory**: Real-time matching filter logs, details inspection sidebars rendering custom **SVG Probability Ring Dials**, qualified reasoning checkmarks, and buyer intent logs.
3.  **Outreach Automation Steps**: Multi-step delay sequences, AISubject personalized prompt previews, auto connection LinkedIn setups, and spam/bounce calculations.
4.  **AI Pipeline Orchestration Canvas**: Beautiful dot-matrix nodes editor mapped to database layout coordinates (`x`, `y`) with telemetry logger outputs, fully draggable interfaces, and status checks.
5.  **Authentication & Multi-Tenancy**: JWT session cookie headers securing console access, bound to default admin `Admin` / `Administrator` role.

---

## ⚡ Local Development Quick Start

### 1. Database Initialization
From the project root:
```bash
# Install dependencies
npm install

# Initialize schema migrations
npx prisma migrate dev --name init

# Populate SQLite with rich realistic enterprise datasets (12+ leads)
npm run db:seed
```

### 2. Boot Backend Server
```bash
# Starts hot-reloading dev listener on http://localhost:5000
npm run dev
```

### 3. Boot Frontend App
Navigate into the `frontend` subdirectory:
```bash
cd frontend
npm install

# Starts Vite dev container on http://localhost:3000
npm run dev
```

---

## 🐋 Docker Multi-Container Orchestration

Ensure you have Docker and Docker Compose installed.

### 1. Build and Launch the Entire Stack
From the workspace root directory:
```bash
docker-compose up --build
```
This builds and boots:
*   **Database**: PostgreSQL 15 container listening on port `5432` with volume persistence.
*   **Backend Server**: Node production Alpine container running on port `5000`.
*   **Frontend UI**: Vite React production build mounted behind an Nginx server running on port `3000`.

### 2. Service Endpoints
*   **Interactive Web Application**: `http://localhost:3000`
*   **Express REST Core API**: `http://localhost:5000/api/v1`
*   **Health Diagnostic Checks**: `http://localhost:5000/health`

---

## 💾 PostgreSQL Production Migration Guide

Prisma makes swapping local SQLite for cloud PostgreSQL extremely simple:

### Step 1: Update Schema Connection
In `prisma/schema.prisma` (lines 1–4):
```diff
-datasource db {
-  provider = "sqlite"
-  url      = "file:./dev.db"
-}
+datasource db {
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
+}
```

### Step 2: Configure Environment Connection
Provide a standard PostgreSQL database connection URI inside your production environment:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/db_name?schema=public"
```

### Step 3: Run Database Migrations
Re-deploy the database schema onto your PostgreSQL cluster:
```bash
npx prisma migrate deploy
```

---

## 🚀 Cloud Deployment Targets Reference

### 1. Frontend SPA hosting (Vercel / Netlify)
*   **Target**: Deploy the `frontend/` folder.
*   **Build Command**: `npm run build` (resolves `tsc && vite build`).
*   **Output Folder**: `dist/`
*   **Environment Settings**: Set `VITE_API_BASE_URL` pointing to your hosted API address.
*   **Vercel Reverse Proxy Template (`vercel.json`)**:
    To bypass CORS securely, place this in `frontend/vercel.json`:
    ```json
    {
      "rewrites": [
        {
          "source": "/api/v1/:path*",
          "destination": "https://your-api.railway.app/api/v1/:path*"
        }
      ]
    }
    ```

### 2. Backend Hosting (Railway / Render)
*   **Target**: Deploy the root folder.
*   **Environment Settings**: Configure environment variables (`PORT=5000`, `JWT_SECRET`, `DATABASE_URL` pointing to your managed cloud PostgreSQL).
*   **Docker Deployment**: Both Render and Railway will automatically read `Dockerfile` and build the Node production Alpine environment out-of-the-box.

### 3. Managed Database Hosting (Supabase / AWS RDS)
*   Deploy a managed PostgreSQL database.
*   Acquire the connection string, append it to your backend deployment environment under `DATABASE_URL`, and run `npx prisma migrate deploy` to deploy the schema.
