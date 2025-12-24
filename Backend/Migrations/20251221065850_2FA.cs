using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FingerPrint.Migrations
{
    /// <inheritdoc />
    public partial class _2FA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TwoFactorCodeHash",
                table: "UserInfos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TwoFactorEnabled",
                table: "UserInfos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "TwoFactorExpiry",
                table: "UserInfos",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TwoFactorFailedAttempts",
                table: "UserInfos",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TwoFactorCodeHash",
                table: "UserInfos");

            migrationBuilder.DropColumn(
                name: "TwoFactorEnabled",
                table: "UserInfos");

            migrationBuilder.DropColumn(
                name: "TwoFactorExpiry",
                table: "UserInfos");

            migrationBuilder.DropColumn(
                name: "TwoFactorFailedAttempts",
                table: "UserInfos");
        }
    }
}
