using System.ComponentModel.DataAnnotations;

namespace FingerPrint.Models
{
    public class AttendanceLog
    {
        [Key]
        public int Id { get; set; }
        public string UserID { get; set; }
        public string Name { get; set; }
        public DateTime Time { get; set; }
        public string? Card { get; set; }
        public string? Role { get; set; }
        public string? DeviceIP { get; set; }
        public string? CheckStatus { get; set; }
    }
}
