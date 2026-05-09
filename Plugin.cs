using System;
using System.Collections.Generic;
using System.IO;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Drawing;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Emby.SubtitleManager
{
    public class Plugin : BasePlugin, IHasWebPages, IHasThumbImage
    {
        public static Plugin Instance { get; private set; }

        private readonly IServerConfigurationManager _serverConfigurationManager;

        public Plugin(
            IApplicationPaths applicationPaths,
            IServerConfigurationManager serverConfigurationManager)
        {
            Instance = this;
            _serverConfigurationManager = serverConfigurationManager;
        }

        public override string Name => GetPluginTitle();

        public override Guid Id => Guid.Parse("A1B2C3D4-E5F6-4A5B-9C8D-1E2F3A4B5C6D");

        public override string Description => GetPluginDescription();

        public ImageFormat ThumbImageFormat => ImageFormat.Png;

        public Stream GetThumbImage()
        {
            var type = GetType();
            return type.Assembly.GetManifestResourceStream(type.Namespace + ".icon.png");
        }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            return new[]
            {
                new PluginPageInfo
                {
                    Name = "SubtitleManager",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.subtitlemanager.html",
                    EnableInMainMenu = true,
                    MenuSection = "server",
                    MenuIcon = "subtitles",
                    DisplayName = GetPluginTitle()
                },
                new PluginPageInfo
                {
                    Name = "subtitleManagerJS",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.subtitlemanager.js"
                }
            };
        }

        private string GetPluginTitle()
        {
            switch (GetPluginCulture())
            {
                case "zh-CN":
                    return "字幕管理器";
                case "zh-TW":
                case "zh-HK":
                    return "字幕管理器";
                case "ja":
                    return "字幕マネージャー";
                case "ko":
                    return "자막 관리자";
                default:
                    return "Subtitle Manager";
            }
        }

        private string GetPluginDescription()
        {
            switch (GetPluginCulture())
            {
                case "zh-CN":
                    return "允许用户上传和管理字幕文件";
                case "zh-TW":
                    return "允許使用者上傳和管理字幕檔案";
                case "zh-HK":
                    return "允許用戶上載和管理字幕檔案";
                case "ja":
                    return "字幕ファイルのアップロードと管理を行います";
                case "ko":
                    return "자막 파일을 업로드하고 관리합니다";
                default:
                    return "Upload and manage subtitle files";
            }
        }

        private string GetPluginCulture()
        {
            return NormalizeCulture(_serverConfigurationManager?.Configuration?.UICulture);
        }

        private static string NormalizeCulture(string culture)
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

            if (normalized == "ja" || normalized == "ja-jp" || normalized.Contains("japanese"))
            {
                return "ja";
            }

            if (normalized == "ko" || normalized == "ko-kr" || normalized.Contains("korean"))
            {
                return "ko";
            }

            return "en-US";
        }
    }
}
