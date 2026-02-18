"""
Service for Tenant Feedback.
"""
from django.utils import timezone
from tenant.communication.models import Feedback, FeedbackStatus


class FeedbackService:
    """Service for feedback operations."""
    
    @staticmethod
    def create_feedback(academy, parent, validated_data):
        """
        Create a new feedback.
        
        Args:
            academy: Academy instance
            parent: User instance (PARENT role)
            validated_data: Validated serializer data
            
        Returns:
            Feedback instance
        """
        feedback = Feedback.objects.create(
            academy=academy,
            parent=parent,
            student=validated_data.get('student'),
            subject=validated_data['subject'],
            message=validated_data['message'],
            priority=validated_data.get('priority', 'MEDIUM')
        )
        
        return feedback
    
    @staticmethod
    def update_feedback(feedback, validated_data):
        """
        Update a feedback.
        
        Args:
            feedback: Feedback instance
            validated_data: Validated serializer data
            
        Returns:
            Updated Feedback instance
        """
        for field, value in validated_data.items():
            setattr(feedback, field, value)
        
        # If status is RESOLVED and resolved_at is not set, set it
        if feedback.status == FeedbackStatus.RESOLVED and not feedback.resolved_at:
            feedback.resolved_at = timezone.now()
        
        feedback.save()
        return feedback
