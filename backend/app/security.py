from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

security = HTTPBearer(auto_error=False)


def verify_token(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """Validate Bearer token. Returns the token on success.

    If no token is configured (empty string), all requests are allowed (open mode).
    """
    if not settings.api_bearer_token:
        return ""
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing auth token",
        )
    if creds.credentials != settings.api_bearer_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth token",
        )
    return creds.credentials


async def require_auth(token: str = Depends(verify_token)) -> str:
    """Dependency that requires valid auth on all non-health endpoints."""
    return token
