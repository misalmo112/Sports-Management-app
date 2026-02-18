from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.classes.views import ClassViewSet, EnrollmentViewSet

router = DefaultRouter()
router.register(r'classes', ClassViewSet, basename='class')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')

urlpatterns = [
    path('', include(router.urls)),
]
