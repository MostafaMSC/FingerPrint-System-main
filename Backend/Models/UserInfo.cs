using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FingerPrint.Models;
using FingerPrint.Models.Enums;
namespace FingerPrint.Models
{
    public class UserInfo : Entity
    {
        public string? DeviceUserID { get; set; }
        public string? DeviceIp { get; set; } 
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? Section { get; set; }
        public string? Card { get; set; }
        public UserType? Role { get; set; }
        public string Password { get; set; } = string.Empty;

        //2FA properties
        public bool TwoFactorEnabled { get; set; } = false;
        public string? TwoFactorCodeHash { get; set; }
        public DateTime? TwoFactorExpiry { get; set; }
        public int TwoFactorFailedAttempts { get; set; } = 0;

        public ICollection<RefreshToken>? RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
