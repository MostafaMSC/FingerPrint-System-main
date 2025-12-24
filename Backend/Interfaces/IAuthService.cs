using System.Threading;
using System.Threading.Tasks;
using FingerPrint.Models.DTOs;

namespace FingerPrint.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
        Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
        Task RevokeTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
        Task LogoutAsync(int userId, CancellationToken cancellationToken = default);
        Task<AuthResponse> VerifyOtpAsync(int userId,string otp,CancellationToken cancellationToken = default);
               // 2FA Management Methods
        Task Enable2FAAsync(int userId, CancellationToken cancellationToken = default);
        Task Disable2FAAsync(int userId, CancellationToken cancellationToken = default);
        Task<bool> Get2FAStatusAsync(int userId, CancellationToken cancellationToken = default);
    }
}