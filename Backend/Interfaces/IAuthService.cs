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
    }
}