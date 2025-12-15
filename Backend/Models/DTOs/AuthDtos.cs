using FingerPrint.Models.Enums;

namespace FingerPrint.Models.DTOs;

public record LoginRequest(string Username, string Password);

public record RegisterRequest(
    string Username,
    string Password,
    string DeviceIp = null,
    string Department = null,
    string? Section = null,
    UserType? Role = UserType.Emplpoyee 
    );

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);

public record RefreshTokenRequest(string RefreshToken);

public record TokenValidationResult(
    bool IsValid,
    string? Error = null,
    int? UserId = null
);
