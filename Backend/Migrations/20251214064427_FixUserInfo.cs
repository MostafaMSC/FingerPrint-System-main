using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FingerPrint.Migrations
{
    /// <inheritdoc />
    public partial class FixUserInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserInfos_UserID_DeviceIp",
                table: "UserInfos");

            migrationBuilder.DropColumn(
                name: "UserID",
                table: "UserInfos");

            migrationBuilder.AlterColumn<string>(
                name: "Password",
                table: "UserInfos",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DeviceIp",
                table: "UserInfos",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "DeviceUserID",
                table: "UserInfos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeviceUserID",
                table: "UserInfos");

            migrationBuilder.AlterColumn<string>(
                name: "Password",
                table: "UserInfos",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "DeviceIp",
                table: "UserInfos",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserID",
                table: "UserInfos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_UserInfos_UserID_DeviceIp",
                table: "UserInfos",
                columns: new[] { "UserID", "DeviceIp" },
                unique: true);
        }
    }
}
