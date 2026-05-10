namespace Emby.SubtitleManager
{
    internal static class CultureHelper
    {
        internal static string Normalize(string culture)
        {
            var normalized = (culture ?? string.Empty).Replace('_', '-').ToLowerInvariant();

            if (normalized == "zh-cn" || normalized == "zh-sg" || normalized == "zh-hans" || normalized == "zh" ||
                normalized.Contains("simplified"))
            {
                return "zh-CN";
            }

            if (normalized == "zh-hk" || normalized == "zh-hant-hk" || normalized.Contains("hong kong"))
            {
                return "zh-HK";
            }

            if (normalized == "zh-tw" || normalized == "zh-mo" || normalized == "zh-hant" ||
                normalized.Contains("traditional"))
            {
                return "zh-TW";
            }

            if (normalized == "en-gb" || normalized == "en-uk" || normalized.Contains("united kingdom"))
            {
                return "en-GB";
            }

            if (normalized == "ja" || normalized == "ja-jp" || normalized.Contains("japanese"))
            {
                return "ja";
            }

            if (normalized == "ko" || normalized == "ko-kr" || normalized.Contains("korean"))
            {
                return "ko";
            }

            if (normalized == "en" || normalized == "en-us" || normalized.Contains("english"))
            {
                return "en-US";
            }

            return "en-US";
        }
    }
}
