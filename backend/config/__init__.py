"""
Django project initialization.
"""
# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
try:
    from celery_app.celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    # Celery not installed, skip initialization
    celery_app = None
    __all__ = ()
