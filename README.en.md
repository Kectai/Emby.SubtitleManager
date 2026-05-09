<p align="center">
  <img src="icon.png" width="260" alt="Emby Subtitle Manager logo">
</p>

# Emby Subtitle Manager

[![Build](https://github.com/Kectai/Emby.SubtitleManager/actions/workflows/build.yml/badge.svg)](https://github.com/Kectai/Emby.SubtitleManager/actions/workflows/build.yml)

English | [Simplified Chinese](README.md)

Emby Subtitle Manager is an Emby Server plugin for manually viewing, uploading, and deleting external subtitle files from the Emby Web admin interface.

Uploaded subtitles are saved to the video's internal Emby metadata directory. After an upload or deletion, the plugin refreshes media metadata so Emby can detect the updated subtitle streams.

## AI Development Notice

The code, documentation, icon, and project organization for this repository were developed and completed by AI. Human involvement focused on requirements, testing, review, and project management.

## Features

- Media library browsing: browse movies, series, seasons, folders, and extras videos in a hierarchical tree.
- Media search: search media items by name and display matching results in a tree view.
- Subtitle viewing: view the language, path, external subtitle flag, and forced subtitle flag for selected videos.
- Subtitle upload: upload external subtitle files for selected videos, with language and forced subtitle options.
- Subtitle deletion: delete external subtitle files recognized by the selected video.
- Metadata refresh: refresh Emby media metadata after subtitle uploads or deletions.

## UI Language

Plugin page text and API messages follow Emby's preferred display language. Supported languages are Chinese Simplified, Chinese Traditional, Chinese Traditional (Hong Kong), English (United Kingdom), English (United States), Japanese, and Korean; unsupported languages fall back to English (United States).

The sidebar entry name is provided by Emby's plugin page registration and is usually refreshed when the plugin is loaded or the server is restarted.

## Plugin Display

- The left sidebar entry uses Emby's built-in `subtitles` menu icon.
- The `Advanced - Plugins` page uses `icon.png` from this repository as the rectangular plugin thumbnail.

## Requirements

- Emby Server 4.8.10 or a compatible version
- .NET SDK 6.0 or later for local builds
- Target framework: `netstandard2.1`
- The plugin page and backend APIs require an Emby administrator account

## Build

```bash
dotnet restore Emby.SubtitleManager.csproj
dotnet build Emby.SubtitleManager.csproj -c Release --no-restore
```

You can also use the helper script:

```bash
./scripts/build.sh
```

Build output:

```text
bin/Release/netstandard2.1/Emby.SubtitleManager.dll
```

GitHub Actions builds are manual only. Open the repository's Actions page, select the `Build` workflow, and click `Run workflow` to create a workflow artifact containing `Emby.SubtitleManager.dll`.

## Installation

For manual installation, copy the DLL to the `plugins` directory under the Emby Server Data Folder. The active data folder can be found in the Emby Server Dashboard under Server Info.

Common plugin directories:

```text
Windows: %APPDATA%\Emby-Server\programdata\plugins\
         C:\Users\{user}\AppData\Roaming\Emby-Server\programdata\plugins\
macOS:   /Users/{user}/emby-server/plugins/
         /Users/{user}/.config/emby-server/plugins/
Linux:   /var/lib/emby/plugins/
```

Installation steps:

1. Build the project or download `Emby.SubtitleManager.dll` from a GitHub Actions artifact or release.
2. Stop Emby Server, or make sure the old DLL is not locked when updating the plugin.
3. Copy the DLL to the `plugins` directory.
4. Start or restart Emby Server.
5. Open `字幕管理器` from the Emby Web main menu.

Linux example:

```bash
sudo cp bin/Release/netstandard2.1/Emby.SubtitleManager.dll /var/lib/emby/plugins/
sudo systemctl restart emby-server
```

Windows PowerShell example:

```powershell
Copy-Item bin\Release\netstandard2.1\Emby.SubtitleManager.dll "$env:APPDATA\Emby-Server\programdata\plugins\"
Restart-Service EmbyServer
```

## Usage

1. Sign in to Emby Web and open `字幕管理器`.
2. Select a media library.
3. Click `加载媒体列表`, or enter a keyword and search.
4. Select a movie, episode, or extras video from the media tree.
5. View existing subtitles, or choose a subtitle file and upload it.
6. Use the delete button to remove external subtitles.

Subtitle file naming:

```text
VideoFileName.language-code[.forced].format
```

Examples:

```text
Example.Movie.zh-CN.srt
Example.Movie.en.srt
Example.Movie.zh.forced.srt
```

Subtitles are saved to Emby's metadata directory instead of the original media directory. This reduces the need for write access to media library folders and lets Emby manage subtitle stream detection.

## Security And Limits

- Backend subtitle format whitelist: `srt`, `ass`, `ssa`, `vtt`, `sub`.
- Backend language code validation accepts only standard language identifier formats.
- Uploaded files must not be empty and must be 20 MB or smaller.
- Existing subtitle files are not overwritten. Delete the old subtitle first when replacing one.
- The delete API only removes external subtitles recognized by the selected media item, and only when the path is inside that item's Emby metadata directory.
- Backend APIs are restricted to Emby administrator accounts.
- This plugin is intended for personal or trusted administrator environments. Do not expose the Emby admin interface to untrusted networks.

## API

These endpoints are intended for the plugin frontend:

- `GET /SubtitleManager/Libraries`: returns media libraries.
- `GET /SubtitleManager/Items`: returns media items. Subtitle streams are omitted by default; use `IncludeSubtitles=true` to request subtitle information.
- `GET /SubtitleManager/Localization`: returns the language used by the plugin page.
- `POST /SubtitleManager/Upload`: uploads a subtitle file. Parameters include `ItemId`, `Language`, `Format`, `IsForced`, and the subtitle file stream.
- `POST /SubtitleManager/DeleteSubtitle`: deletes an external subtitle from the selected media item's metadata directory. Parameters include `ItemId` and `SubtitlePath`.

## Project Structure

```text
.
├── .github/workflows/          # GitHub Actions build workflow
├── Api/                        # Backend REST API controller
├── Configuration/              # Emby Web plugin page
├── scripts/                    # Local maintenance scripts
├── CHANGELOG.md                # Version history
├── Emby.SubtitleManager.csproj # .NET project file
├── LICENSE                     # MIT License
├── Plugin.cs                   # Plugin entry point and page registration
├── README.md                   # Simplified Chinese documentation
├── README.en.md                # English documentation
└── icon.png                    # Rectangular plugin thumbnail
```

Local build outputs and private notes such as `bin/`, `obj/`, `artifacts/`, `local-notes/`, and `.DS_Store` are excluded by `.gitignore`.

## Changelog

Version history is maintained in [CHANGELOG.md](CHANGELOG.md).

## License

This project is licensed under the MIT License. Unless otherwise stated, repository code, documentation, and icon assets are released under this license.
