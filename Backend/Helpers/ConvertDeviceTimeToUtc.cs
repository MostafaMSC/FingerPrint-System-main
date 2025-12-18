using System;
using System.Globalization;

namespace FingerPrint.Helpers
{
    public static class DeviceTimeConverter
    {
        public static DateTime ConvertDeviceTimeToUtc(string deviceTime)
        {
            var localTime = DateTime.ParseExact(
                deviceTime,
                "yyyy-MM-dd HH:mm:ss",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None
            );

            var iraqTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows()
                    ? "Arabic Standard Time"
                    : "Asia/Baghdad"
            );

            return TimeZoneInfo.ConvertTimeToUtc(localTime, iraqTimeZone);
        }
    }
}
