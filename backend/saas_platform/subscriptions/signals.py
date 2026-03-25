from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from saas_platform.subscriptions.models import Subscription
from saas_platform.quotas.services import QuotaService


@receiver(pre_save, sender=Subscription)
def subscription_pre_save(sender, instance, **kwargs):
    """Handle subscription pre-save logic."""
    if instance.pk:  # Existing instance
        try:
            old_instance = Subscription.objects.get(pk=instance.pk)
            # If is_current is changing from False to True, mark old subscription as not current
            if instance.is_current and not old_instance.is_current:
                # Mark other current subscription as not current
                Subscription.objects.filter(
                    academy=instance.academy,
                    is_current=True
                ).exclude(pk=instance.pk).update(is_current=False)
        except Subscription.DoesNotExist:
            pass
    else:  # New instance
        # If this is a new current subscription, mark old one as not current
        if instance.is_current:
            Subscription.objects.filter(
                academy=instance.academy,
                is_current=True
            ).update(is_current=False)


@receiver(post_save, sender=Subscription)
def subscription_post_save(sender, instance, created, **kwargs):
    """Update TenantQuota when subscription is created or updated."""
    QuotaService.invalidate_quota_cache(instance.academy_id)
    if instance.is_current:
        QuotaService.update_tenant_quota(instance.academy)
