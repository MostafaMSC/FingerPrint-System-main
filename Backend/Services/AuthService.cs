using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using FingerPrint.Models.DTOs;
using FingerPrint.Interfaces;
using FingerPrint.Models;
using FingerPrint.Models.Enums;
using System.Text.Json.Nodes;

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

        public AuthService(
            IUserRepository userRepository,
            IRefreshTokenRepository refreshTokenRepository,
            ITokenService tokenService,
            IPasswordHasher passwordHasher,
            ILogger<AuthService> logger,
            PythonService pythonService)
        {
            _userRepository = userRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _tokenService = tokenService;
            _passwordHasher = passwordHasher;
            _logger = logger;
            _pythonService = pythonService;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                throw new ArgumentException("Username and password are required");

            if (await _userRepository.UsernameExistsAsync(request.Username, cancellationToken))
                throw new InvalidOperationException("Username already taken");

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
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
                throw new ArgumentException("Email and password are required");

            var user = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);
            
            if (user == null)
                throw new UnauthorizedAccessException("Invalid email or password");

            if (!_passwordHasher.VerifyPassword(request.Password, user.Password))
                throw new UnauthorizedAccessException("Invalid email or password");

            _logger.LogInformation("User logged in: {UserId}", user.Id);

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
    }
}