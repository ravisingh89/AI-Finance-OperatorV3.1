from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_ENV: str = "development"

    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str
    DATABASE_URL: str

    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str

    # Plain comma-separated string — no JSON arrays, no quotes needed
    # Example: https://ai-finance-operator.vercel.app,http://localhost:3000
    # Use * to allow all origins (easiest for initial setup)
    ALLOWED_ORIGINS_STR: str = "*"

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS_STR.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
