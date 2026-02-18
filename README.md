# Sports Academy Management System

A multi-tenant SaaS platform for managing sports academies and training centers.

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)

To verify your installation:

```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "The Sports App"
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and update the following critical variables:

- `SECRET_KEY` - Generate a secure Django secret key
- `JWT_SECRET_KEY` - Generate a secure JWT secret key
- `DB_PASSWORD` - Set a secure database password
- `MINIO_ROOT_PASSWORD` - Set a secure MinIO password

**Important:** Never commit the `.env` file to version control.

### 3. Start All Services

Start all services with a single command:

```bash
docker-compose up
```

To run in detached mode (background):

```bash
docker-compose up -d
```

### 4. Run Database Migrations

After the services are running, apply database migrations:

```bash
docker-compose exec backend python manage.py migrate
```

### 5. Create a Superuser

Create the initial superadmin user:

```bash
docker-compose exec backend python manage.py createsuperuser
```

Follow the prompts to create your superadmin account.

## Service URLs

Once all services are running, you can access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs/ (when implemented)
- **MinIO Console**: http://localhost:9001
  - Credentials: set `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` in `.env` (MinIO image default for local dev only: minioadmin/minioadmin)

## Common Commands

### Starting and Stopping Services

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs celery-worker
```

### Database Operations

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create migrations
docker-compose exec backend python manage.py makemigrations

# Access Django shell
docker-compose exec backend python manage.py shell

# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d sports_academy_dev
```

### User Management

```bash
# Create superuser
docker-compose exec backend python manage.py createsuperuser

# List users (via Django shell)
docker-compose exec backend python manage.py shell
```

### Static Files and Media

```bash
# Collect static files
docker-compose exec backend python manage.py collectstatic

# Clear media files (if needed)
docker-compose exec backend python manage.py shell
```

### Service Management

```bash
# Restart a specific service
docker-compose restart backend

# Rebuild a service after code changes
docker-compose up --build backend

# View service status
docker-compose ps

# Execute command in running container
docker-compose exec backend <command>
docker-compose exec frontend <command>
```

## Development Workflow

### Backend Development

1. Make changes to Django code in `backend/` directory
2. Changes are automatically reflected (volume mounted)
3. For new dependencies, update `backend/requirements.txt` and rebuild:
   ```bash
   docker-compose up --build backend
   ```

### Frontend Development

1. Make changes to React code in `frontend/` directory
2. Vite hot-reload automatically reflects changes
3. For new dependencies, update `frontend/package.json` and rebuild:
   ```bash
   docker-compose up --build frontend
   ```

## For AI Agents

### Running the System

All agents must follow these rules:

1. **System Must Boot Successfully**: No agent may write code unless `docker-compose up` runs successfully
2. **Single Command Start**: All services must start with one command: `docker-compose up`
3. **Environment Variables Only**: All configuration must use environment variables (no hardcoded values)
4. **No Local Storage**: Never use local filesystem storage for uploads - always use MinIO/S3
5. **Docker File Restrictions**: No agent may modify Docker files outside Phase 0 or Phase 6

### Agent Workflow

1. **Before Starting Work**:
   ```bash
   docker-compose up -d
   docker-compose ps  # Verify all services are running
   ```

2. **During Development**:
   - Make code changes in respective directories
   - Changes are automatically reflected (hot-reload)
   - Test changes via service URLs

3. **After Completing Work**:
   ```bash
   docker-compose down  # Stop services
   ```

### Testing Agent Changes

1. Start services: `docker-compose up -d`
2. Verify services are healthy: `docker-compose ps`
3. Check logs if issues: `docker-compose logs <service>`
4. Test your changes via the service URLs
5. Stop services when done: `docker-compose down`

## Troubleshooting

### Services Won't Start

1. **Check Docker is running**: `docker ps`
2. **Check port conflicts**: Ensure ports 8000, 5173, 5432, 6379, 9000, 9001 are available
3. **Check environment variables**: Verify `.env` file exists and has required values
4. **View logs**: `docker-compose logs` to see error messages

### Database Connection Issues

1. **Wait for postgres to be healthy**: `docker-compose ps` should show postgres as healthy
2. **Check DATABASE_URL**: Verify it matches docker-compose service name (`postgres`)
3. **Reset database** (WARNING: deletes data):
   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   # Wait for postgres to be healthy
   docker-compose up -d
   ```

### Frontend Can't Connect to Backend

1. **Check VITE_API_BASE_URL**: Should be `http://localhost:8000/api/v1`
2. **Check CORS settings**: Verify `CORS_ALLOWED_ORIGINS` includes frontend URL
3. **Check backend is running**: `docker-compose ps backend`

### MinIO Connection Issues

1. **Check MinIO is running**: `docker-compose ps minio`
2. **Access MinIO console**: http://localhost:9001
3. **Create bucket manually** if needed: Use MinIO console
4. **Verify credentials**: Check `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` in `.env`

### Celery Worker Issues

1. **Check Redis is running**: `docker-compose ps redis`
2. **Check Celery logs**: `docker-compose logs celery-worker`
3. **Verify CELERY_BROKER_URL**: Should point to Redis service

### Permission Errors

1. **Check file permissions**: Ensure Docker has access to project directories
2. **Rebuild containers**: `docker-compose up --build`
3. **Clear Docker cache**: `docker system prune -a` (use with caution)

## Project Structure

```
.
├── backend/              # Django backend application
│   ├── config/          # Django project settings
│   ├── platform/       # Platform layer apps
│   ├── tenant/          # Tenant layer apps
│   ├── shared/          # Shared utilities
│   └── Dockerfile       # Backend container definition
├── frontend/            # React/Vite frontend application
│   ├── src/            # Source code
│   └── Dockerfile      # Frontend container definition
├── docs/                # Architecture and API documentation
├── docker-compose.yml   # Development environment configuration
├── .env.example         # Environment variables template
└── README.md           # This file
```

## Architecture

This is a multi-tenant SaaS platform with strict separation between:

- **Platform Layer**: Superadmin operations, tenant management, subscriptions, quotas
- **Tenant Layer**: Academy-specific operations (students, classes, coaches, etc.)

See `docs/ARCHITECTURE.md` for detailed architecture documentation.

## Environment Variables

All configuration is done via environment variables. See `.env.example` for all available variables and `docs/ENV_CONTRACT.md` for detailed documentation.

## Additional Resources

- **Architecture**: `docs/ARCHITECTURE.md`
- **API Conventions**: `docs/API_CONVENTIONS.md`
- **Permissions**: `docs/PERMISSIONS.md`
- **Environment Variables**: `docs/ENV_CONTRACT.md`
- **Agent Context**: `AGENT_CONTEXT.md`

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review service logs: `docker-compose logs <service>`
3. Verify environment variables match `.env.example`
4. Check that all services are healthy: `docker-compose ps`

## License

[Add license information here]
