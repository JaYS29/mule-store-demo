# Sticker Mule Store Demo

<div align="center">
  <img src="assets/mule-logo.svg" width="200" height="200" alt="Sticker Mule logo" />
</div>

<br />

<div align="center">

| Frontend    | Backend | DB       |
| ----------- | ------- | -------- |
| NextJS      | Go      | Postgres |
| Tailwindcss | GraphQL | Redis    |

</div>

<br />

## 🚀 Deployment

This demo is deployed using free-tier services to keep it accessible without incurring costs.

| Service        | Demo (Free Tier)                 | Production (GCP)                       |
| -------------- | -------------------------------- | -------------------------------------- |
| **Frontend**   | [Vercel](https://vercel.com)     | Firebase Hosting / Cloud Storage + CDN |
| **Backend**    | [Railway](https://railway.app)   | Cloud Run                              |
| **PostgreSQL** | [Supabase](https://supabase.com) | Cloud SQL                              |
| **Redis**      | [Upstash](https://upstash.com)   | Memorystore                            |

<br />

> The architecture is designed with GCP in mind for production. Cloud Run enables the same containerized Go service to be deployed with minimal configuration changes.
> <br />

## 🛑 The databases run locally using docker

You need to have installed Docker before running locally the app

</div>

### Run locally

1. Start Postgres + Redis:

   ```
   cd infra
   docker compose up -d
   ```

2. Start the Go GraphQL API:

   ```
   cd backend
   go mod tidy
   go run ./cmd/server
   ```

3. Start the Next.js frontend:

   ```
   cd frontend
   npm install next react react-dom
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` in the project root and customize the values.
