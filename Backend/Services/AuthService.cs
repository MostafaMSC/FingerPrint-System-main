using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using FingerPrint.Models.DTOs;
using FingerPrint.Interfaces;
using FingerPrint.Models;
using FingerPrint.Models.Enums;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using System.Text;

namespace FingerPrint.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly ITokenService _tokenService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ILogger<AuthService> _logger;
        private readonly PythonService _pythonService;
        private readonly EmailService _emailService;

        public AuthService(
            IUserRepository userRepository,
            IRefreshTokenRepository refreshTokenRepository,
            ITokenService tokenService,
            IPasswordHasher passwordHasher,
            ILogger<AuthService> logger,
            PythonService pythonService,
            EmailService emailService)
        {
            _userRepository = userRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _tokenService = tokenService;
            _passwordHasher = passwordHasher;
            _logger = logger;
            _pythonService = pythonService;
            _emailService = emailService;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.Email))
                throw new ArgumentException("Username, Email and password are required");

            if (await _userRepository.UsernameExistsAsync(request.Username, cancellationToken))
                throw new InvalidOperationException("Username already taken");

            if (await _userRepository.EmailExistsAsync(request.Email, cancellationToken))
                throw new InvalidOperationException("Email already taken");

            string? deviceUserId = null;
            if (!string.IsNullOrWhiteSpace(request.DeviceIp))
            {
                var result = _pythonService.RunPythonAddUser(request.DeviceIp, request.Username);
                if (result["success"]?.GetValue<bool>() == true)
                {
                    deviceUserId = result["generated_user_id"]?.ToString();
                }
                else
                {
                    var error = result["error"]?.ToString() ?? "Unknown error from device";
                    throw new InvalidOperationException($"Failed to add user to ZKTeco device: {error}");
                }
            }

            var user = new UserInfo
            {
                Username = request.Username,
                Email = request.Email,
                Password = _passwordHasher.HashPassword(request.Password),
                DeviceIp = request.DeviceIp,
                DeviceUserID = deviceUserId,
                Department = request.Department,
                Section = request.Section,
                Role = request.Role ?? UserType.Emplpoyee
            };

            user = await _userRepository.CreateAsync(user, cancellationToken);

            _logger.LogInformation("New user registered: {UserId}", user.Id);

            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = await _tokenService.CreateRefreshTokenAsync(user.Id, cancellationToken);

            return new AuthResponse(
                accessToken,
                refreshToken.Token,
                DateTime.UtcNow.AddMinutes(15)
            );
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Attempting to find user by username or email: {Username}", request.Username);
            var user = await _userRepository.GetByUsernameOrEmailAsync(request.Username, cancellationToken);

            if (user == null)
            {
                _logger.LogWarning("User not found: {Username}", request.Username);
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            _logger.LogInformation("User found: {UserId}, Username: {Username}", user.Id, user.Username);
            
            var passwordValid = _passwordHasher.VerifyPassword(request.Password, user.Password);
            _logger.LogInformation("Password verification result for user {Username}: {Result}", user.Username, passwordValid);

            if (!passwordValid)
            {
                _logger.LogWarning("Invalid password for user: {Username}", request.Username);
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            // 🔐 إذا 2FA مفعل
            if (user.TwoFactorEnabled)
            {
                var otp = GenerateOTP();

                user.TwoFactorCodeHash = HashOTP(otp);
                user.TwoFactorExpiry = DateTime.UtcNow.AddMinutes(5);
                user.TwoFactorFailedAttempts = 0;

                await _userRepository.UpdateAsync(user, cancellationToken);

                if (string.IsNullOrWhiteSpace(user.Email))
                    throw new InvalidOperationException("User email is required for 2FA.");

                await _emailService.SendOtpAsync(user.Email, otp);

                _logger.LogInformation("OTP generated for user {UserId}", user.Id);

                return new AuthResponse(
                    null,
                    null,
                    null,
                    Requires2FA: true,
                    UserId: user.Id
                );
            }

            // ❌ لا يوجد 2FA → Login طبيعي
            _logger.LogInformation("Generating tokens for user {UserId}", user.Id);
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = await _tokenService.CreateRefreshTokenAsync(user.Id, cancellationToken);

            return new AuthResponse(
                accessToken,
                refreshToken.Token,
                DateTime.UtcNow.AddMinutes(15)
            );
        }

        public async Task<AuthResponse> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                throw new ArgumentException("Refresh token is required");

            return await _tokenService.RefreshAccessTokenAsync(refreshToken, cancellationToken);
        }

        public async Task RevokeTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                throw new ArgumentException("Refresh token is required");

            await _tokenService.RevokeTokenAsync(refreshToken, "Revoked by user", cancellationToken);

            _logger.LogInformation("Refresh token revoked");
        }

        public async Task LogoutAsync(int userId, CancellationToken cancellationToken = default)
        {
            await _refreshTokenRepository.RevokeAllUserTokensAsync(userId, "User logout", cancellationToken);
            _logger.LogInformation("User logged out: {UserId}", userId);
        }

        public string GenerateOTP()
        {
            return RandomNumberGenerator.
            GetInt32(100000, 999999).ToString();
        }
        
        public string HashOTP(string otp)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(otp));
            return Convert.ToBase64String(bytes);
        }

        public async Task<AuthResponse> VerifyOtpAsync(int userId, string otp, CancellationToken cancellationToken = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, cancellationToken);

            if (user == null)
                throw new UnauthorizedAccessException();

            if (user.TwoFactorExpiry == null || user.TwoFactorExpiry < DateTime.UtcNow)
                throw new UnauthorizedAccessException("OTP expired");

            if (user.TwoFactorFailedAttempts >= 3)
                throw new UnauthorizedAccessException("Too many failed attempts");

            if (user.TwoFactorCodeHash != HashOTP(otp))
            {
                user.TwoFactorFailedAttempts++;
                await _userRepository.UpdateAsync(user, cancellationToken);
                throw new UnauthorizedAccessException("Invalid OTP");
            }

            // ✅ Success
            user.TwoFactorCodeHash = null;
            user.TwoFactorExpiry = null;
            user.TwoFactorFailedAttempts = 0;

            await _userRepository.UpdateAsync(user, cancellationToken);

            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = await _tokenService.CreateRefreshTokenAsync(user.Id, cancellationToken);

            return new AuthResponse(
                accessToken,
                refreshToken.Token,
                DateTime.UtcNow.AddMinutes(15)
            );
        }

        // ========================================
        // 🔐 2FA Management Methods
        // ========================================

        public async Task Enable2FAAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
            
            if (user == null)
            {
                _logger.LogWarning("Attempt to enable 2FA for non-existent user: {UserId}", userId);
                throw new InvalidOperationException("User not found");
            }

            if (string.IsNullOrWhiteSpace(user.Email))
            {
                _logger.LogWarning("Attempt to enable 2FA for user without email: {UserId}", userId);
                throw new InvalidOperationException("User must have an email address to enable 2FA");
            }

            if (user.TwoFactorEnabled)
            {
                _logger.LogInformation("2FA already enabled for user: {UserId}", userId);
                return; // Already enabled, no need to update
            }

            user.TwoFactorEnabled = true;
            await _userRepository.UpdateAsync(user, cancellationToken);

            _logger.LogInformation("2FA enabled successfully for user: {UserId}", userId);
        }

        public async Task Disable2FAAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
            
            if (user == null)
            {
                _logger.LogWarning("Attempt to disable 2FA for non-existent user: {UserId}", userId);
                throw new InvalidOperationException("User not found");
            }

            if (!user.TwoFactorEnabled)
            {
                _logger.LogInformation("2FA already disabled for user: {UserId}", userId);
                return; // Already disabled, no need to update
            }

            user.TwoFactorEnabled = false;
            
            // Clear any existing 2FA codes when disabling
            user.TwoFactorCodeHash = null;
            user.TwoFactorExpiry = null;
            user.TwoFactorFailedAttempts = 0;

            await _userRepository.UpdateAsync(user, cancellationToken);

            _logger.LogInformation("2FA disabled successfully for user: {UserId}", userId);
        }

        public async Task<bool> Get2FAStatusAsync(int userId, CancellationToken cancellationToken = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
            
            if (user == null)
            {
                _logger.LogWarning("Attempt to get 2FA status for non-existent user: {UserId}", userId);
                throw new InvalidOperationException("User not found");
            }

            return user.TwoFactorEnabled;
        }
    }
}