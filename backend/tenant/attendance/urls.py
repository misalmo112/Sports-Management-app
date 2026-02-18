from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.attendance.views import AttendanceViewSet, CoachAttendanceViewSet

router = DefaultRouter()
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'coach-attendance', CoachAttendanceViewSet, basename='coach-attendance')

urlpatterns = [
    path('', include(router.urls)),
]
