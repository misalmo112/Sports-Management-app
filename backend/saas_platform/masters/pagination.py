"""
Pagination for platform masters (currencies, timezones).
Allows clients to request a large page_size for dropdowns (e.g. all timezones).
"""
from rest_framework.pagination import PageNumberPagination


class MastersListPagination(PageNumberPagination):
    """Default page size 20; client may request up to 2000 for full list (e.g. dropdowns)."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 2000
