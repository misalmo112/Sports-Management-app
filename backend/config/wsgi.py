"""
WSGI config for Sports Academy Management System.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
import sys

# #region agent log
import json
log_path = "/app/debug.log"
try:
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(json.dumps({"id":"log_wsgi_1","timestamp":int(__import__('time').time()*1000),"location":"config/wsgi.py:13","message":"Before Django setup","data":{"platform_in_sys_modules":"platform" in sys.modules,"platform_type":str(type(sys.modules.get('platform'))) if 'platform' in sys.modules else "not_found","platform_has_tenants":hasattr(sys.modules.get('platform'),'tenants') if 'platform' in sys.modules else False,"hypothesisId":"A,D"},"sessionId":"debug-session","runId":"initial"}) + "\n")
except: pass
# #endregion

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

# #region agent log
try:
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(json.dumps({"id":"log_wsgi_2","timestamp":int(__import__('time').time()*1000),"location":"config/wsgi.py:22","message":"Before get_wsgi_application","data":{"hypothesisId":"A,C,D"},"sessionId":"debug-session","runId":"initial"}) + "\n")
except: pass
# #endregion

application = get_wsgi_application()
