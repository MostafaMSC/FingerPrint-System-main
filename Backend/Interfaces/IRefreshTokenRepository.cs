using System.Threading;
using System.Threading.Tasks;
using FingerPrint.Models;

namespace FingerPrint.Interfaces
{
    public interface IRefreshTokenRepository
    {
        Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken cancellationToken = default);
        Task<RefreshToken> CreateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
        Task UpdateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
        Task RevokeAllUserTokensAsync(int userId, string reason, CancellationToken cancellationToken = default);
        Task DeleteExpiredTokensAsync(CancellationToken cancellationToken = default);
    }
}