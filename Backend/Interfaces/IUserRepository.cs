using System.Threading;
using System.Threading.Tasks;
using FingerPrint.Models;

namespace FingerPrint.Interfaces
{
    public interface IUserRepository
    {
        Task<UserInfo?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<UserInfo?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
        Task<UserInfo> CreateAsync(UserInfo user, CancellationToken cancellationToken = default);
        Task UpdateAsync(UserInfo user, CancellationToken cancellationToken = default);
        Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default);
        Task<UserInfo?> GetByUsernameOrEmailAsync(string usernameOrEmail, CancellationToken cancellationToken = default);
        Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default);
    }
}