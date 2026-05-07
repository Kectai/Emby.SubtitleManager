#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "========================================"
echo "  Emby 字幕管理器插件编译脚本"
echo "========================================"
echo ""

# 检查是否安装了 .NET SDK
if ! command -v dotnet &> /dev/null; then
    echo "错误: 未找到 dotnet 命令"
    echo "请先安装 .NET SDK 6.0 或更高版本"
    echo "下载地址: https://dotnet.microsoft.com/download"
    exit 1
fi

echo "检测到的 .NET SDK 版本:"
dotnet --version
echo ""

if [ ! -f "icon.png" ]; then
    echo "错误: 未找到 icon.png"
    echo "icon.png 会作为插件列表缩略图嵌入 DLL，请先补齐该文件"
    exit 1
fi

# 恢复依赖
echo "正在恢复 NuGet 包..."
dotnet restore Emby.SubtitleManager.csproj

echo ""
echo "正在编译插件 (Release 模式)..."
dotnet build Emby.SubtitleManager.csproj -c Release --no-restore

echo ""
echo "========================================"
echo "  编译成功!"
echo "========================================"
echo ""
echo "编译输出位置:"
echo "  bin/Release/netstandard2.1/Emby.SubtitleManager.dll"
echo ""
echo "安装步骤:"
echo "  1. 复制 dll 文件到 Emby 插件目录"
echo "  2. 重启 Emby Server"
echo ""
echo "插件目录位置参考:"
echo "  Windows: %APPDATA%\\Emby-Server\\programdata\\plugins\\"
echo "  macOS:   /Users/{user}/emby-server/plugins/"
echo "           /Users/{user}/.config/emby-server/plugins/"
echo "  Linux:   /var/lib/emby/plugins/"
echo ""
