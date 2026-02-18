PROJECT CONTEXT DOCUMENT
Sports Academy Management System (SaaS)

Document Type: Agent Context / System Constitution
Audience: All AI Agents (Backend, Frontend, DevOps, Integrator)
Read Order: MUST be read before any task execution
Status: Canonical Source of Truth

1. Project Identity
Project Name

Sports Academy Management System (SaaS)

Project Type

Multi-tenant SaaS platform for managing sports academies and training centers.

Primary Goal

Enable the platform owner (Superadmin) to onboard and manage multiple independent academies, each with their own users, data, billing, storage limits, and operations.

2. Execution Model (Critical)
Development Style

Agent-based parallel execution

Each agent owns a bounded context

No cross-agent file modification

All merges performed by Integrator Agent

Architecture Rule

Platform layer and Tenant layer MUST NEVER MIX

3. SaaS Mental Model (Read Carefully)
Platform Layer (Global)

Superadmin

Plans & subscriptions

Tenant creation

Quotas & usage

System analytics

Tenant Layer (Academy)

Academy-specific data

Students, classes, coaches, parents

Attendance, billing, reports

Fully isolated via academy_id

🚫 Platform models MUST NOT contain tenant business logic
🚫 Tenant models MUST NOT access platform-wide data

4. Multi-Tenancy Rules (Non-Negotiable)

Single Database

Row-level isolation via academy_id

Every tenant model:

Has academy = ForeignKey(Academy)

Is filtered by request.academy

Superadmin bypass allowed ONLY for read/management purposes

No hardcoded academy IDs

No cross-tenant joins

5. User Roles & Authority
Roles

SUPERADMIN – platform owner

OWNER – owns one or more academies

ADMIN – manages one academy

COACH – assigned classes only

PARENT – own children only

STUDENT – non-auth entity

Authority Rules

Only Superadmin can create academies

Only onboarded academies can operate

Role checks are mandatory at API level

UI restrictions alone are insufficient

6. Onboarding Wizard (Critical Concept)
Purpose

Ensure all mandatory tenant reference data exists before normal operations.

Blocking Rule

If Academy.onboarding_completed == false,
then ALL tenant APIs except onboarding endpoints are blocked.

Mandatory Outputs

Academy profile

At least one location

At least one sport

At least one age category

At least one term

Pricing items & durations

7. Subscription, Pricing & Quotas
Subscription Model

One subscription per academy

Seat-based admin pricing supported

Trial period allowed

Quotas

Storage (bytes)

Students

Coaches

Admins

Classes

Enforcement

Enforced at API level

No soft warnings beyond 100%

Uploads blocked when storage exceeded

8. Storage & Media Rules

No local filesystem storage

Use S3-compatible interface (MinIO locally)

Media tracked via MediaFile model

TenantUsage.storage_used_bytes must always be accurate

9. Technology Stack (Fixed)
Backend

Django + Django REST Framework

PostgreSQL

Redis + Celery

JWT Authentication

Docker

Frontend

React + Vite

TanStack Query

Tailwind / shadcn

Role-based routing

Cloud (Target)

Google Cloud Run

Cloud SQL

Cloud Storage

Memorystore (Redis)

10. Coding Rules (Mandatory)
Backend

Fat models, thin views

Business logic in services

Serializers validate everything

No silent failures

All endpoints require permission classes

Frontend

No business logic duplication

Role-based navigation

Wizard state persisted

API failures handled explicitly

11. Testing Rules

Unit tests per app

Tenant isolation tests mandatory

Quota enforcement tests mandatory

Onboarding wizard tests mandatory

12. Documentation Rules

Every agent must output:

What was created

Files touched

API contracts (if any)

Assumptions made

13. What This Project Is NOT

Not a monolith without isolation

Not a single-academy app

Not hardcoded for localhost

Not Stripe-dependent (yet)

Not mobile-first (yet)

14. Agent Success Criteria

An agent is successful if:

No tenant isolation violations

No scope creep

Contracts respected

Tests pass

Integrator accepts merge

15. Final Instruction to Agents

If you are unsure about a decision, DO NOT guess.
Ask for clarification or leave TODO notes.

16. Docker & Infrastructure Rules (Non-Negotiable)

Docker Requirements

No agent may write code unless docker-compose runs successfully.

Before starting any development work, agents MUST:

Run docker-compose up -d

Verify all services are healthy: docker-compose ps

Only proceed if all services start without errors

Docker File Modification Restrictions

No agent may modify Docker files outside Phase 0 or Phase 6.

Protected files (DO NOT MODIFY unless explicitly in Phase 0 or Phase 6):

docker-compose.yml

backend/Dockerfile

frontend/Dockerfile

frontend/nginx.conf

Service Startup Requirements

All services must start with one command: docker-compose up

No manual service startup required

No hardcoded configuration values

All configuration via environment variables only

Storage Requirements

No local filesystem storage for uploads.

All file uploads MUST use MinIO (development) or S3/Cloud Storage (production)

Media files tracked via MediaFile model

TenantUsage.storage_used_bytes must always be accurate

Never use Django's default FileField storage

Environment Variable Contract

All configuration MUST use environment variables.

No hardcoded values in code

Use .env.example as reference

All variables documented in docs/ENV_CONTRACT.md

Agent Workflow

1. Start system: docker-compose up -d

2. Verify health: docker-compose ps

3. Develop code changes

4. Test changes via service URLs

5. Stop system: docker-compose down

Validation

Before marking work complete, agent MUST verify:

docker-compose config validates successfully

All services start without errors

No hardcoded values in Docker files

All volumes are named (not anonymous)