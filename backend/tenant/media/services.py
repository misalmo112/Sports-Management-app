"""
Storage service for S3/MinIO operations.
"""
import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
from django.core.files.uploadedfile import UploadedFile

try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    ClientError = Exception

from tenant.media.models import MediaFile


class MediaService:
    """Service for media file operations with S3/MinIO."""
    
    @staticmethod
    def _get_storage():
        """Get the configured storage backend."""
        return default_storage
    
    @staticmethod
    def _ensure_bucket_exists():
        """Ensure S3 bucket exists, create if it doesn't."""
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        if not bucket_name:
            return
        
        # Only create bucket if using S3/MinIO
        if not hasattr(settings, 'AWS_S3_ENDPOINT_URL'):
            return
        
        if not BOTO3_AVAILABLE:
            return
        
        try:
            s3_client = boto3.client(
                's3',
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
                use_ssl=getattr(settings, 'AWS_S3_USE_SSL', False)
            )
            
            # Check if bucket exists
            try:
                s3_client.head_bucket(Bucket=bucket_name)
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code == '404':
                    # Bucket doesn't exist, create it
                    s3_client.create_bucket(Bucket=bucket_name)
        except Exception:
            # If bucket creation fails, continue - will fail on upload
            pass
    
    @staticmethod
    def _generate_file_path(academy, file_name):
        """
        Generate unique file path for S3 storage.
        
        Pattern: {academy_id}/{year}/{month}/{uuid}-{filename}
        """
        import uuid as uuid_lib
        now = timezone.now()
        file_uuid = str(uuid_lib.uuid4())  # Generate UUID
        # Clean filename - remove path separators
        safe_filename = os.path.basename(file_name)
        return f"{academy.id}/{now.year:04d}/{now.month:02d}/{file_uuid}-{safe_filename}"
    
    @staticmethod
    def upload_file(academy, file: UploadedFile, description: str = None, class_obj=None):
        """
        Upload file to S3/MinIO and create MediaFile record.
        
        Args:
            academy: Academy instance
            file: Django UploadedFile
            description: Optional description
            class_obj: Optional Class instance to associate with media
        
        Returns:
            MediaFile instance
        """
        # Ensure bucket exists
        MediaService._ensure_bucket_exists()
        
        # Generate file path
        file_path = MediaService._generate_file_path(academy, file.name)
        
        # Upload to S3
        storage = MediaService._get_storage()
        stored_path = storage.save(file_path, file)
        
        # Get file size (may differ from file.size if storage modified it)
        try:
            file_size = storage.size(stored_path)
        except Exception:
            file_size = file.size
        
        # Get MIME type
        mime_type = getattr(file, 'content_type', '')
        if not mime_type:
            import mimetypes
            mime_type, _ = mimetypes.guess_type(file.name)
            mime_type = mime_type or ''
        
        # Create MediaFile record
        media_file = MediaFile.objects.create(
            academy=academy,
            class_obj=class_obj,
            file_name=os.path.basename(file.name),
            file_path=stored_path,
            file_size=file_size,
            mime_type=mime_type,
            description=description or ''
        )
        
        return media_file
    
    @staticmethod
    def delete_file(media_file: MediaFile):
        """
        Delete file from S3/MinIO and database.
        
        Args:
            media_file: MediaFile instance
        """
        storage = MediaService._get_storage()
        
        # Delete from S3
        try:
            if storage.exists(media_file.file_path):
                storage.delete(media_file.file_path)
        except Exception:
            # If deletion fails, still delete DB record
            pass
        
        # Delete database record
        media_file.delete()
    
    @staticmethod
    def get_file_url(media_file: MediaFile, expires_in: int = 3600):
        """
        Generate file URL (signed URL for private files, public URL otherwise).
        
        Args:
            media_file: MediaFile instance
            expires_in: URL expiration time in seconds (for signed URLs)
        
        Returns:
            File URL string
        """
        storage = MediaService._get_storage()
        
        # Check if storage supports URL generation
        if hasattr(storage, 'url'):
            try:
                # Try to get public URL
                return storage.url(media_file.file_path)
            except Exception:
                pass
        
        # For private files, generate signed URL
        if BOTO3_AVAILABLE and hasattr(storage, 'bucket_name') and hasattr(settings, 'AWS_S3_ENDPOINT_URL'):
            try:
                s3_client = boto3.client(
                    's3',
                    endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                    aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                    aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
                    use_ssl=getattr(settings, 'AWS_S3_USE_SSL', False)
                )
                
                bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
                if bucket_name:
                    url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': bucket_name, 'Key': media_file.file_path},
                        ExpiresIn=expires_in
                    )
                    return url
            except Exception:
                pass
        
        # Fallback: construct URL manually
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')
        endpoint_url = getattr(settings, 'AWS_S3_ENDPOINT_URL', '')
        if endpoint_url and bucket_name:
            # Remove trailing slash from endpoint
            endpoint_url = endpoint_url.rstrip('/')
            return f"{endpoint_url}/{bucket_name}/{media_file.file_path}"
        
        # Last resort: return file path
        return media_file.file_path
