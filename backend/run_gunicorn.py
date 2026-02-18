#!/usr/bin/env python
"""
Gunicorn startup script for Sports Academy Management System.
"""
import sys
import os

if __name__ == '__main__':
    from gunicorn.app.wsgiapp import WSGIApplication
    
    sys.argv = ['gunicorn', 'config.wsgi:application', '--bind', '0.0.0.0:8000', 
                '--workers', '2', '--timeout', '120', '--access-logfile', '-', '--error-logfile', '-']
    
    app = WSGIApplication()
    app.run()
