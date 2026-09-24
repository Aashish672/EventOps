import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

class SupabaseJWTAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class that verifies Supabase issued JWTs.
    """

    def authenticate(self, request):
        # 1. Extract the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None # No token provided, skip this authentication method

        # grab just the token part
        token = auth_header.split(' ')[1]

        try:
            # 2. Fetch the Public Key from Supabase dynamically!
            jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            jwks_client = jwt.PyJWKClient(
                jwks_url,
                headers={"apikey": settings.SUPABASE_ANON_KEY}
            )
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            # 3. Decode the token cryptographically!
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["HS256", "RS256", "ES256"],
                audience="authenticated"
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("The access token has expired. Please log in again.")
        except jwt.DecodeError:
            raise AuthenticationFailed("Invalid access token.")
        except Exception as e:  # noqa: BLE001
            raise AuthenticationFailed(f"Authentication error: {e!s}")

        #3. Extract user data from payload
        user_id = payload.get('sub')
        email = payload.get('email', '')

        if not user_id:
            raise AuthenticationFailed("Token is missiong user identifier.")
        
        user, _created = User.objects.get_or_create(
            username=user_id,
            defaults={'email':email}
        )

        return (user,token)