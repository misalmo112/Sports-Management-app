from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.media.views import MediaFileViewSet

router = DefaultRouter()
router.register(r'media', MediaFileViewSet, basename='media')

urlpatterns = [
    path('', include(router.urls)),
]
