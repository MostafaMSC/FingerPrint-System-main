using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using FingerPrint.Data;
using FingerPrint.Interfaces;
using FingerPrint.Models;

namespace FingerPrint.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<UserInfo?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await _context.UserInfos
                .Include(u => u.RefreshTokens)
                .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        }


        public async Task<UserInfo?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
        {
            return await _context.UserInfos
                .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
        }

        public async Task<UserInfo> CreateAsync(UserInfo user, CancellationToken cancellationToken = default)
        {
            _context.UserInfos.Add(user);
            await _context.SaveChangesAsync(cancellationToken);
            return user;
        }

        public async Task UpdateAsync(UserInfo user, CancellationToken cancellationToken = default)
        {
            _context.UserInfos.Update(user);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default)
        {
            return await _context.UserInfos.AnyAsync(u => u.Username == username, cancellationToken);
        }
    }
}