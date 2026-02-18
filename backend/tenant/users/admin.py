"""
Django admin configuration for user models.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from tenant.users.models import User, AdminProfile, CoachProfile, ParentProfile, InviteToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model."""
    
    list_display = ['email', 'role', 'academy', 'is_active', 'is_verified', 'created_at']
    list_filter = ['role', 'is_active', 'is_verified', 'academy', 'created_at']
    search_fields = ['email', 'academy__name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Permissions', {'fields': ('is_active', 'is_verified', 'role', 'academy')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'academy'),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    """Admin interface for AdminProfile."""
    
    list_display = ['user', 'academy', 'is_active', 'created_at']
    list_filter = ['is_active', 'academy', 'created_at']
    search_fields = ['user__email', 'academy__name']
    raw_id_fields = ['user', 'academy']


@admin.register(CoachProfile)
class CoachProfileAdmin(admin.ModelAdmin):
    """Admin interface for CoachProfile."""
    
    list_display = ['user', 'academy', 'type', 'location', 'is_active', 'created_at']
    list_filter = ['is_active', 'academy', 'type', 'created_at']
    search_fields = ['user__email', 'academy__name', 'type']
    raw_id_fields = ['user', 'academy', 'location']


@admin.register(ParentProfile)
class ParentProfileAdmin(admin.ModelAdmin):
    """Admin interface for ParentProfile."""
    
    list_display = ['user', 'academy', 'phone', 'is_active', 'created_at']
    list_filter = ['is_active', 'academy', 'created_at']
    search_fields = ['user__email', 'academy__name', 'phone']
    raw_id_fields = ['user', 'academy']


@admin.register(InviteToken)
class InviteTokenAdmin(admin.ModelAdmin):
    """Admin interface for InviteToken."""
    
    list_display = ['user', 'academy', 'status', 'expires_at', 'used_at', 'created_at']
    list_filter = ['academy', 'expires_at', 'used_at', 'created_at']
    search_fields = ['user__email', 'academy__name']
    readonly_fields = ['token_hash', 'created_at', 'updated_at']
    raw_id_fields = ['user', 'academy', 'created_by']
    
    def status(self, obj):
        """Display token status."""
        if obj.used_at:
            return format_html('<span style="color: gray;">Used</span>')
        elif obj.is_expired():
            return format_html('<span style="color: red;">Expired</span>')
        else:
            return format_html('<span style="color: green;">Active</span>')
    status.short_description = 'Status'
