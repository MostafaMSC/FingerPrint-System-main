using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using FingerPrint.Configuration;
using FingerPrint.Models.DTOs;
using FingerPrint.Interfaces;
using FingerPrint.Models;
using FingerPrint.Models.Enums;

namespace FingerPrint.Services
{
    public class TokenService : ITokenService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IUserRepository _userRepository;

        public TokenService(
            IOptions<JwtSettings> jwtSettings,
            IRefreshTokenRepository refreshTokenRepository,
            IUserRepository userRepository)
        {
            _jwtSettings = jwtSettings.Value;
            _refreshTokenRepository = refreshTokenRepository;
            _userRepository = userRepository;
        }

        public string GenerateAccessToken(UserInfo user)
        {
            var subject = user.Id.ToString();
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, subject),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, subject),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim("DeviceIp", user.DeviceIp ?? ""),
new Claim(
    ClaimTypes.Role,
    (user.Role ?? UserType.Emplpoyee).ToString()
)            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        public FingerPrint.Models.DTOs.TokenValidationResult ValidateAccessToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_jwtSettings.SecretKey);

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = _jwtSettings.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                var jwtToken = (JwtSecurityToken)validatedToken;
                var userIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub || c.Type == ClaimTypes.NameIdentifier);

                if (userIdClaim == null || string.IsNullOrEmpty(userIdClaim.Value) || !int.TryParse(userIdClaim.Value, out int userId))
                {
                    return new FingerPrint.Models.DTOs.TokenValidationResult(false, "Invalid user ID in token");
                }

                return new FingerPrint.Models.DTOs.TokenValidationResult(true, UserId: userId);
            }
            catch (Exception ex)
            {
                return new FingerPrint.Models.DTOs.TokenValidationResult(false, ex.Message);
            }
        }


        public async Task<RefreshToken> CreateRefreshTokenAsync(int userId, CancellationToken cancellationToken = default)
        {
            var refreshToken = new RefreshToken
            {
                Token = GenerateRefreshToken(),
                UserId = userId,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays),
                CreatedAt = DateTime.UtcNow
            };
            return await _refreshTokenRepository.CreateAsync(refreshToken, cancellationToken);
        }

        public async Task<AuthResponse> RefreshAccessTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            var token = await _refreshTokenRepository.GetByTokenAsync(refreshToken, cancellationToken);

            if (token == null)
                throw new UnauthorizedAccessException("Invalid refresh token");

            if (!token.IsActive)
                throw new UnauthorizedAccessException("Refresh token is not active");

            var user = await _userRepository.GetByIdAsync(token.UserId, cancellationToken);
            if (user == null)
                throw new UnauthorizedAccessException("User not found");

            var newRefreshToken = await CreateRefreshTokenAsync(user.Id, cancellationToken);

            token.RevokedAt = DateTime.UtcNow;
            token.ReplacedByToken = newRefreshToken.Token;
            token.ReasonRevoked = "Replaced by new token";
            await _refreshTokenRepository.UpdateAsync(token, cancellationToken);

            var accessToken = GenerateAccessToken(user);

            return new AuthResponse(
                accessToken,
                newRefreshToken.Token,
                DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes)
            );
        }

        public async Task RevokeTokenAsync(string token, string reason = "User requested", CancellationToken cancellationToken = default)
        {
            var refreshToken = await _refreshTokenRepository.GetByTokenAsync(token, cancellationToken);

            if (refreshToken == null)
                throw new InvalidOperationException("Token not found");

            if (!refreshToken.IsActive)
                throw new InvalidOperationException("Token is already revoked");

            refreshToken.RevokedAt = DateTime.UtcNow;
            refreshToken.ReasonRevoked = reason;
            await _refreshTokenRepository.UpdateAsync(refreshToken, cancellationToken);
        }
    }
}