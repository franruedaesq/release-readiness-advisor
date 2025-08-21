# 🚀 Release Readiness Advisor

### An AI-driven, multi-agent system for DevOps that analyzes release artifacts to produce a risk score and deployment plan, complete with deep MLOps and DevOps observability.

---

## 🔗 Live Demo

- **Frontend UI (Vercel):** `https://release-readiness-advisor-ui.vercel.app`
- **Grafana Dashboards (EC2):** `http://54.242.153.126:3000` (Login: admin/bygzyv-teTfyd-7kohme)

---

## 📖 Project Overview

The Release Readiness Advisor is an end-to-end MLOps project that simulates an AI-powered "final check" before a software deployment. It uses a multi-agent system built with **LangGraph** to reason over build artifacts (test reports, security scans, etc.) retrieved via a RAG pipeline.

The system not only provides a qualitative analysis but also quantifies its own performance by tracking and visualizing both traditional DevOps metrics (like CI duration) and MLOps metrics (like LLM cost and token usage) in a unified Grafana dashboard.

---

## ✨ Key Features

- **AI-Powered Risk Scoring:** Uses an LLM to analyze build reports and assign a dynamic risk score (0-100).
- **Multi-Agent System (LangGraph):** A stateful graph orchestrates specialized agents for risk analysis, deployment planning, and report generation.
- **RAG Pipeline:** Fetches build artifacts from GitHub Actions and indexes them in a ChromaDB vector store for retrieval.
- **Deep Observability:** Captures and visualizes dozens of metrics, including:
  - **Agent & LLM Metrics:** Invocations, duration, token usage, and cost.
  - **CI/CD Pipeline Metrics:** Build duration, test failure rates.
  - **RAG Metrics:** Retrieval latency and quality scores.
- **Automated CI/CD:** The entire application is automatically deployed to AWS EC2 using a GitHub Actions workflow that builds and pushes the backend Docker image to ECR.
- **Infrastructure as Code (IaC):** The complete cloud infrastructure (EC2, S3, ECR, IAM Roles) is managed declaratively with Terraform.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js, TypeScript, Shadcn/ui, Vercel
- **Backend:** NestJS, TypeScript
- **AI/ML:** LangChain.js, LangGraph, OpenAI, ChromaDB
- **Observability:** Prometheus, Grafana
- **Infrastructure:** AWS (EC2, S3, ECR, IAM), Terraform
- **Automation:** Docker, GitHub Actions

---

## ⚙️ Running Locally

1.  Clone the repository.
2.  Set up your `.env` file in `apps/backend/` with the required API keys (`OPENAI_API_KEY`, `GITHUB_TOKEN`, etc.).
3.  Run `pnpm install` at the root.
4.  Start the infrastructure services: `docker-compose up -d`.
5.  Start the backend dev server: `cd apps/backend && pnpm start:dev`.
6.  Start the frontend dev server: `cd apps/ui && pnpm dev`.
