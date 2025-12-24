using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using FingerPrint.Interfaces;
using FingerPrint.Models.DTOs;

namespace FingerPrint.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

[HttpPost("register")]
[ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
{
    try
    {
        var response = await _authService.RegisterAsync(request, cancellationToken);
        SetTokenCookie(response.AccessToken, response.RefreshToken);
        return Ok(new { message = "Registration successful" });
    }
    catch (ArgumentException ex)
    {
        _logger.LogWarning(ex, "Validation error during registration");
        return BadRequest(new { message = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        _logger.LogWarning(ex, "Business logic error during registration");
        return BadRequest(new { message = ex.Message });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unexpected error during registration for user: {Username}", request?.Username);
        // In development, return more details:
        #if DEBUG
        return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
        #else
        return StatusCode(500, new { message = "An error occurred during registration" });
        #endif
    }
}

        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
        {
            try
            {
                _logger.LogInformation("Login attempt for username: {Username}", request.Username);
                
                var response = await _authService.LoginAsync(request, cancellationToken);
                
                if (!response.Requires2FA)
                {
                    SetTokenCookie(response.AccessToken, response.RefreshToken);
                }

                _logger.LogInformation("Login successful for username: {Username}", request.Username);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Login failed for username: {Username}. Reason: {Message}", request.Username, ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for username: {Username}", request.Username);
                return StatusCode(500, new { message = ex.Message + " | " + ex.StackTrace });
            }
        }

        [HttpPost("verify-otp")]
            public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
            {
                var response = await _authService.VerifyOtpAsync(
                    request.UserId,
                    request.Otp
                );

                SetTokenCookie(response.AccessToken, response.RefreshToken);

                return Ok(response);
            }

        [HttpPost("refresh")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var refreshToken = request.RefreshToken ?? Request.Cookies["refreshToken"];
                if (string.IsNullOrEmpty(refreshToken))
                {
                    return BadRequest(new { message = "Refresh token is required" });
                }

                var response = await _authService.RefreshTokenAsync(refreshToken, cancellationToken);
                SetTokenCookie(response.AccessToken, response.RefreshToken);
                return Ok(new { message = "Token refreshed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                return StatusCode(500, new { message = "An error occurred during token refresh" });
            }
        }

        [Authorize]
        [HttpPost("revoke")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RevokeToken([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken)
        {
            try
            {
                await _authService.RevokeTokenAsync(request.RefreshToken, cancellationToken);
                return Ok(new { message = "Token revoked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token revocation");
                return StatusCode(500, new { message = "An error occurred during token revocation" });
            }
        }

        [Authorize]
        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Logout(CancellationToken cancellationToken)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid user ID in token" });
                }

                await _authService.LogoutAsync(userId, cancellationToken);
                Response.Cookies.Delete("accessToken");
                Response.Cookies.Delete("refreshToken");
                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return StatusCode(500, new { message = "An error occurred during logout" });
            }
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            return Ok(new 
            { 
                Id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                Username = User.Identity?.Name,
                Role = User.FindFirst(ClaimTypes.Role)?.Value
            });
        }

        private void SetTokenCookie(string token, string refreshToken)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(30) // Extended for persistent sessions
            };
            Response.Cookies.Append("accessToken", token, cookieOptions);

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(30) // Extended for persistent sessions
            };
            Response.Cookies.Append("refreshToken", refreshToken, refreshCookieOptions);
        }
        // Add these new endpoints to your existing AuthController.cs

[Authorize]
[HttpPost("enable-2fa")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public async Task<IActionResult> Enable2FA(CancellationToken cancellationToken)
{
    try
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
        {
            return Unauthorized(new { message = "Invalid user ID in token" });
        }

        await _authService.Enable2FAAsync(userId, cancellationToken);
        return Ok(new { message = "2FA enabled successfully" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error enabling 2FA");
        return StatusCode(500, new { message = "An error occurred while enabling 2FA" });
    }
}

[Authorize]
[HttpPost("disable-2fa")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public async Task<IActionResult> Disable2FA(CancellationToken cancellationToken)
{
    try
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
        {
            return Unauthorized(new { message = "Invalid user ID in token" });
        }

        await _authService.Disable2FAAsync(userId, cancellationToken);
        return Ok(new { message = "2FA disabled successfully" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error disabling 2FA");
        return StatusCode(500, new { message = "An error occurred while disabling 2FA" });
    }
}

[Authorize]
[HttpGet("2fa-status")]
[ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public async Task<IActionResult> Get2FAStatus(CancellationToken cancellationToken)
{
    try
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
        {
            return Unauthorized(new { message = "Invalid user ID in token" });
        }

        var status = await _authService.Get2FAStatusAsync(userId, cancellationToken);
        return Ok(new { twoFactorEnabled = status });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error getting 2FA status");
        return StatusCode(500, new { message = "An error occurred while checking 2FA status" });
    }
}
    }
}