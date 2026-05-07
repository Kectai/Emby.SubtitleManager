using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Providers;
using MediaBrowser.Model.Entities;
using MediaBrowser.Model.Globalization;
using MediaBrowser.Model.IO;
using MediaBrowser.Model.Logging;
using MediaBrowser.Model.Services;

namespace Emby.SubtitleManager.Api
{
    [Route("/SubtitleManager/Upload", "POST", Summary = "上传字幕文件")]
    public class UploadSubtitleRequest : IReturn<UploadSubtitleResponse>, IRequiresRequestStream
    {
        [ApiMember(Name = "ItemId", Description = "媒体项ID", IsRequired = true, DataType = "string", ParameterType = "query")]
        public string ItemId { get; set; }

        [ApiMember(Name = "Language", Description = "字幕语言", IsRequired = true, DataType = "string", ParameterType = "query")]
        public string Language { get; set; }

        [ApiMember(Name = "Format", Description = "字幕格式", IsRequired = true, DataType = "string", ParameterType = "query")]
        public string Format { get; set; }

        [ApiMember(Name = "IsForced", Description = "是否为强制字幕", IsRequired = false, DataType = "bool", ParameterType = "query")]
        public bool IsForced { get; set; }

        public Stream RequestStream { get; set; }
    }

    public class UploadSubtitleResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string FilePath { get; set; }
    }

    [Route("/SubtitleManager/DeleteSubtitle", "POST", Summary = "删除字幕文件")]
    public class DeleteSubtitleRequest : IReturn<DeleteSubtitleResponse>
    {
        [ApiMember(Name = "ItemId", Description = "媒体项ID", IsRequired = true, DataType = "string", ParameterType = "query")]
        public string ItemId { get; set; }

        [ApiMember(Name = "SubtitlePath", Description = "字幕文件路径", IsRequired = true, DataType = "string", ParameterType = "query")]
        public string SubtitlePath { get; set; }
    }

    public class DeleteSubtitleResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
    }

    [Route("/SubtitleManager/Libraries", "GET", Summary = "获取媒体库列表")]
    public class GetLibrariesRequest : IReturn<LibrariesResponse>
    {
    }

    public class LibrariesResponse
    {
        public LibraryInfo[] Libraries { get; set; }
    }

    public class LibraryInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string CollectionType { get; set; }
    }

    [Route("/SubtitleManager/Items", "GET", Summary = "获取媒体项列表")]
    public class GetItemsRequest : IReturn<ItemsResponse>
    {
        [ApiMember(Name = "ParentId", Description = "父级ID", IsRequired = false, DataType = "string", ParameterType = "query")]
        public string ParentId { get; set; }

        [ApiMember(Name = "IncludeItemTypes", Description = "包含的项目类型", IsRequired = false, DataType = "string", ParameterType = "query")]
        public string IncludeItemTypes { get; set; }

        [ApiMember(Name = "Recursive", Description = "是否递归", IsRequired = false, DataType = "bool", ParameterType = "query")]
        public bool Recursive { get; set; }

        [ApiMember(Name = "StartIndex", Description = "起始索引", IsRequired = false, DataType = "int", ParameterType = "query")]
        public int? StartIndex { get; set; }

        [ApiMember(Name = "Limit", Description = "限制数量", IsRequired = false, DataType = "int", ParameterType = "query")]
        public int? Limit { get; set; }

        [ApiMember(Name = "IncludeSubtitles", Description = "是否包含字幕流信息", IsRequired = false, DataType = "bool", ParameterType = "query")]
        public bool IncludeSubtitles { get; set; }
    }

    public class ItemsResponse
    {
        public MediaItemInfo[] Items { get; set; }
        public int TotalRecordCount { get; set; }
    }

    public class MediaItemInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string Path { get; set; }
        public string ParentId { get; set; }
        public int? IndexNumber { get; set; }
        public SubtitleInfo[] Subtitles { get; set; }
    }

    public class SubtitleInfo
    {
        public string Language { get; set; }
        public string DisplayLanguage { get; set; }
        public string Path { get; set; }
        public bool IsForced { get; set; }
        public bool IsExternal { get; set; }
    }

    public class SubtitleController : IService
    {
        private const long MaxSubtitleFileSizeBytes = 20 * 1024 * 1024;
        private static readonly TimeSpan ExtrasCacheLifetime = TimeSpan.FromMinutes(30);
        private static readonly Regex LanguageCodeRegex = new Regex("^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$", RegexOptions.Compiled);
        private static readonly HashSet<string> AllowedSubtitleFormats = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "srt",
            "ass",
            "ssa",
            "vtt",
            "sub"
        };

        private readonly ILibraryManager _libraryManager;
        private readonly IFileSystem _fileSystem;
        private readonly ILogger _logger;
        private readonly ILocalizationManager _localizationManager;

        public SubtitleController(
            ILibraryManager libraryManager,
            IFileSystem fileSystem,
            ILogManager logManager,
            ILocalizationManager localizationManager)
        {
            _libraryManager = libraryManager;
            _fileSystem = fileSystem;
            _logger = logManager.GetLogger("SubtitleManager");
            _localizationManager = localizationManager;
        }

        public async Task<object> Post(UploadSubtitleRequest request)
        {
            try
            {
                var validationError = ValidateUploadRequest(request, out var language, out var format);
                if (!string.IsNullOrEmpty(validationError))
                {
                    return new UploadSubtitleResponse
                    {
                        Success = false,
                        Message = validationError
                    };
                }

                // 获取媒体项（包括普通媒体和 extras 视频）
                var item = _libraryManager.GetItemById(request.ItemId);
                if (item == null)
                {
                    return new UploadSubtitleResponse
                    {
                        Success = false,
                        Message = "找不到指定的媒体项"
                    };
                }

                var video = item as Video;
                if (video == null)
                {
                    return new UploadSubtitleResponse
                    {
                        Success = false,
                        Message = "指定的媒体项不是视频类型"
                    };
                }

                // 获取Emby元数据目录路径
                var metadataPath = video.GetInternalMetadataPath();
                if (string.IsNullOrEmpty(metadataPath))
                {
                    return new UploadSubtitleResponse
                    {
                        Success = false,
                        Message = "无法获取媒体元数据目录"
                    };
                }

                // 确保元数据目录存在
                Directory.CreateDirectory(metadataPath);

                // 获取视频文件名（不含扩展名）作为字幕文件名前缀
                var videoFileName = Path.GetFileNameWithoutExtension(video.Path);

                // 构建字幕文件名: 视频文件名.语言代码[.forced].格式
                var subtitleFileName = videoFileName + "." + language;
                if (request.IsForced)
                {
                    subtitleFileName += ".forced";
                }
                subtitleFileName += "." + format;

                var subtitlePath = Path.Combine(metadataPath, subtitleFileName);
                if (!IsPathUnderDirectory(subtitlePath, metadataPath))
                {
                    return new UploadSubtitleResponse
                    {
                        Success = false,
                        Message = "字幕保存路径无效"
                    };
                }

                if (File.Exists(subtitlePath))
                {
                    return new UploadSubtitleResponse
                    {
                        Success = false,
                        Message = "同名字幕已存在，请先删除现有字幕后再上传"
                    };
                }

                // 保存字幕文件
                var bytesWritten = 0L;
                try
                {
                    bytesWritten = await SaveSubtitleStream(request.RequestStream, subtitlePath).ConfigureAwait(false);
                }
                catch
                {
                    TryDeleteFile(subtitlePath);
                    throw;
                }

                if (bytesWritten == 0)
                {
                    TryDeleteFile(subtitlePath);
                    return new UploadSubtitleResponse
                    {
                        Success = false,
                        Message = "字幕文件为空"
                    };
                }

                // 刷新媒体项的元数据，强制Emby重新扫描字幕
                var refreshOptions = new MetadataRefreshOptions(_fileSystem)
                {
                    MetadataRefreshMode = MediaBrowser.Controller.Providers.MetadataRefreshMode.FullRefresh,
                    ForceSave = true
                };

                await video.RefreshMetadata(refreshOptions, CancellationToken.None);

                _logger.Info(string.Format("字幕上传成功 - ItemId: {0}, Language: {1}", request.ItemId, language));

                return new UploadSubtitleResponse
                {
                    Success = true,
                    Message = "字幕上传成功",
                    FilePath = subtitlePath
                };
            }
            catch (Exception ex)
            {
                _logger.ErrorException("上传字幕时发生错误: " + ex.Message, ex);
                return new UploadSubtitleResponse
                {
                    Success = false,
                    Message = "上传失败: " + ex.Message
                };
            }
        }

        public async Task<object> Post(DeleteSubtitleRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.SubtitlePath))
                {
                    return new DeleteSubtitleResponse
                    {
                        Success = false,
                        Message = "字幕路径不能为空"
                    };
                }

                // 获取媒体项
                var item = _libraryManager.GetItemById(request.ItemId);
                if (item == null)
                {
                    return new DeleteSubtitleResponse
                    {
                        Success = false,
                        Message = "找不到指定的媒体项"
                    };
                }

                var video = item as Video;
                if (video == null)
                {
                    return new DeleteSubtitleResponse
                    {
                        Success = false,
                        Message = "指定的媒体项不是视频类型"
                    };
                }

                var validSubtitlePath = GetValidatedExternalSubtitlePath(video, request.SubtitlePath);
                if (string.IsNullOrEmpty(validSubtitlePath))
                {
                    return new DeleteSubtitleResponse
                    {
                        Success = false,
                        Message = "只能删除当前媒体元数据目录中的外部字幕"
                    };
                }

                // 检查字幕文件是否存在
                if (!File.Exists(validSubtitlePath))
                {
                    return new DeleteSubtitleResponse
                    {
                        Success = false,
                        Message = "字幕文件不存在"
                    };
                }

                // 删除字幕文件
                File.Delete(validSubtitlePath);

                // 刷新媒体项的元数据
                var refreshOptions = new MetadataRefreshOptions(_fileSystem)
                {
                    MetadataRefreshMode = MediaBrowser.Controller.Providers.MetadataRefreshMode.FullRefresh,
                    ForceSave = true
                };

                await video.RefreshMetadata(refreshOptions, CancellationToken.None);

                _logger.Info(string.Format("字幕删除成功 - ItemId: {0}", request.ItemId));

                return new DeleteSubtitleResponse
                {
                    Success = true,
                    Message = "字幕删除成功"
                };
            }
            catch (Exception ex)
            {
                _logger.ErrorException("删除字幕时发生错误: " + ex.Message, ex);
                return new DeleteSubtitleResponse
                {
                    Success = false,
                    Message = "删除失败: " + ex.Message
                };
            }
        }

        public object Get(GetLibrariesRequest request)
        {
            try
            {
                var children = _libraryManager.RootFolder.GetRecursiveChildren();
                var libraries = children
                    .OfType<CollectionFolder>()
                    .Select(i => new LibraryInfo
                    {
                        Id = i.Id.ToString().Replace("-", ""),
                        Name = i.Name,
                        CollectionType = i.CollectionType
                    })
                    .ToArray();

                return new LibrariesResponse
                {
                    Libraries = libraries
                };
            }
            catch (Exception ex)
            {
                _logger.ErrorException("获取媒体库列表时发生错误: " + ex.Message, ex);
                return new LibrariesResponse
                {
                    Libraries = new LibraryInfo[0]
                };
            }
        }

        // 存储虚拟 extras 文件夹信息的静态缓存（key: 虚拟文件夹ID）
        private static readonly Dictionary<string, ExtrasFolderCacheEntry> _extrasFolderCache = new Dictionary<string, ExtrasFolderCacheEntry>();
        private static readonly object _cacheLock = new object();

        public object Get(GetItemsRequest request)
        {
            try
            {
                // 检查是否在查询虚拟的 extras 文件夹
                if (!string.IsNullOrEmpty(request.ParentId))
                {
                    if (TryGetExtrasFolderVideos(request.ParentId, out var videos))
                    {
                        // 这是一个 extras 文件夹查询，返回该文件夹中的视频
                        return GetExtrasInFolder(request.ParentId, videos);
                    }
                }

                var query = new InternalItemsQuery
                {
                    Recursive = request.Recursive,
                    StartIndex = request.StartIndex,
                    Limit = request.Limit
                };

                // 如果指定了 IncludeItemTypes，使用指定的类型；否则不限制类型（显示所有项目包括文件夹）
                if (!string.IsNullOrEmpty(request.IncludeItemTypes))
                {
                    query.IncludeItemTypes = request.IncludeItemTypes.Split(',');
                }

                if (!string.IsNullOrEmpty(request.ParentId))
                {
                    var parentItem = _libraryManager.GetItemById(request.ParentId);
                    if (parentItem != null && parentItem is Folder folder)
                    {
                        query.Parent = folder;
                    }
                }

                var result = _libraryManager.GetItemsResult(query);

                var items = result.Items.Select(i => {
                    // 获取父级的真实 GUID，而不是内部数字 ID
                    string parentIdStr = "";
                    var parentItem = i.GetParent();
                    if (parentItem != null)
                    {
                        parentIdStr = parentItem.Id.ToString().Replace("-", "");
                    }

                    return new MediaItemInfo
                    {
                        Id = i.Id.ToString().Replace("-", ""),
                        Name = i.Name,
                        Type = i.GetType().Name,
                        Path = i.Path,
                        ParentId = parentIdStr,
                        IndexNumber = i.IndexNumber,
                        Subtitles = request.IncludeSubtitles ? GetSubtitleInfo(i as Video) : new SubtitleInfo[0]
                    };
                }).ToList();

                // 如果是非递归查询，且 ParentId 指向的是一个电影文件夹，则添加 extras
                if (!request.Recursive && !string.IsNullOrEmpty(request.ParentId))
                {
                    var parentItem = _libraryManager.GetItemById(request.ParentId);

                    // 检查 parent 是否是 Folder 类型（电影文件夹）
                    if (parentItem != null && parentItem.GetType().Name == "Folder")
                    {
                        var extrasFolders = GetExtrasFolders(result.Items);
                        items.AddRange(extrasFolders);
                    }
                }

                var finalItems = items.ToArray();

                return new ItemsResponse
                {
                    Items = finalItems,
                    TotalRecordCount = result.TotalRecordCount + (items.Count - result.Items.Length)
                };
            }
            catch (Exception ex)
            {
                _logger.ErrorException("获取媒体项列表时发生错误: " + ex.Message, ex);
                return new ItemsResponse
                {
                    Items = new MediaItemInfo[0],
                    TotalRecordCount = 0
                };
            }
        }

        private List<MediaItemInfo> GetExtrasFolders(BaseItem[] items)
        {
            var extrasFolders = new List<MediaItemInfo>();
            var globalFolderVideosMap = new Dictionary<string, List<BaseItem>>(); // 全局文件夹路径 -> 视频列表
            var processedFolderPaths = new HashSet<string>(); // 已处理的 extras 文件夹路径（用于去重）

            foreach (var item in items)
            {
                BaseItem movieItem = null;

                // 处理 Movie 类型
                if (item.GetType().Name == "Movie")
                {
                    movieItem = item;
                }
                // 处理 Folder 类型：查询文件夹里是否有 Movie
                else if (item.GetType().Name == "Folder" && item is Folder folder)
                {
                    // 使用 LibraryManager 查询文件夹的直接子项
                    var folderQuery = new InternalItemsQuery
                    {
                        Parent = folder,
                        Recursive = false
                    };
                    var folderResult = _libraryManager.GetItemsResult(folderQuery);

                    // 查找 Movie 类型的子项
                    var movieInFolder = folderResult.Items.FirstOrDefault(c => c.GetType().Name == "Movie");
                    if (movieInFolder != null)
                    {
                        movieItem = movieInFolder;
                    }
                }
                else
                {
                    continue;
                }

                if (movieItem == null)
                    continue;

                try
                {
                    // 使用反射调用 GetExtras() 方法
                    // 必须传入所有 ExtraType 枚举值才能获取所有附加篇
                    var getExtrasMethod = movieItem.GetType().GetMethod("GetExtras", new Type[] { typeof(MediaBrowser.Model.Entities.ExtraType[]) });
                    if (getExtrasMethod == null)
                    {
                        continue;
                    }

                    // 获取所有 ExtraType 枚举值
                    var allExtraTypes = (MediaBrowser.Model.Entities.ExtraType[])Enum.GetValues(typeof(MediaBrowser.Model.Entities.ExtraType));

                    var extras = getExtrasMethod.Invoke(movieItem, new object[] { allExtraTypes }) as BaseItem[];
                    if (extras == null)
                    {
                        continue;
                    }

                    if (extras.Length == 0)
                    {
                        continue;
                    }

                    // 使用原始的 item（Folder）作为父级，这样 extras 文件夹会显示在电影文件夹下
                    var parentItem = item;
                    string parentIdStr = parentItem.Id.ToString().Replace("-", "");

                    // 将当前 Movie 的 extras 视频按文件夹分组
                    var currentMovieFolders = new Dictionary<string, List<BaseItem>>();
                    foreach (var extra in extras)
                    {
                        if (string.IsNullOrEmpty(extra.Path))
                            continue;

                        // 获取 extra 的父文件夹路径
                        var extraFolderPath = Path.GetDirectoryName(extra.Path);
                        if (string.IsNullOrEmpty(extraFolderPath))
                            continue;

                        // 将视频添加到当前 Movie 的文件夹列表中
                        if (!currentMovieFolders.ContainsKey(extraFolderPath))
                        {
                            currentMovieFolders[extraFolderPath] = new List<BaseItem>();
                        }
                        currentMovieFolders[extraFolderPath].Add(extra);

                        // 同时添加到全局映射中（避免重复添加相同的视频）
                        if (!globalFolderVideosMap.ContainsKey(extraFolderPath))
                        {
                            globalFolderVideosMap[extraFolderPath] = new List<BaseItem>();
                        }

                        // 检查是否已存在此视频（通过 ItemId 判断，避免合并版本导致的重复）
                        if (!globalFolderVideosMap[extraFolderPath].Any(v => v.Id == extra.Id))
                        {
                            globalFolderVideosMap[extraFolderPath].Add(extra);
                        }
                    }

                    // 为当前 Movie 的每个文件夹创建虚拟 Folder MediaItemInfo
                    foreach (var kvp in currentMovieFolders)
                    {
                        var extraFolderPath = kvp.Key;
                        // 检查是否已经处理过此文件夹路径（避免合并版本导致的重复）
                        if (processedFolderPaths.Contains(extraFolderPath))
                        {
                            continue; // 跳过已处理的文件夹
                        }

                        // 标记为已处理
                        processedFolderPaths.Add(extraFolderPath);

                        // 获取文件夹名称（如 "extras", "trailers"）
                        var folderName = Path.GetFileName(extraFolderPath);

                        // 创建稳定的虚拟 Folder ID
                        var folderId = CreateStableFolderId(extraFolderPath);

                        extrasFolders.Add(new MediaItemInfo
                        {
                            Id = folderId,
                            Name = folderName,
                            Type = "Folder",
                            Path = extraFolderPath,
                            ParentId = parentIdStr,
                            IndexNumber = null,
                            Subtitles = new SubtitleInfo[0]
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.ErrorException($"获取 Movie extras 时发生错误: {ex.Message}", ex);
                }
            }

            // 将所有文件夹及其视频列表存入缓存
            lock (_cacheLock)
            {
                PruneExpiredExtrasCache();
                foreach (var kvp in globalFolderVideosMap)
                {
                    var folderId = CreateStableFolderId(kvp.Key);
                    _extrasFolderCache[folderId] = new ExtrasFolderCacheEntry
                    {
                        Videos = kvp.Value,
                        LastAccessUtc = DateTime.UtcNow
                    };
                }
            }

            return extrasFolders;
        }

        private ItemsResponse GetExtrasInFolder(string parentId, List<BaseItem> videos)
        {
            try
            {
                var items = new List<MediaItemInfo>();

                if (videos == null || videos.Count == 0)
                {
                    return new ItemsResponse
                    {
                        Items = new MediaItemInfo[0],
                        TotalRecordCount = 0
                    };
                }

                // 转换为 MediaItemInfo（使用真实的 Emby ItemId）
                foreach (var video in videos)
                {
                    items.Add(new MediaItemInfo
                    {
                        Id = video.Id.ToString().Replace("-", ""),
                        Name = video.Name,
                        Type = video.GetType().Name,
                        Path = video.Path,
                        ParentId = parentId,
                        IndexNumber = null,
                        Subtitles = new SubtitleInfo[0]
                    });
                }

                return new ItemsResponse
                {
                    Items = items.ToArray(),
                    TotalRecordCount = items.Count
                };
            }
            catch (Exception ex)
            {
                _logger.ErrorException($"获取 extras 文件夹内容时发生错误: {ex.Message}", ex);
                return new ItemsResponse
                {
                    Items = new MediaItemInfo[0],
                    TotalRecordCount = 0
                };
            }
        }

        private SubtitleInfo[] GetSubtitleInfo(Video video)
        {
            if (video == null)
            {
                return new SubtitleInfo[0];
            }

            return video.GetMediaStreams()
                .Where(s => s.Type == MediaStreamType.Subtitle)
                .Select(s => new SubtitleInfo
                {
                    Language = s.Language,
                    DisplayLanguage = _localizationManager.GetLocalizedString(s.Language),
                    Path = s.Path,
                    IsForced = s.IsForced,
                    IsExternal = s.IsExternal
                })
                .ToArray();
        }

        private static string ValidateUploadRequest(UploadSubtitleRequest request, out string language, out string format)
        {
            language = request == null ? null : (request.Language ?? string.Empty).Trim();
            format = request == null ? null : (request.Format ?? string.Empty).Trim().TrimStart('.').ToLowerInvariant();

            if (request == null || request.RequestStream == null || !request.RequestStream.CanRead)
            {
                return "字幕文件不能为空";
            }

            if (request.RequestStream.CanSeek)
            {
                if (request.RequestStream.Length == 0)
                {
                    return "字幕文件为空";
                }

                if (request.RequestStream.Length > MaxSubtitleFileSizeBytes)
                {
                    return "字幕文件超过 20MB 限制";
                }
            }

            if (string.IsNullOrEmpty(language) || !LanguageCodeRegex.IsMatch(language))
            {
                return "字幕语言代码无效";
            }

            if (string.IsNullOrEmpty(format) || !AllowedSubtitleFormats.Contains(format))
            {
                return "字幕格式无效，仅支持 srt、ass、ssa、vtt、sub";
            }

            return null;
        }

        private static async Task<long> SaveSubtitleStream(Stream source, string subtitlePath)
        {
            var buffer = new byte[81920];
            var totalBytes = 0L;

            using (var fileStream = new FileStream(subtitlePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                int bytesRead;
                while ((bytesRead = await source.ReadAsync(buffer, 0, buffer.Length).ConfigureAwait(false)) > 0)
                {
                    totalBytes += bytesRead;
                    if (totalBytes > MaxSubtitleFileSizeBytes)
                    {
                        throw new InvalidOperationException("字幕文件超过 20MB 限制");
                    }

                    await fileStream.WriteAsync(buffer, 0, bytesRead).ConfigureAwait(false);
                }
            }

            return totalBytes;
        }

        private string GetValidatedExternalSubtitlePath(Video video, string requestedPath)
        {
            var metadataPath = video.GetInternalMetadataPath();
            if (string.IsNullOrEmpty(metadataPath) || string.IsNullOrWhiteSpace(requestedPath))
            {
                return null;
            }

            var matchingSubtitle = video.GetMediaStreams()
                .Where(s => s.Type == MediaStreamType.Subtitle && s.IsExternal && !string.IsNullOrEmpty(s.Path))
                .FirstOrDefault(s => AreSamePath(s.Path, requestedPath));

            if (matchingSubtitle == null || !IsPathUnderDirectory(matchingSubtitle.Path, metadataPath))
            {
                return null;
            }

            return Path.GetFullPath(matchingSubtitle.Path);
        }

        private static bool AreSamePath(string left, string right)
        {
            try
            {
                return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        private static bool IsPathUnderDirectory(string filePath, string directoryPath)
        {
            try
            {
                var fullFilePath = Path.GetFullPath(filePath);
                var fullDirectoryPath = Path.GetFullPath(directoryPath)
                    .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    + Path.DirectorySeparatorChar;

                return fullFilePath.StartsWith(fullDirectoryPath, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        private static void TryDeleteFile(string path)
        {
            try
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
            }
        }

        private static string CreateStableFolderId(string folderPath)
        {
            using (var sha256 = SHA256.Create())
            {
                var normalizedPath = Path.GetFullPath(folderPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(normalizedPath));
                var builder = new StringBuilder("extras_", 23);

                for (var i = 0; i < 8; i++)
                {
                    builder.Append(hash[i].ToString("x2"));
                }

                return builder.ToString();
            }
        }

        private static bool TryGetExtrasFolderVideos(string folderId, out List<BaseItem> videos)
        {
            lock (_cacheLock)
            {
                PruneExpiredExtrasCache();

                if (_extrasFolderCache.TryGetValue(folderId, out var entry))
                {
                    entry.LastAccessUtc = DateTime.UtcNow;
                    videos = entry.Videos;
                    return true;
                }
            }

            videos = null;
            return false;
        }

        private static void PruneExpiredExtrasCache()
        {
            var expiresBefore = DateTime.UtcNow.Subtract(ExtrasCacheLifetime);
            var expiredKeys = _extrasFolderCache
                .Where(kvp => kvp.Value.LastAccessUtc < expiresBefore)
                .Select(kvp => kvp.Key)
                .ToArray();

            foreach (var key in expiredKeys)
            {
                _extrasFolderCache.Remove(key);
            }
        }

        private class ExtrasFolderCacheEntry
        {
            public List<BaseItem> Videos { get; set; }
            public DateTime LastAccessUtc { get; set; }
        }
    }
}
