"""
Celery configuration for Sports Academy Management System.
"""
import os
from celery import Celery

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('sports_academy')

# Load configuration from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# Belt-and-suspenders: ensure staff pay tasks are registered (worker must know
# tenant.coaches.tasks.* names used by beat and .delay()).
import importlib

importlib.import_module('tenant.coaches.tasks')

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
