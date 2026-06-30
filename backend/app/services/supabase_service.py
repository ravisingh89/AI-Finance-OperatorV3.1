import os
import uuid
from app.config import settings

class SupabaseService:
    """
    Supabase Storage service with local fallback.
    If Supabase is unreachable, saves to /tmp instead.
    """

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                from supabase import create_client
                self._client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_KEY
                )
            except Exception as e:
                print(f"[WARN] Supabase client init failed: {e}")
        return self._client

    def upload_file(self, file_bytes: bytes, filename: str, user_id: str) -> str:
        """Upload to Supabase Storage. Falls back to /tmp on failure."""
        path = f"{user_id}/{uuid.uuid4()}_{filename}"
        try:
            client = self._get_client()
            if client:
                client.storage.from_("statements").upload(
                    path, file_bytes,
                    {"content-type": "application/octet-stream", "upsert": "true"}
                )
                url = client.storage.from_("statements").get_public_url(path)
                return url
        except Exception as e:
            print(f"[WARN] Supabase upload failed, using local fallback: {e}")

        # Local fallback — save to /tmp
        return self._save_local(file_bytes, filename)

    def download_file(self, url: str) -> bytes:
        """Download file. Handles both Supabase URLs and local /tmp paths."""
        # Local file path
        if url.startswith("/tmp/"):
            with open(url, "rb") as f:
                return f.read()

        # Supabase URL
        try:
            client = self._get_client()
            if client:
                path = url.split("/storage/v1/object/public/statements/")[-1]
                return client.storage.from_("statements").download(path)
        except Exception as e:
            print(f"[WARN] Supabase download failed: {e}")

        raise ValueError(f"Cannot download file from: {url}")

    def _save_local(self, file_bytes: bytes, filename: str) -> str:
        """Save file to /tmp as fallback."""
        os.makedirs("/tmp/statements", exist_ok=True)
        path = f"/tmp/statements/{uuid.uuid4()}_{filename}"
        with open(path, "wb") as f:
            f.write(file_bytes)
        print(f"[INFO] File saved locally: {path}")
        return path
