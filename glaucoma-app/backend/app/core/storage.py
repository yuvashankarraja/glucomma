import os
import shutil
from abc import ABC, abstractmethod

class StorageProvider(ABC):
    @abstractmethod
    def upload_file(self, file_path: str, destination_path: str) -> str:
        """
        Uploads a local file to the storage provider.
        Returns the public/accessible URL of the uploaded file.
        """
        pass

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_url: str = "/uploads"):
        self.base_url = base_url

    def upload_file(self, file_path: str, destination_path: str) -> str:
        # For local, destination_path is relative to the uploads root directory
        # e.g., 'original/some-uuid.jpg'
        uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
        full_dest_path = os.path.join(uploads_dir, destination_path)
        os.makedirs(os.path.dirname(full_dest_path), exist_ok=True)
        
        # If it's not already at the destination, copy it
        if os.path.abspath(file_path) != os.path.abspath(full_dest_path):
            shutil.copy2(file_path, full_dest_path)
            
        # Return the relative URL path
        return f"{self.base_url}/{destination_path.replace(os.sep, '/')}"

class S3StorageProvider(StorageProvider):
    def __init__(self):
        self.bucket = os.getenv("AWS_S3_BUCKET", "glaucoma-scans")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.local_fallback = LocalStorageProvider()
        
        try:
            import boto3
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
            )
            self.initialized = True
        except Exception as e:
            print(f"AWS S3 Initialization Warning: {e}. Falling back to Local Storage.")
            self.initialized = False

    def upload_file(self, file_path: str, destination_path: str) -> str:
        if not self.initialized:
            return self.local_fallback.upload_file(file_path, destination_path)
            
        try:
            self.s3_client.upload_file(
                file_path, self.bucket, destination_path,
                ExtraArgs={"ACL": "public-read"}
            )
            return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{destination_path}"
        except Exception as e:
            print(f"AWS S3 Upload Error: {e}. Falling back to Local Storage.")
            return self.local_fallback.upload_file(file_path, destination_path)

class AzureStorageProvider(StorageProvider):
    def __init__(self):
        self.connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER", "glaucoma")
        self.local_fallback = LocalStorageProvider()
        self.initialized = False
        
        if self.connection_string:
            try:
                from azure.storage.blob import BlobServiceClient
                self.blob_service_client = BlobServiceClient.from_connection_string(self.connection_string)
                self.initialized = True
            except Exception as e:
                print(f"Azure Blob Storage Initialization Warning: {e}. Falling back to Local Storage.")

    def upload_file(self, file_path: str, destination_path: str) -> str:
        if not self.initialized:
            return self.local_fallback.upload_file(file_path, destination_path)
            
        try:
            blob_client = self.blob_service_client.get_blob_client(container=self.container_name, blob=destination_path)
            with open(file_path, "rb") as data:
                blob_client.upload_blob(data, overwrite=True)
            return blob_client.url
        except Exception as e:
            print(f"Azure Blob Storage Upload Error: {e}. Falling back to Local Storage.")
            return self.local_fallback.upload_file(file_path, destination_path)

class GoogleCloudStorageProvider(StorageProvider):
    def __init__(self):
        self.bucket_name = os.getenv("GCS_BUCKET_NAME", "glaucoma-detection-bucket")
        self.local_fallback = LocalStorageProvider()
        self.initialized = False
        
        gcs_credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if gcs_credentials:
            try:
                from google.cloud import storage
                self.storage_client = storage.Client()
                self.initialized = True
            except Exception as e:
                print(f"Google Cloud Storage Initialization Warning: {e}. Falling back to Local Storage.")

    def upload_file(self, file_path: str, destination_path: str) -> str:
        if not self.initialized:
            return self.local_fallback.upload_file(file_path, destination_path)
            
        try:
            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(destination_path)
            blob.upload_from_filename(file_path)
            blob.make_public()
            return blob.public_url
        except Exception as e:
            print(f"GCS Upload Error: {e}. Falling back to Local Storage.")
            return self.local_fallback.upload_file(file_path, destination_path)

class SupabaseStorageProvider(StorageProvider):
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.bucket_name = os.getenv("SUPABASE_BUCKET", "glaucoma")
        self.local_fallback = LocalStorageProvider()
        self.initialized = False
        
        if self.supabase_url and self.supabase_key:
            try:
                from supabase import create_client
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                self.initialized = True
            except Exception as e:
                print(f"Supabase Storage Initialization Warning: {e}. Falling back to Local Storage.")

    def upload_file(self, file_path: str, destination_path: str) -> str:
        if not self.initialized:
            return self.local_fallback.upload_file(file_path, destination_path)
            
        try:
            # Upload file to supabase storage bucket
            with open(file_path, "rb") as f:
                res = self.supabase.storage.from_(self.bucket_name).upload(
                    destination_path, f, {"x-upsert": "true"}
                )
            # Retrieve public URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(destination_path)
            return public_url
        except Exception as e:
            print(f"Supabase Storage Upload Error: {e}. Falling back to Local Storage.")
            return self.local_fallback.upload_file(file_path, destination_path)

def get_storage_provider() -> StorageProvider:
    provider_type = os.getenv("STORAGE_PROVIDER", "local").lower()
    
    if provider_type == "s3":
        return S3StorageProvider()
    elif provider_type == "azure":
        return AzureStorageProvider()
    elif provider_type == "gcs":
        return GoogleCloudStorageProvider()
    elif provider_type == "supabase":
        return SupabaseStorageProvider()
    else:
        return LocalStorageProvider()

# Singleton storage provider instance
storage_provider = get_storage_provider()
