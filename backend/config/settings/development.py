"""
Development settings for Sports Academy Management System.
"""
from .base import *

DEBUG = True

# Additional development apps
INSTALLED_APPS += [
    # Add development-only apps here
]

# Development-specific middleware
MIDDLEWARE += [
    # Add development-only middleware here
]

# Allow all hosts in development
ALLOWED_HOSTS = ['*']

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True

# Email backend for development (console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Logging for development
LOGGING['root']['level'] = 'DEBUG'
