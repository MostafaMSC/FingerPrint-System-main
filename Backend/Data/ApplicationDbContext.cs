using Microsoft.EntityFrameworkCore;
using FingerPrint.Models;

namespace FingerPrint.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<AttendanceLog> AttendanceLogs { get; set; }
        public DbSet<UserInfo> UserInfos { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    modelBuilder.Entity<AttendanceLog>()
        .HasIndex(a => new { a.UserID, a.Time })
        .IsUnique();

    // Remove the composite key, use Id from Entity as primary key
    // Add unique index on Name (username) for authentication
modelBuilder.Entity<UserInfo>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Id).ValueGeneratedOnAdd();
    entity.HasIndex(e => e.Username).IsUnique();

    // تحويل الـ Enum إلى نص
    entity.Property(u => u.Role).HasConversion<string>();
});

    modelBuilder.Entity<RefreshToken>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.HasIndex(e => e.Token).IsUnique();
        entity.Property(e => e.Token).IsRequired();

        entity.HasOne(e => e.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    });
}}
}
