from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.students.views import ParentViewSet, StudentViewSet

router = DefaultRouter()
router.register(r'parents', ParentViewSet, basename='parent')
router.register(r'students', StudentViewSet, basename='student')

urlpatterns = [
    path('', include(router.urls)),
]
