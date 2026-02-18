"""
Celery tasks for Sports Academy Management System.
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_invite_email(user_id, token):
    """
    Send invite email asynchronously.
    
    Args:
        user_id: User ID
        token: Plain text invite token
    """
    try:
        from tenant.users.models import User
        
        user = User.objects.select_related('academy').get(id=user_id)
        academy = user.academy
        
        # Generate invite URL (frontend URL + token)
        # In production, this should come from settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invite_url = f"{frontend_url}/auth/invite/accept?token={token}"
        
        # Calculate expiration time
        expiration_hours = getattr(settings, 'INVITE_TOKEN_EXPIRATION_HOURS', 48)
        
        # Email subject
        subject = f"Invitation to join {academy.name}"
        
        # Email body (plain text for now, can be HTML later)
        message = f"""
Hello,

You have been invited to join {academy.name} as a {user.get_role_display()}.

To accept this invitation and set your password, please click the link below:
{invite_url}

This invitation will expire in {expiration_hours} hours.

If you did not request this invitation, please ignore this email.

Best regards,
{academy.name} Team
"""
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        logger.info(f"Invite email sent to {user.email} for academy {academy.name}")
        return f"Email sent to {user.email}"
        
    except Exception as e:
        logger.error(f"Failed to send invite email to user {user_id}: {str(e)}")
        raise
