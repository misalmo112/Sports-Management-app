#!/usr/bin/env python
"""
Test runner that works around the platform module naming conflict.
"""
import sys
import os
import importlib.util

# CRITICAL: Import standard library platform BEFORE anything else
# Store it in sys.modules with a key that won't conflict
_original_platform_path = None
for path in sys.path:
    if 'site-packages' not in path and 'lib' in path:
        _original_platform_path = path
        break

# Import standard library platform module directly
if _original_platform_path:
    _spec = importlib.util.spec_from_file_location(
        'platform',
        os.path.join(_original_platform_path, 'platform', '__init__.py')
    )
    if _spec and _spec.loader:
        _stdlib_platform = importlib.util.module_from_spec(_spec)
        sys.modules['_stdlib_platform'] = _stdlib_platform
        # Make sure standard library platform is available
        try:
            _spec.loader.exec_module(_stdlib_platform)
        except:
            pass

# Now import platform from standard library using importlib
try:
    import importlib
    # Force import of standard library platform
    _platform_spec = importlib.util.find_spec('platform')
    if _platform_spec and _platform_spec.origin:
        # Check if it's the standard library version (not our package)
        if 'site-packages' not in _platform_spec.origin and 'lib' in _platform_spec.origin:
            # This is the standard library - store it
            _stdlib_platform = importlib.import_module('platform')
            sys.modules['_stdlib_platform_backup'] = _stdlib_platform
except:
    pass

# Change to backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

# Temporarily rename platform package in sys.modules to avoid conflict
# We'll restore it after Django setup
_our_platform_backup = None
if 'platform' in sys.modules and hasattr(sys.modules['platform'], '__file__'):
    if sys.modules['platform'].__file__ and 'backend' in sys.modules['platform'].__file__:
        _our_platform_backup = sys.modules['platform']
        # Remove our platform from sys.modules temporarily
        del sys.modules['platform']

# Now set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.testing')

if __name__ == '__main__':
    import django
    django.setup()
    
    # Restore our platform package after Django setup
    if _our_platform_backup:
        sys.modules['platform'] = _our_platform_backup
    
    from django.core.management import execute_from_command_line
    # Run tests from central tests directory
    test_args = sys.argv[1:] if len(sys.argv) > 1 else [
        'tests.subscriptions',
        'tests.quotas', 
        'tests.tenants',
        'tests.audit',
        'tests.permissions'
    ]
    execute_from_command_line(['manage.py', 'test'] + test_args + ['--verbosity=2'])
