using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FingerPrint.Data;
using FingerPrint.Interfaces;
using System.Threading.Tasks;
using System.Linq;

namespace FingerPrint.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DebugController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher _passwordHasher;

        public DebugController(ApplicationDbContext context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.UserInfos
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Role,
                    u.TwoFactorEnabled,
                    HasPassword = !string.IsNullOrEmpty(u.Password)
                })
                .ToListAsync();

            return Ok(new { count = users.Count, users });
        }

        [HttpPost("reset-password/{username}")]
        public async Task<IActionResult> ResetPassword(string username, [FromBody] ResetPasswordRequest request)
        {
            var user = await _context.UserInfos
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null)
                return NotFound(new { message = "User not found" });

            user.Password = _passwordHasher.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully", username = user.Username });
        }

        [HttpGet("check-user/{username}")]
        public async Task<IActionResult> CheckUser(string username)
        {
            var user = await _context.UserInfos
                .FirstOrDefaultAsync(u => u.Username == username || u.Email == username);

            if (user == null)
                return NotFound(new { message = "User not found", username });

            return Ok(new
            {
                exists = true,
                id = user.Id,
                username = user.Username,
                email = user.Email,
                role = user.Role,
                twoFactorEnabled = user.TwoFactorEnabled,
                hasPassword = !string.IsNullOrEmpty(user.Password),
                passwordLength = user.Password?.Length ?? 0
            });
        }
    }

    public class ResetPasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
    }
}
