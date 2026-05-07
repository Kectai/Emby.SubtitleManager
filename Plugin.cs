using System;
using System.Collections.Generic;
using System.IO;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Drawing;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Emby.SubtitleManager
{
    public class Plugin : BasePlugin, IHasWebPages, IHasThumbImage
    {
        public static Plugin Instance { get; private set; }

        public Plugin(IApplicationPaths applicationPaths)
        {
            Instance = this;
        }

        public override string Name => "字幕管理器";

        public override Guid Id => Guid.Parse("A1B2C3D4-E5F6-4A5B-9C8D-1E2F3A4B5C6D");

        public override string Description => "允许用户上传和管理字幕文件";

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
                    DisplayName = "字幕管理器"
                },
                new PluginPageInfo
                {
                    Name = "subtitleManagerJS",
                    EmbeddedResourcePath = GetType().Namespace + ".Configuration.subtitlemanager.js"
                }
            };
        }
    }
}
