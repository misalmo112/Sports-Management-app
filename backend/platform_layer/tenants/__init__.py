# Platform tenants app

# #region agent log
import json
import sys
log_path = "/app/debug.log"
try:
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(json.dumps({"id":"log_tenants_init_1","timestamp":int(__import__('time').time()*1000),"location":"platform/tenants/__init__.py:3","message":"platform.tenants.__init__ executing","data":{"platform_in_sys_modules":"platform" in sys.modules,"platform_type":str(type(sys.modules.get('platform'))) if 'platform' in sys.modules else "not_found","hypothesisId":"A,D"},"sessionId":"debug-session","runId":"initial"}) + "\n")
except: pass
# #endregion