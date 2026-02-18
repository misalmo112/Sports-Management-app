#!/usr/bin/env python
"""
Celery startup script for Sports Academy Management System.
"""
import sys

if __name__ == '__main__':
    from celery.__main__ import main
    sys.exit(main())
