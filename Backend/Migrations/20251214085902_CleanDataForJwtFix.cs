using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FingerPrint.Migrations
{
    /// <inheritdoc />
    public partial class CleanDataForJwtFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("TRUNCATE TABLE \"UserInfos\" RESTART IDENTITY CASCADE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
