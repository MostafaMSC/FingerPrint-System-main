using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FingerPrint.Migrations
{
    /// <inheritdoc />
    public partial class FixUserInfo2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Name",
                table: "UserInfos",
                newName: "Username");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Username",
                table: "UserInfos",
                newName: "Name");
        }
    }
}
