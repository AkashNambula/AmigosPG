import os
import shutil
from typing import Optional, Tuple
from app.core.config import settings

class BaseStorageBackend:
    def save_file(self, contents: bytes, object_key: str) -> str:
        raise NotImplementedError
        
    def get_file(self, object_key: str) -> Optional[bytes]:
        raise NotImplementedError
        
    def delete_file(self, object_key: str) -> bool:
        raise NotImplementedError
        
    def file_exists(self, object_key: str) -> bool:
        raise NotImplementedError
        
    def get_file_path(self, object_key: str) -> Optional[str]:
        raise NotImplementedError


class LocalStorageBackend(BaseStorageBackend):
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = os.path.abspath(base_dir or settings.UPLOAD_DIR)

    def _full_path(self, object_key: str) -> str:
        # Clean object key to avoid path traversal
        clean_key = object_key.lstrip("/").replace("\\", "/")
        if clean_key.startswith("uploads/"):
            clean_key = clean_key[8:]
        return os.path.normpath(os.path.join(self.base_dir, clean_key))

    def save_file(self, contents: bytes, object_key: str) -> str:
        full_path = self._full_path(object_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(contents)
        return object_key

    def get_file(self, object_key: str) -> Optional[bytes]:
        full_path = self._full_path(object_key)
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return None
        with open(full_path, "rb") as f:
            return f.read()

    def delete_file(self, object_key: str) -> bool:
        full_path = self._full_path(object_key)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            os.remove(full_path)
            return True
        return False

    def file_exists(self, object_key: str) -> bool:
        full_path = self._full_path(object_key)
        return os.path.exists(full_path) and os.path.isfile(full_path)

    def get_file_path(self, object_key: str) -> Optional[str]:
        full_path = self._full_path(object_key)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return full_path
        return None


class S3StorageBackend(BaseStorageBackend):
    def __init__(self):
        try:
            import boto3
            self.boto3 = boto3
        except ImportError:
            self.boto3 = None
        self.bucket = getattr(settings, "S3_BUCKET_NAME", "amigos-pg-uploads")
        self.region = getattr(settings, "S3_REGION", "us-east-1")
        self.endpoint_url = getattr(settings, "S3_ENDPOINT_URL", None)
        self.access_key = getattr(settings, "S3_ACCESS_KEY_ID", None)
        self.secret_key = getattr(settings, "S3_SECRET_ACCESS_KEY", None)

    def _get_client(self):
        if not self.boto3:
            raise RuntimeError("boto3 package is required for S3StorageBackend. Please install boto3.")
        kwargs = {
            "service_name": "s3",
            "region_name": self.region,
        }
        if self.endpoint_url:
            kwargs["endpoint_url"] = self.endpoint_url
        if self.access_key and self.secret_key:
            kwargs["aws_access_key_id"] = self.access_key
            kwargs["aws_secret_access_key"] = self.secret_key
        return self.boto3.client(**kwargs)

    def save_file(self, contents: bytes, object_key: str) -> str:
        s3 = self._get_client()
        clean_key = object_key.lstrip("/").replace("\\", "/")
        s3.put_object(Bucket=self.bucket, Key=clean_key, Body=contents)
        return clean_key

    def get_file(self, object_key: str) -> Optional[bytes]:
        s3 = self._get_client()
        clean_key = object_key.lstrip("/").replace("\\", "/")
        try:
            res = s3.get_object(Bucket=self.bucket, Key=clean_key)
            return res["Body"].read()
        except Exception:
            return None

    def delete_file(self, object_key: str) -> bool:
        s3 = self._get_client()
        clean_key = object_key.lstrip("/").replace("\\", "/")
        try:
            s3.delete_object(Bucket=self.bucket, Key=clean_key)
            return True
        except Exception:
            return False

    def file_exists(self, object_key: str) -> bool:
        s3 = self._get_client()
        clean_key = object_key.lstrip("/").replace("\\", "/")
        try:
            s3.head_object(Bucket=self.bucket, Key=clean_key)
            return True
        except Exception:
            return False

    def get_file_path(self, object_key: str) -> Optional[str]:
        return None


def get_storage_service() -> BaseStorageBackend:
    backend_type = str(getattr(settings, "STORAGE_BACKEND", "local")).lower()
    if backend_type == "s3":
        return S3StorageBackend()
    return LocalStorageBackend()

storage_service = get_storage_service()
