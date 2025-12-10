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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Create unique index on UserID + Time to prevent duplicate logs
            modelBuilder.Entity<AttendanceLog>()
                .HasIndex(a => new { a.UserID, a.Time })
                .IsUnique();

            // Composite Key for UserInfo (UserID + DeviceIp)
            modelBuilder.Entity<UserInfo>()
                .HasKey(u => new { u.UserID, u.DeviceIp });
        }
    }
}
