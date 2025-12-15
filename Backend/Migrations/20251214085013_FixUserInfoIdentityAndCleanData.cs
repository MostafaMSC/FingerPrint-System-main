using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FingerPrint.Migrations
{
    /// <inheritdoc />
    public partial class FixUserInfoIdentityAndCleanData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Truncate to clean bad data and reset identity
            migrationBuilder.Sql("TRUNCATE TABLE \"UserInfos\" RESTART IDENTITY CASCADE;");

            // Skip AlterColumn as DB reports it is already identity
            /*
            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "UserInfos",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
            */

            migrationBuilder.CreateIndex(
                name: "IX_UserInfos_Username",
                table: "UserInfos",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserInfos_Username",
                table: "UserInfos");
        }
    }
}
