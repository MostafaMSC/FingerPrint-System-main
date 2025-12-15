using System.Threading;
using System.Threading.Tasks;
using FingerPrint.Models.DTOs;
using FingerPrint.Models;

namespace FingerPrint.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(UserInfo user);
        string GenerateRefreshToken();
        TokenValidationResult ValidateAccessToken(string token);
        Task<RefreshToken> CreateRefreshTokenAsync(int userId, CancellationToken cancellationToken = default);
        Task<AuthResponse> RefreshAccessTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
        Task RevokeTokenAsync(string token, string reason, CancellationToken cancellationToken = default);
    }
}