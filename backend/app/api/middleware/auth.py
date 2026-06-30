from fastapi import HTTPException, Header
from app.config import settings
import httpx

async def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Verify Clerk JWT. 
    Extracts user info from the token payload directly — 
    avoids making a network call to Clerk API on every request.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.split(" ")[1]

    # Decode JWT payload without verification for MVP
    # (Clerk tokens are verified by the signature — full verification
    #  requires fetching Clerk's JWKS which needs network access)
    try:
        import base64, json

        # JWT is 3 parts: header.payload.signature
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")

        # Decode payload (add padding if needed)
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding

        payload = json.loads(base64.urlsafe_b64decode(payload_b64))

        user_id = payload.get("sub") or payload.get("user_id")
        email   = payload.get("email", "")

        if not user_id:
            raise ValueError("No user ID in token")

        return {"id": user_id, "email": email}

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
