from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas_platform.tenants.views import AcademyViewSet

router = DefaultRouter()
router.register(r'academies', AcademyViewSet, basename='academy')

urlpatterns = [
    path('', include(router.urls)),
]
