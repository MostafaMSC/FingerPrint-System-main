using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FingerPrint.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_UserInfos_UserID_UserDeviceIp",
                table: "RefreshTokens");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserInfos",
                table: "UserInfos");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_UserID_UserDeviceIp",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "UserDeviceIp",
                table: "RefreshTokens");

            migrationBuilder.DropColumn(
                name: "UserID",
                table: "RefreshTokens");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "UserInfos",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserInfos",
                table: "UserInfos",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_UserInfos_UserID_DeviceIp",
                table: "UserInfos",
                columns: new[] { "UserID", "DeviceIp" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_UserInfos_UserId",
                table: "RefreshTokens",
                column: "UserId",
                principalTable: "UserInfos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_UserInfos_UserId",
                table: "RefreshTokens");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserInfos",
                table: "UserInfos");

            migrationBuilder.DropIndex(
                name: "IX_UserInfos_UserID_DeviceIp",
                table: "UserInfos");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "UserInfos",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<string>(
                name: "UserDeviceIp",
                table: "RefreshTokens",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UserID",
                table: "RefreshTokens",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserInfos",
                table: "UserInfos",
                columns: new[] { "UserID", "DeviceIp" });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserID_UserDeviceIp",
                table: "RefreshTokens",
                columns: new[] { "UserID", "UserDeviceIp" });

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_UserInfos_UserID_UserDeviceIp",
                table: "RefreshTokens",
                columns: new[] { "UserID", "UserDeviceIp" },
                principalTable: "UserInfos",
                principalColumns: new[] { "UserID", "DeviceIp" },
                onDelete: ReferentialAction.Cascade);
        }
    }
}
