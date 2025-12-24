using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

public class EmailService
{
    private readonly SmtpSettings _settings;

    public EmailService(IOptions<SmtpSettings> settings)
    {
        _settings = settings.Value;
    }

    public async Task SendOtpAsync(string toEmail, string otp)
    {
        var mail = new MailMessage
        {
            From = new MailAddress(_settings.Username, _settings.FromName),
            Subject = "Your OTP Code",
            Body = $"Your verification code is: {otp}\nValid for 5 minutes.",
            IsBodyHtml = false
        };

        mail.To.Add(toEmail);

        using var smtp = new SmtpClient(_settings.Host, _settings.Port)
        {
            Credentials = new NetworkCredential(
                _settings.Username,
                _settings.Password
            ),
            EnableSsl = true
        };

        await smtp.SendMailAsync(mail);
    }
}
