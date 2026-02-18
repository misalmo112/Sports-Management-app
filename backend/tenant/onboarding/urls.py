"""
URL configuration for onboarding wizard.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.onboarding import views

app_name = 'onboarding'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'locations', views.LocationViewSet, basename='location')
router.register(r'sports', views.SportViewSet, basename='sport')
router.register(r'age-categories', views.AgeCategoryViewSet, basename='age-category')
router.register(r'terms', views.TermViewSet, basename='term')

urlpatterns = [
    path('onboarding/state/', views.get_onboarding_state, name='onboarding-state'),
    path('onboarding/step/<int:step>/', views.process_step, name='onboarding-step'),
    path('onboarding/complete/', views.complete_onboarding, name='onboarding-complete'),
    # Include router URLs
    path('', include(router.urls)),
]
