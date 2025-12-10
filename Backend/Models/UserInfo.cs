using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using FingerPrint.Models;
namespace FingerPrint.Models
{
    public class UserInfo 
    {
        public string UserID { get; set; }
        public string DeviceIp { get; set; } 
        public string Name { get; set; }
        public string? Department { get; set; }
        public string? Section { get; set; }
        public string? Card { get; set; }
        public string? Role { get; set; }
        public string? Password { get; set; }
        // public ICollection<RefreshToken>? RefreshTokens { get; set; } = new List<RefreshToken>();
    }
}
