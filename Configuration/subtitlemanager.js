define(['baseView', 'loading', 'emby-input', 'emby-button', 'emby-select'], function (BaseView, loading) {
    'use strict';

    var selectedItemId = null;
    var expandedFolders = {}; // 记录已展开的文件夹
    var itemsCache = {}; // 缓存所有媒体项数据（key: itemId, value: item对象）
    var maxSubtitleFileSize = 20 * 1024 * 1024;
    var allowedSubtitleFormats = ['srt', 'ass', 'ssa', 'vtt', 'sub'];

    // 获取API客户端
    function getApiClient() {
        return ApiClient;
    }

    // 显示消息
    function showMessage(message, isError) {
        Dashboard.alert({
            message: message,
            title: isError ? '错误' : '成功'
        });
    }

    // 加载媒体库列表
    function loadLibraries(view) {
        loading.show();
        var apiClient = getApiClient();

        apiClient.getJSON(apiClient.getUrl('/SubtitleManager/Libraries')).then(function (result) {
            loading.hide();
            var selectLibrary = view.querySelector('#selectLibrary');
            selectLibrary.innerHTML = '<option value="">请选择媒体库</option>';

            if (result.Libraries && result.Libraries.length > 0) {
                result.Libraries.forEach(function (library) {
                    var option = document.createElement('option');
                    option.value = library.Id;
                    option.textContent = library.Name;
                    selectLibrary.appendChild(option);
                });
            } else {
                selectLibrary.innerHTML = '<option value="">未找到媒体库</option>';
            }
        }).catch(function (error) {
            loading.hide();
            console.error('加载媒体库失败:', error);
            showMessage('加载媒体库失败: ' + error.message, true);
        });
    }

    // 判断是否为文件夹类型
    function isFolder(itemType) {
        return itemType === 'Series' ||
               itemType === 'Season' ||
               itemType === 'Folder' ||
               itemType === 'CollectionFolder' ||
               itemType === 'BoxSet';
    }

    // 格式化显示名称（添加编号）
    function formatDisplayName(item) {
        var name = item.Name;

        // Season: 如果名称已经包含季信息，直接显示；否则添加编号
        // 注意：只处理 IndexNumber > 0 的季，避免把特殊文件夹（如 shorts）显示为"第 0 季"
        if (item.Type === 'Season' && item.IndexNumber !== undefined && item.IndexNumber !== null && item.IndexNumber > 0) {
            // 检查名称是否已经包含"季"或"Season"
            if (name.indexOf('季') === -1 && name.toLowerCase().indexOf('season') === -1) {
                return '第 ' + item.IndexNumber + ' 季';
            }
            return name;
        }

        // Episode: 显示 "X. 剧集名"
        if (item.Type === 'Episode' && item.IndexNumber !== undefined && item.IndexNumber !== null) {
            return item.IndexNumber + '. ' + name;
        }

        // 其他情况：直接显示原始名称（包括 Extras、Shorts 等特殊文件夹）
        return name;
    }

    // 排序函数
    function sortItems(items) {
        return items.sort(function (a, b) {
            var aIsFolder = isFolder(a.Type);
            var bIsFolder = isFolder(b.Type);

            // 文件夹在前
            if (aIsFolder && !bIsFolder) return -1;
            if (!aIsFolder && bIsFolder) return 1;

            // 如果都是文件夹或都是文件，按类型和序号排序
            if (aIsFolder === bIsFolder) {
                // Season: 按 IndexNumber 排序
                if (a.Type === 'Season' && b.Type === 'Season') {
                    var aIndex = a.IndexNumber !== undefined ? a.IndexNumber : 999;
                    var bIndex = b.IndexNumber !== undefined ? b.IndexNumber : 999;
                    return aIndex - bIndex;
                }

                // Episode: 按 IndexNumber 排序
                if (a.Type === 'Episode' && b.Type === 'Episode') {
                    var aIndex = a.IndexNumber !== undefined ? a.IndexNumber : 999;
                    var bIndex = b.IndexNumber !== undefined ? b.IndexNumber : 999;
                    return aIndex - bIndex;
                }

                // 其他：按名称字典序
                return a.Name.localeCompare(b.Name);
            }

            return 0;
        });
    }

    // 根据媒体类型获取图标名称
    function getMediaIcon(type) {
        var iconMap = {
            'CollectionFolder': 'folder',
            'Folder': 'folder',
            'BoxSet': 'collections',
            'Series': 'tv',
            'Season': 'tv',
            'Episode': 'live_tv',
            'Movie': 'movie',
            'Video': 'movie',
            'Trailer': 'movie',
            'Audio': 'music_note',
            'MusicAlbum': 'album',
            'MusicArtist': 'person'
        };
        return iconMap[type] || 'video_library';
    }

    // 搜索媒体项
    function searchMedia(view) {
        var libraryId = view.querySelector('#selectLibrary').value;
        var searchText = view.querySelector('#searchBox').value;

        if (!libraryId) {
            showMessage('请先选择媒体库', true);
            return;
        }

        if (searchText) {
            // 如果有搜索文本，递归搜索并平铺显示
            searchRecursive(view, libraryId, searchText);
        } else {
            // 没有搜索文本，加载根目录
            loadRootItems(view, libraryId);
        }
    }

    // 加载根目录项
    function loadRootItems(view, libraryId) {
        loading.show();
        var apiClient = getApiClient();

        var url = apiClient.getUrl('/SubtitleManager/Items', {
            ParentId: libraryId,
            Recursive: false,
            Limit: 200
        });

        apiClient.getJSON(url).then(function (result) {
            loading.hide();
            var items = result.Items || [];

            // 渲染树形结构
            var treeContainer = view.querySelector('#mediaTree');
            treeContainer.innerHTML = '';

            if (items.length === 0) {
                treeContainer.innerHTML = '<div class="fieldDescription">此媒体库下没有项目</div>';
                return;
            }

            // 检查是否有项的 ParentId 不等于 libraryId（说明有中间层被跳过）
            var needsParentFetch = false;
            var parentIdsToFetch = {};
            items.forEach(function(item) {
                if (item.ParentId && item.ParentId !== libraryId) {
                    needsParentFetch = true;
                    parentIdsToFetch[item.ParentId] = true;
                }
            });

            if (needsParentFetch && Object.keys(parentIdsToFetch).length > 0) {
                // 使用递归查询获取完整树（包括被跳过的中间层）
                var recursiveUrl = apiClient.getUrl('/SubtitleManager/Items', {
                    ParentId: libraryId,
                    Recursive: true,
                    Limit: 500
                });

                apiClient.getJSON(recursiveUrl).then(function(recursiveResult) {
                    var allItems = recursiveResult.Items || [];

                    // 构建 ID 映射
                    var itemMap = {};
                    allItems.forEach(function(item) {
                        itemMap[item.Id] = item;
                    });

                    // 找出根节点（ParentId === libraryId 的项，或父级不在结果中的项）
                    var rootItems = [];
                    for (var id in itemMap) {
                        var item = itemMap[id];
                        if (item.ParentId === libraryId || !itemMap[item.ParentId]) {
                            rootItems.push(item);
                        }
                    }

                    var ul = createItemList(view, rootItems);
                    treeContainer.appendChild(ul);
                }).catch(function(error) {
                    console.error('获取完整树失败，降级显示:', error);
                    // 降级：显示原始结果
                    var ul = createItemList(view, items);
                    treeContainer.appendChild(ul);
                });
            } else {
                // 正常情况：直接显示
                var ul = createItemList(view, items);
                treeContainer.appendChild(ul);
            }
        }).catch(function (error) {
            loading.hide();
            console.error('加载媒体失败:', error);
            showMessage('加载媒体失败: ' + error.message, true);
        });
    }

    // 递归搜索（用于搜索框）
    function searchRecursive(view, libraryId, searchText) {
        loading.show();
        var apiClient = getApiClient();

        // 获取所有项（不在 API 层过滤，这样才能获取完整的父级关系）
        var url = apiClient.getUrl('/SubtitleManager/Items', {
            ParentId: libraryId,
            Recursive: true,
            Limit: 2000  // 增加限制以获取更多项
        });

        apiClient.getJSON(url).then(function (result) {
            loading.hide();
            var allItems = result.Items || [];

            // 在前端过滤搜索结果（包含文件夹和媒体文件）
            var matchedItems = allItems.filter(function (item) {
                return item.Name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
            });

            // 渲染搜索结果（树形结构）
            renderSearchResultsAsTree(view, matchedItems, allItems, libraryId);
        }).catch(function (error) {
            loading.hide();
            console.error('搜索媒体失败:', error);
            showMessage('搜索媒体失败: ' + error.message, true);
        });
    }

    // 渲染搜索结果为树形结构
    function renderSearchResultsAsTree(view, matchedItems, allItems, libraryId) {
        var treeContainer = view.querySelector('#mediaTree');
        treeContainer.innerHTML = '';

        if (matchedItems.length === 0) {
            treeContainer.innerHTML = '<div class="fieldDescription">未找到匹配的媒体项</div>';
            return;
        }

        // 创建 ID 到项的映射
        var itemMap = {};
        allItems.forEach(function (item) {
            itemMap[item.Id] = item;
        });

        // 找到所有需要显示的项（匹配项及其所有父级）
        var itemsToShow = {};
        var itemsToExpand = {};
        var matchedItemIds = {}; // 记录哪些是真正匹配的项

        matchedItems.forEach(function (matchedItem) {
            // 标记匹配项
            itemsToShow[matchedItem.Id] = matchedItem;
            matchedItemIds[matchedItem.Id] = true;

            // 如果匹配项本身是文件夹，也标记为需要展开（它可能有子项也匹配了）
            if (isFolder(matchedItem.Type)) {
                itemsToExpand[matchedItem.Id] = true;
            }

            // 向上查找所有父级，但只添加父级的父级也在搜索结果中的父级
            var currentId = matchedItem.ParentId;
            var depth = 0;
            while (currentId && depth < 10) {
                // 检查父级是否在 allItems 中（即在搜索范围内）
                if (!itemMap[currentId]) {
                    break;
                }

                var parentItem = itemMap[currentId];

                // 如果父级已经在结果中
                if (itemsToShow[parentItem.Id]) {
                    // 如果父级不是匹配项（是其他匹配项的父级），则标记为需要展开
                    if (!matchedItemIds[parentItem.Id]) {
                        itemsToExpand[parentItem.Id] = true;
                    }
                    break;
                }

                itemsToShow[parentItem.Id] = parentItem;
                // 父级需要自动展开（因为它包含匹配的子项）
                itemsToExpand[parentItem.Id] = true;
                currentId = parentItem.ParentId;
                depth++;
            }
        });

        // 找出根节点：优先使用 ParentId === libraryId 的项（与正常加载一致）
        var rootItems = [];
        for (var id in itemsToShow) {
            var item = itemsToShow[id];
            if (item.ParentId === libraryId) {
                rootItems.push(item);
            }
        }

        // 如果没有找到 ParentId === libraryId 的项，则使用父级不在结果集中的项作为根节点
        if (rootItems.length === 0) {
            for (var id in itemsToShow) {
                var item = itemsToShow[id];
                if (!itemsToShow[item.ParentId]) {
                    rootItems.push(item);
                }
            }
        }

        if (rootItems.length === 0) {
            treeContainer.innerHTML = '<div class="fieldDescription">未找到匹配的媒体项</div>';
            return;
        }

        // 显示根节点
        var ul = createItemList(view, rootItems);
        treeContainer.appendChild(ul);

        // 自动展开包含匹配项的路径（延迟执行以确保 DOM 已渲染）
        setTimeout(function () {
            rootItems.forEach(function (rootItem) {
                if (itemsToExpand[rootItem.Id]) {
                    autoExpandPath(view, rootItem, itemsToShow, itemsToExpand);
                }
            });
        }, 100);
    }

    // 自动展开路径到匹配项
    function autoExpandPath(view, item, itemsToShow, itemsToExpand) {
        // 找到该项的 DOM 元素（修正选择器）
        var itemDiv = view.querySelector('#mediaTree [data-item-id="' + item.Id + '"]');
        if (!itemDiv) {
            return;
        }

        var liElement = itemDiv.parentElement;
        var iconElement = itemDiv.querySelector('[data-folder-icon="' + item.Id + '"]');

        // 获取子项（只显示在 itemsToShow 中的子项）
        var children = [];
        for (var id in itemsToShow) {
            var childItem = itemsToShow[id];
            if (childItem.ParentId === item.Id) {
                children.push(childItem);
            }
        }

        if (children.length === 0) return;

        // 标记为已展开
        expandedFolders[item.Id] = children;

        // 更新图标
        if (iconElement) {
            iconElement.textContent = '▼ ';
        }

        // 创建子树
        var childTree = createItemList(view, children);
        childTree.style.paddingLeft = '20px';
        liElement.appendChild(childTree);

        // 递归展开子项
        children.forEach(function (child) {
            if (itemsToExpand[child.Id]) {
                setTimeout(function () {
                    autoExpandPath(view, child, itemsToShow, itemsToExpand);
                }, 50);
            }
        });
    }

    // 创建项目列表
    function createItemList(view, items) {
        // 缓存 items（只缓存不存在的，避免覆盖已更新的数据）
        items.forEach(function(item) {
            if (!itemsCache[item.Id]) {
                itemsCache[item.Id] = item;
            }
        });

        var ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        sortItems(items).forEach(function (item) {
            var li = document.createElement('li');
            li.style.padding = '4px 0';

            var itemDiv = document.createElement('div');
            itemDiv.style.cursor = 'pointer';
            itemDiv.style.padding = '4px 8px';
            itemDiv.style.borderRadius = '3px';
            itemDiv.setAttribute('data-item-id', item.Id);

            var itemIsFolder = isFolder(item.Type);

            if (itemIsFolder) {
                // 文件夹
                var icon = document.createElement('span');
                icon.textContent = '▶ ';
                icon.style.display = 'inline-block';
                icon.style.width = '20px';
                icon.style.cursor = 'pointer';
                icon.setAttribute('data-folder-icon', item.Id);

                // 箭头点击：展开/收起
                icon.addEventListener('click', function (e) {
                    e.stopPropagation();
                    toggleFolder(view, item.Id, li, icon);
                });

                itemDiv.appendChild(icon);

                var folderIcon = document.createElement('i');
                folderIcon.className = 'md-icon';
                folderIcon.textContent = getMediaIcon(item.Type);
                folderIcon.style.fontSize = '20px';
                folderIcon.style.marginRight = '6px';
                folderIcon.style.verticalAlign = 'middle';
                itemDiv.appendChild(folderIcon);

                var text = document.createElement('span');
                text.textContent = formatDisplayName(item);
                itemDiv.appendChild(text);

                // 文件夹：整行点击展开/收起
                itemDiv.addEventListener('click', function (e) {
                    e.stopPropagation();
                    toggleFolder(view, item.Id, li, icon);
                });

                // 鼠标悬停效果
                itemDiv.addEventListener('mouseenter', function () {
                    this.style.backgroundColor = 'rgba(255,255,255,0.1)';
                });
                itemDiv.addEventListener('mouseleave', function () {
                    this.style.backgroundColor = '';
                });
            } else {
                // 媒体文件（叶子节点）
                var indent = document.createElement('span');
                indent.style.display = 'inline-block';
                indent.style.width = '20px';
                itemDiv.appendChild(indent);

                var mediaIcon = document.createElement('i');
                mediaIcon.className = 'md-icon';
                mediaIcon.textContent = getMediaIcon(item.Type);
                mediaIcon.style.fontSize = '20px';
                mediaIcon.style.marginRight = '6px';
                mediaIcon.style.verticalAlign = 'middle';
                itemDiv.appendChild(mediaIcon);

                var text = document.createElement('span');
                text.textContent = formatDisplayName(item);
                itemDiv.appendChild(text);

                // 点击显示字幕
                itemDiv.addEventListener('click', function (e) {
                    e.stopPropagation();
                    selectMedia(view, item, itemDiv);
                });

                // 鼠标悬停效果
                itemDiv.addEventListener('mouseenter', function () {
                    this.style.backgroundColor = 'rgba(100,150,200,0.2)';
                });
                itemDiv.addEventListener('mouseleave', function () {
                    if (selectedItemId !== item.Id) {
                        this.style.backgroundColor = '';
                    }
                });
            }

            li.appendChild(itemDiv);
            ul.appendChild(li);
        });

        return ul;
    }

    // 展开/收起文件夹
    function toggleFolder(view, folderId, liElement, iconElement) {
        if (expandedFolders[folderId]) {
            // 已展开，收起
            var childTree = liElement.querySelector('ul');
            if (childTree) {
                childTree.remove();
            }
            delete expandedFolders[folderId];
            iconElement.textContent = '▶ ';
        } else {
            // 未展开，加载子项
            loadFolderChildren(view, folderId, liElement, iconElement);
        }
    }

    // 加载文件夹子项
    function loadFolderChildren(view, folderId, liElement, iconElement) {
        loading.show();
        var apiClient = getApiClient();

        // 使用递归查询获取所有后代项（包括子目录中的媒体文件）
        var url = apiClient.getUrl('/SubtitleManager/Items', {
            ParentId: folderId,
            Recursive: true,
            Limit: 500
        });

        apiClient.getJSON(url).then(function (result) {
            loading.hide();
            var allItems = result.Items || [];

            // 构建树形结构：找出直接子项
            var directChildren = allItems.filter(function(item) {
                return item.ParentId === folderId;
            });

            expandedFolders[folderId] = allItems; // 保存所有后代项，供子级展开使用

            // 更新图标
            if (iconElement) {
                iconElement.textContent = '▼ ';
            }

            // 创建子树（只显示直接子项，但内部会递归构建完整树）
            var childTree = createItemListWithCache(view, directChildren, allItems);
            childTree.style.paddingLeft = '20px';
            liElement.appendChild(childTree);
        }).catch(function (error) {
            loading.hide();
            console.error('加载子项失败:', error);
            showMessage('加载子项失败: ' + error.message, true);
        });
    }

    // 使用缓存的所有项创建列表（用于展开时能找到子项）
    function createItemListWithCache(view, items, allItems) {
        // 缓存 items（只缓存不存在的，避免覆盖已更新的数据）
        allItems.forEach(function(item) {
            if (!itemsCache[item.Id]) {
                itemsCache[item.Id] = item;
            }
        });

        var ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        sortItems(items).forEach(function (item) {
            var li = document.createElement('li');
            li.style.padding = '4px 0';

            var itemDiv = document.createElement('div');
            itemDiv.style.cursor = 'pointer';
            itemDiv.style.padding = '4px 8px';
            itemDiv.style.borderRadius = '3px';
            itemDiv.setAttribute('data-item-id', item.Id);

            var itemIsFolder = isFolder(item.Type);

            if (itemIsFolder) {
                // 文件夹 - 检查是否有子项
                var hasChildren = allItems.some(function(child) {
                    return child.ParentId === item.Id;
                });

                // extras 相关文件夹强制显示箭头（子项存储在后端缓存中）
                var isExtrasFolder = item.Name === 'Extras' || item.Name === 'Featurettes' ||
                                     item.Name === 'Trailers' || item.Name === 'Specials' ||
                                     item.Name === 'Behind The Scenes' || item.Name === 'Deleted Scenes' ||
                                     item.Name === 'Interviews' || item.Name === 'Scenes' ||
                                     item.Name === 'Samples' || item.Name === 'Clips';

                if (hasChildren || isExtrasFolder) {
                    var icon = document.createElement('span');
                    icon.textContent = '▶ ';
                    icon.style.display = 'inline-block';
                    icon.style.width = '20px';
                    icon.style.cursor = 'pointer';
                    icon.setAttribute('data-folder-icon', item.Id);

                    // 箭头点击：展开/收起
                    icon.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleFolderWithCache(view, item.Id, li, icon, allItems);
                    });

                    itemDiv.appendChild(icon);

                    var folderIcon = document.createElement('i');
                    folderIcon.className = 'md-icon';
                    folderIcon.textContent = getMediaIcon(item.Type);
                    folderIcon.style.fontSize = '20px';
                    folderIcon.style.marginRight = '6px';
                    folderIcon.style.verticalAlign = 'middle';
                    itemDiv.appendChild(folderIcon);

                    var text = document.createElement('span');
                    text.textContent = formatDisplayName(item);
                    itemDiv.appendChild(text);

                    // 文件夹：整行点击展开/收起
                    itemDiv.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleFolderWithCache(view, item.Id, li, icon, allItems);
                    });

                    // 鼠标悬停效果
                    itemDiv.addEventListener('mouseenter', function () {
                        this.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    });
                    itemDiv.addEventListener('mouseleave', function () {
                        this.style.backgroundColor = '';
                    });
                } else {
                    // 文件夹但无子项，显示为普通项
                    var folderIcon = document.createElement('i');
                    folderIcon.className = 'md-icon';
                    folderIcon.textContent = getMediaIcon(item.Type);
                    folderIcon.style.fontSize = '20px';
                    folderIcon.style.marginRight = '6px';
                    folderIcon.style.marginLeft = '20px';
                    folderIcon.style.verticalAlign = 'middle';
                    itemDiv.appendChild(folderIcon);

                    var text = document.createElement('span');
                    text.textContent = formatDisplayName(item);
                    itemDiv.appendChild(text);
                }
            } else {
                // 叶子节点（视频等）
                var mediaIcon = document.createElement('i');
                mediaIcon.className = 'md-icon';
                mediaIcon.textContent = getMediaIcon(item.Type);
                mediaIcon.style.fontSize = '20px';
                mediaIcon.style.marginRight = '6px';
                mediaIcon.style.marginLeft = '20px';
                mediaIcon.style.verticalAlign = 'middle';
                itemDiv.appendChild(mediaIcon);

                var text = document.createElement('span');
                text.textContent = formatDisplayName(item);
                itemDiv.appendChild(text);

                // 点击选择
                itemDiv.addEventListener('click', function (e) {
                    e.stopPropagation();
                    selectMedia(view, item, itemDiv);
                });

                // 鼠标悬停效果
                itemDiv.addEventListener('mouseenter', function () {
                    if (selectedItemId !== item.Id) {
                        this.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                });
                itemDiv.addEventListener('mouseleave', function () {
                    if (selectedItemId !== item.Id) {
                        this.style.backgroundColor = '';
                    }
                });

                // 如果是当前选中的项，设置背景色
                if (selectedItemId === item.Id) {
                    itemDiv.style.backgroundColor = 'rgba(100,150,200,0.3)';
                }
            }

            li.appendChild(itemDiv);
            ul.appendChild(li);
        });

        return ul;
    }

    // 使用缓存的数据展开/收起文件夹
    function toggleFolderWithCache(view, folderId, liElement, iconElement, allItems) {
        if (expandedFolders[folderId]) {
            // 已展开，收起
            var childTree = liElement.querySelector('ul');
            if (childTree) {
                childTree.remove();
            }
            delete expandedFolders[folderId];
            iconElement.textContent = '▶ ';
        } else {
            // 未展开，检查是否需要从后端加载
            var children = allItems.filter(function(item) {
                return item.ParentId === folderId;
            });

            // 查找当前文件夹信息
            var currentFolder = allItems.find(function(item) {
                return item.Id === folderId;
            });

            // 判断是否需要从后端加载
            // 1. 没有找到子项
            // 2. 或者当前是 Folder 类型（电影文件夹，需要获取 extras）
            var needBackendLoad = (children.length === 0) || (currentFolder && currentFolder.Type === 'Folder');

            if (needBackendLoad) {
                loading.show();
                var apiClient = getApiClient();
                var url = apiClient.getUrl('/SubtitleManager/Items', {
                    ParentId: folderId,
                    Recursive: false,
                    Limit: 200
                });

                apiClient.getJSON(url).then(function (result) {
                    loading.hide();
                    var items = result.Items || [];

                    if (items.length === 0) {
                        return;
                    }

                    expandedFolders[folderId] = items;

                    // 更新图标
                    if (iconElement) {
                        iconElement.textContent = '▼ ';
                    }

                    // 创建子树
                    var childTree = createItemListWithCache(view, items, items);
                    childTree.style.paddingLeft = '20px';
                    liElement.appendChild(childTree);
                }).catch(function(err) {
                    loading.hide();
                });
                return;
            }

            expandedFolders[folderId] = allItems;

            // 更新图标
            if (iconElement) {
                iconElement.textContent = '▼ ';
            }

            // 创建子树
            var childTree = createItemListWithCache(view, children, allItems);
            childTree.style.paddingLeft = '20px';
            liElement.appendChild(childTree);
        }
    }

    // 选择媒体项
    function selectMedia(view, item, itemDiv) {
        // 清除之前的选中状态
        view.querySelectorAll('#mediaTree div[data-item-id]').forEach(function (div) {
            if (div.getAttribute('data-item-id') === selectedItemId) {
                div.style.backgroundColor = '';
            }
        });

        // 设置新的选中状态
        selectedItemId = item.Id;
        if (itemDiv) {
            itemDiv.style.backgroundColor = 'rgba(100,150,200,0.3)';
        }

        // 优先从缓存读取最新数据；字幕流按需加载，避免媒体列表接口过重
        var displayItem = itemsCache[item.Id] || item;
        if (displayItem.SubtitlesLoaded) {
            showCurrentSubtitles(view, displayItem);
        } else {
            showCurrentSubtitlesLoading(view);
            reloadMediaItem(view, item.Id);
        }
    }

    // 显示当前字幕加载状态
    function showCurrentSubtitlesLoading(view) {
        var container = view.querySelector('#currentSubtitles');
        container.innerHTML = '<div class="fieldDescription">正在加载字幕...</div>';
    }

    // 显示当前字幕
    function showCurrentSubtitles(view, item) {
        var container = view.querySelector('#currentSubtitles');

        if (!item || !item.Subtitles || item.Subtitles.length === 0) {
            container.innerHTML = '<div class="fieldDescription">该媒体项暂无字幕</div>';
            return;
        }

        container.innerHTML = '';
        var paperList = document.createElement('div');
        paperList.className = 'paperList';

        item.Subtitles.forEach(function (sub, index) {
            var listItem = document.createElement('div');
            listItem.className = 'listItem';
            listItem.style.display = 'flex';
            listItem.style.alignItems = 'center';

            var listItemBody = document.createElement('div');
            listItemBody.className = 'listItemBody two-line';
            listItemBody.style.flex = '1';

            var textDiv1 = document.createElement('div');
            textDiv1.className = 'listItemBodyText';
            textDiv1.textContent = (index + 1) + '. ' + (sub.DisplayLanguage || sub.Language || '未知语言');
            if (sub.IsForced) {
                textDiv1.textContent += ' [强制]';
            }
            if (sub.IsExternal) {
                textDiv1.textContent += ' [外部]';
            }
            listItemBody.appendChild(textDiv1);

            if (sub.Path) {
                var textDiv2 = document.createElement('div');
                textDiv2.className = 'listItemBodyText secondary';
                textDiv2.textContent = sub.Path;
                listItemBody.appendChild(textDiv2);
            }

            listItem.appendChild(listItemBody);

            // 添加删除按钮（只对外部字幕显示）
            if (sub.IsExternal && sub.Path) {
                var deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'paper-icon-button-light';
                deleteBtn.title = '删除字幕';
                deleteBtn.style.marginLeft = '10px';
                deleteBtn.innerHTML = '<i class="md-icon">delete</i>';

                deleteBtn.addEventListener('click', function() {
                    deleteSubtitle(view, item, sub);
                });

                listItem.appendChild(deleteBtn);
            }

            paperList.appendChild(listItem);
        });

        container.appendChild(paperList);
    }

    // 删除字幕
    function deleteSubtitle(view, item, subtitle) {
        Dashboard.confirm('确定要删除该字幕吗？', '删除字幕', function(confirmed) {
            if (!confirmed) {
                return;
            }

            loading.show();
            var apiClient = getApiClient();

            var url = apiClient.getUrl('/SubtitleManager/DeleteSubtitle', {
                ItemId: item.Id,
                SubtitlePath: subtitle.Path
            });

            // 使用 fetch 发送 POST 请求
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-Emby-Token': apiClient.accessToken()
                }
            }).then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            }).then(function(data) {
                loading.hide();
                showMessage(data.Message || '字幕删除成功', !data.Success);

                if (data.Success) {
                    // 延迟刷新，等待服务器元数据更新
                    setTimeout(function() {
                        reloadMediaItem(view, item.Id);
                    }, 500);
                }
            }).catch(function(error) {
                loading.hide();
                console.error('删除字幕失败:', error);
                showMessage('删除字幕失败: ' + error.message, true);
            });
        });
    }

    // 重新加载媒体项信息（只更新右侧字幕显示，不影响左侧树）
    function reloadMediaItem(view, itemId) {
        // 使用 Emby 官方 API 获取单个媒体项信息
        loading.show();
        var apiClient = getApiClient();
        var userId = apiClient.getCurrentUserId();

        // 通过 Emby API 直接获取 Item 及其字幕信息
        apiClient.getItem(userId, itemId).then(function(embyItem) {
            loading.hide();
            var cachedItem = itemsCache[itemId] || {};

            // 将 Emby Item 转换为我们的格式
            // 重要：使用传入的 itemId，而不是 embyItem.Id，保持格式一致
            var item = {
                Id: itemId,  // 使用传入的 itemId（GUID 格式）
                Name: embyItem.Name || cachedItem.Name,
                Type: embyItem.Type || cachedItem.Type,
                Path: cachedItem.Path,
                ParentId: cachedItem.ParentId,
                IndexNumber: cachedItem.IndexNumber,
                Subtitles: [],
                SubtitlesLoaded: true
            };

            // 获取字幕流信息
            if (embyItem.MediaStreams) {
                item.Subtitles = embyItem.MediaStreams
                    .filter(function(s) { return s.Type === 'Subtitle'; })
                    .map(function(s) {
                        return {
                            Language: s.Language,
                            DisplayLanguage: s.DisplayLanguage || s.Language,
                            Path: s.Path,
                            IsForced: s.IsForced,
                            IsExternal: s.IsExternal
                        };
                    });
            }

            // 更新缓存（使用传入的 itemId 作为 key）
            itemsCache[itemId] = item;

            // 更新右侧显示
            showCurrentSubtitles(view, item);
        }).catch(function(error) {
            loading.hide();
            console.error('重新加载失败:', error);
            showMessage('刷新字幕信息失败', true);
        });
    }

    // 上传字幕
    function uploadSubtitle(view) {
        if (!selectedItemId) {
            showMessage('请选择媒体项', true);
            return;
        }

        var language = view.querySelector('#selectLanguage').value;
        var format = view.querySelector('#selectFormat').value;
        var isForced = view.querySelector('#chkForced').checked;
        var fileInput = view.querySelector('#subtitleFile');

        if (!fileInput.files || fileInput.files.length === 0) {
            showMessage('请选择字幕文件', true);
            return;
        }

        var file = fileInput.files[0];
        var normalizedFormat = format.toLowerCase();
        var fileName = file.name || '';
        var fileExtension = fileName.indexOf('.') === -1 ? '' : fileName.split('.').pop().toLowerCase();

        if (file.size === 0) {
            showMessage('字幕文件为空', true);
            return;
        }

        if (file.size > maxSubtitleFileSize) {
            showMessage('字幕文件超过 20MB 限制', true);
            return;
        }

        if (allowedSubtitleFormats.indexOf(normalizedFormat) === -1) {
            showMessage('字幕格式无效', true);
            return;
        }

        if (fileExtension !== normalizedFormat) {
            showMessage('字幕文件扩展名与选择的格式不一致', true);
            return;
        }

        loading.show();
        var apiClient = getApiClient();

        var url = apiClient.getUrl('/SubtitleManager/Upload', {
            ItemId: selectedItemId,
            Language: language,
            Format: format,
            IsForced: isForced
        });

        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('X-Emby-Token', apiClient.accessToken());

        xhr.onload = function () {
            loading.hide();
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.Success) {
                        // 清空文件选择
                        fileInput.value = '';
                        view.querySelector('#selectedFileName').textContent = '未选择文件';
                        view.querySelector('#selectedFileName').style.color = 'rgba(255,255,255,0.7)';

                        // 显示成功消息
                        showMessage('字幕上传成功', false);

                        // 刷新当前媒体项的字幕信息（不重置树结构）
                        setTimeout(function() {
                            reloadMediaItem(view, selectedItemId);
                        }, 500);
                    } else {
                        showMessage('上传失败: ' + response.Message, true);
                    }
                } catch (e) {
                    console.error('解析响应失败:', e);
                    showMessage('解析响应失败: ' + e.message, true);
                }
            } else {
                showMessage('上传失败: HTTP ' + xhr.status, true);
            }
        };

        xhr.onerror = function () {
            loading.hide();
            showMessage('上传失败: 网络错误', true);
        };

        xhr.send(file);
    }

    // View构造函数
    function View(view, params) {
        BaseView.apply(this, arguments);

        // 加载媒体库列表
        loadLibraries(view);

        // 绑定搜索按钮
        view.querySelector('#btnSearch').addEventListener('click', function () {
            expandedFolders = {}; // 清空展开状态
            itemsCache = {}; // 清空媒体项缓存
            searchMedia(view);
        });

        // 绑定选择文件按钮
        var fileInput = view.querySelector('#subtitleFile');
        var selectedFileNameSpan = view.querySelector('#selectedFileName');

        view.querySelector('#btnSelectFile').addEventListener('click', function () {
            fileInput.click();
        });

        // 文件选择后显示文件名
        fileInput.addEventListener('change', function () {
            if (fileInput.files && fileInput.files.length > 0) {
                selectedFileNameSpan.textContent = fileInput.files[0].name;
                selectedFileNameSpan.style.color = 'rgba(255,255,255,0.9)';
            } else {
                selectedFileNameSpan.textContent = '未选择文件';
                selectedFileNameSpan.style.color = 'rgba(255,255,255,0.7)';
            }
        });

        // 绑定上传按钮
        view.querySelector('#btnUpload').addEventListener('click', function () {
            uploadSubtitle(view);
        });

        // 支持回车搜索
        view.querySelector('#searchBox').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                expandedFolders = {}; // 清空展开状态
                searchMedia(view);
            }
        });
    }

    // 继承BaseView原型
    Object.assign(View.prototype, BaseView.prototype);

    // 实现onResume生命周期方法
    View.prototype.onResume = function (options) {
        BaseView.prototype.onResume.apply(this, arguments);
    };

    return View;
});
