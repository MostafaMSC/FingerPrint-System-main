using FingerPrint.Models;

public class RefreshToken : Entity
{
    public string Token { get; set; }
    public DateTime Expires { get; set; }
    public bool IsRevoked { get; set; }
    public int UserInfoId { get; set; }
    public UserInfo UserInfo { get; set; }
}