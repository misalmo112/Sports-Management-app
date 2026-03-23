#!/usr/bin/env python
"""
Gunicorn startup script for Sports Academy Management System.
"""
import sys
import os

if __name__ == '__main__':
    from gunicorn.app.wsgiapp import WSGIApplication

    debug = os.getenv('DEBUG', '').lower() in ('true', '1', 'yes')
    env = os.getenv('ENVIRONMENT', '').lower()
    # Dev: reload workers when code changes (Docker bind-mount). Prod: multi-worker, no reload.
    use_reload = debug or env == 'development'
    workers = '1' if use_reload else '2'
    argv = [
        'gunicorn',
        'config.wsgi:application',
        '--bind',
        '0.0.0.0:8000',
        '--workers',
        workers,
        '--timeout',
        '120',
        '--access-logfile',
        '-',
        '--error-logfile',
        '-',
    ]
    if use_reload:
        argv.append('--reload')

    sys.argv = argv

    app = WSGIApplication()
    app.run()
