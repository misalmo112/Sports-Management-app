# Multi-stage Dockerfile for Django Backend
# Python 3.11+ with Gunicorn, Cloud Run compatible

# Base stage with Python
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for runtime containers
RUN groupadd --system app && useradd --system --gid app --create-home app

# Set work directory
WORKDIR /app

# Set PYTHONPATH to ensure sitecustomize.py is found
ENV PYTHONPATH=/app

# Dependencies stage
FROM base as dependencies

# Copy requirements file
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Application stage
FROM dependencies as application

# Copy application code
COPY . /app/

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Entrypoint (runs migrations, then execs CMD)
RUN chmod +x /app/entrypoint.sh

# Ensure runtime user can access app directory
RUN chown -R app:app /app

# Collect static files (can be overridden in docker-compose)
RUN python manage.py collectstatic --noinput || true

# Production stage
FROM application as production

# Expose port
EXPOSE 8000

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run Gunicorn via wrapper script (fixes platform module naming conflict)
CMD ["python", "run_gunicorn.py"]

# Development stage (default)
FROM application as development

# Install development dependencies if needed
# RUN pip install -r requirements-dev.txt || true

# Expose port
EXPOSE 8000

USER app

# Run development server (can be overridden in docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
