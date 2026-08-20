from app.core.response import ApiError

E_PARAM = ApiError(40001, "invalid parameters", 400)
E_UNAUTHORIZED = ApiError(40101, "invalid credentials", 401)
E_ACCESS_EXPIRED = ApiError(40102, "access token expired", 401)
E_REFRESH_EXPIRED = ApiError(40103, "refresh token invalid", 401)
E_CSRF = ApiError(40301, "CSRF validation failed", 403)
E_NOT_FOUND = ApiError(40401, "record not found", 404)
E_RATE_LIMIT = ApiError(42901, "too many login attempts", 429)
E_INTERNAL = ApiError(50000, "internal server error", 500)
