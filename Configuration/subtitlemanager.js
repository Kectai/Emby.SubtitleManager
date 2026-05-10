define(['baseView', 'loading', 'emby-input', 'emby-button', 'emby-select', 'emby-toggle'], function (BaseView, loading) {
    'use strict';

    var selectedItemId = null;
    var expandedFolders = {}; // 记录已展开的文件夹
    var itemsCache = {}; // 缓存所有媒体项数据（key: itemId, value: item对象）
    var maxSubtitleFileSize = 20 * 1024 * 1024;
    var itemsPageSize = 200;
    var searchPageSize = 200;
    var allowedSubtitleFormats = ['srt', 'ass', 'ssa', 'vtt', 'sub'];
    var currentCulture = 'en-US';
    var translations = {
        'en-US': {
            chooseMedia: 'Choose Media',
            mediaLibrary: 'Media Library',
            loading: 'Loading...',
            searchMedia: 'Search Media',
            searchPlaceholder: 'Enter a media name to search (optional)',
            searchDescription: 'Search or load the full media tree',
            loadMediaList: 'Load Media List',
            mediaItems: 'Media Items',
            loadListFirst: 'Select a media library and load the list first',
            currentSubtitles: 'Current Subtitles',
            selectMediaToViewSubtitles: 'Select a media item to view subtitles',
            uploadNewSubtitle: 'Upload New Subtitle',
            subtitleLanguage: 'Subtitle Language',
            subtitleFormat: 'Subtitle Format',
            forcedSubtitle: 'Forced Subtitle',
            forcedDescription: 'For subtitles shown only during foreign-language dialogue',
            subtitleFile: 'Subtitle File',
            selectFile: 'Select File',
            noFileSelected: 'No file selected',
            supportedFormats: 'Supported formats: SRT, ASS, SSA, VTT, SUB',
            uploadSubtitle: 'Upload Subtitle',
            chooseLibraryOption: 'Select a media library',
            noLibrariesFound: 'No media libraries found',
            loadLibrariesFailed: 'Failed to load media libraries: {message}',
            pleaseSelectLibrary: 'Please select a media library first',
            emptyLibrary: 'No items found in this media library',
            loadMediaFailed: 'Failed to load media: {message}',
            searchMediaFailed: 'Failed to search media: {message}',
            loadChildrenFailed: 'Failed to load child items: {message}',
            noMatchingItems: 'No matching media items found',
            loadMore: 'Load more',
            loadingSubtitles: 'Loading subtitles...',
            noSubtitles: 'This media item has no subtitles',
            unknownLanguage: 'Unknown language',
            forcedTag: 'Forced',
            externalTag: 'External',
            deleteSubtitle: 'Delete Subtitle',
            deleteSubtitleConfirm: 'Are you sure you want to delete this subtitle?',
            deleteSubtitleSuccess: 'Subtitle deleted successfully',
            deleteSubtitleFailed: 'Failed to delete subtitle: {message}',
            refreshSubtitlesFailed: 'Failed to refresh subtitle information',
            selectMediaItem: 'Please select a media item',
            selectSubtitleFile: 'Please select a subtitle file',
            subtitleFileEmpty: 'Subtitle file is empty',
            subtitleFileTooLarge: 'Subtitle file exceeds the 20 MB limit',
            invalidSubtitleFormat: 'Invalid subtitle format',
            extensionMismatch: 'Subtitle file extension does not match the selected format',
            uploadSubtitleSuccess: 'Subtitle uploaded successfully',
            uploadSubtitleFailed: 'Upload failed: {message}',
            parseResponseFailed: 'Failed to parse response: {message}',
            uploadNetworkError: 'Upload failed: network error',
            unknownError: 'Unknown error',
            successTitle: 'Success',
            errorTitle: 'Error',
            seasonNumber: 'Season {number}',
            seasonWords: ['season'],
            langZh: 'Chinese',
            langZhHans: 'Chinese Simplified',
            langZhHant: 'Chinese Traditional',
            langZhHantHk: 'Chinese Traditional (Hong Kong)',
            langEn: 'English',
            langJa: 'Japanese',
            langKo: 'Korean',
            langFr: 'French',
            langDe: 'German',
            langEs: 'Spanish'
        },
        'zh-CN': {
            chooseMedia: '选择媒体',
            mediaLibrary: '媒体库',
            loading: '加载中...',
            searchMedia: '搜索媒体',
            searchPlaceholder: '输入媒体名称进行搜索（可选）',
            searchDescription: '可以搜索或直接加载完整树形列表',
            loadMediaList: '加载媒体列表',
            mediaItems: '媒体项',
            loadListFirst: '请先选择媒体库并加载列表',
            currentSubtitles: '当前字幕',
            selectMediaToViewSubtitles: '请先选择媒体项以查看当前字幕',
            uploadNewSubtitle: '上传新字幕',
            subtitleLanguage: '字幕语言',
            subtitleFormat: '字幕格式',
            forcedSubtitle: '强制字幕',
            forcedDescription: '用于仅在外语对话时显示的字幕',
            subtitleFile: '字幕文件',
            selectFile: '选择文件',
            noFileSelected: '未选择文件',
            supportedFormats: '支持格式: SRT, ASS, SSA, VTT, SUB',
            uploadSubtitle: '上传字幕',
            chooseLibraryOption: '请选择媒体库',
            noLibrariesFound: '未找到媒体库',
            loadLibrariesFailed: '加载媒体库失败: {message}',
            pleaseSelectLibrary: '请先选择媒体库',
            emptyLibrary: '此媒体库下没有项目',
            loadMediaFailed: '加载媒体失败: {message}',
            searchMediaFailed: '搜索媒体失败: {message}',
            loadChildrenFailed: '加载子项失败: {message}',
            noMatchingItems: '未找到匹配的媒体项',
            loadMore: '加载更多',
            loadingSubtitles: '正在加载字幕...',
            noSubtitles: '该媒体项暂无字幕',
            unknownLanguage: '未知语言',
            forcedTag: '强制',
            externalTag: '外部',
            deleteSubtitle: '删除字幕',
            deleteSubtitleConfirm: '确定要删除该字幕吗？',
            deleteSubtitleSuccess: '字幕删除成功',
            deleteSubtitleFailed: '删除字幕失败: {message}',
            refreshSubtitlesFailed: '刷新字幕信息失败',
            selectMediaItem: '请选择媒体项',
            selectSubtitleFile: '请选择字幕文件',
            subtitleFileEmpty: '字幕文件为空',
            subtitleFileTooLarge: '字幕文件超过 20MB 限制',
            invalidSubtitleFormat: '字幕格式无效',
            extensionMismatch: '字幕文件扩展名与选择的格式不一致',
            uploadSubtitleSuccess: '字幕上传成功',
            uploadSubtitleFailed: '上传失败: {message}',
            parseResponseFailed: '解析响应失败: {message}',
            uploadNetworkError: '上传失败: 网络错误',
            unknownError: '未知错误',
            successTitle: '成功',
            errorTitle: '错误',
            seasonNumber: '第 {number} 季',
            seasonWords: ['季', 'season'],
            langZh: '中文',
            langZhHans: '简体中文',
            langZhHant: '繁体中文',
            langZhHantHk: '繁体中文（香港）',
            langEn: '英语',
            langJa: '日语',
            langKo: '韩语',
            langFr: '法语',
            langDe: '德语',
            langEs: '西班牙语'
        },
        'zh-TW': {
            chooseMedia: '選擇媒體',
            mediaLibrary: '媒體庫',
            loading: '載入中...',
            searchMedia: '搜尋媒體',
            searchPlaceholder: '輸入媒體名稱進行搜尋（選填）',
            searchDescription: '可以搜尋或直接載入完整樹狀清單',
            loadMediaList: '載入媒體清單',
            mediaItems: '媒體項目',
            loadListFirst: '請先選擇媒體庫並載入清單',
            currentSubtitles: '目前字幕',
            selectMediaToViewSubtitles: '請先選擇媒體項目以查看目前字幕',
            uploadNewSubtitle: '上傳新字幕',
            subtitleLanguage: '字幕語言',
            subtitleFormat: '字幕格式',
            forcedSubtitle: '強制字幕',
            forcedDescription: '用於僅在外語對話時顯示的字幕',
            subtitleFile: '字幕檔案',
            selectFile: '選擇檔案',
            noFileSelected: '尚未選擇檔案',
            supportedFormats: '支援格式: SRT, ASS, SSA, VTT, SUB',
            uploadSubtitle: '上傳字幕',
            chooseLibraryOption: '請選擇媒體庫',
            noLibrariesFound: '找不到媒體庫',
            loadLibrariesFailed: '載入媒體庫失敗: {message}',
            pleaseSelectLibrary: '請先選擇媒體庫',
            emptyLibrary: '此媒體庫下沒有項目',
            loadMediaFailed: '載入媒體失敗: {message}',
            searchMediaFailed: '搜尋媒體失敗: {message}',
            loadChildrenFailed: '載入子項失敗: {message}',
            noMatchingItems: '找不到符合的媒體項目',
            loadMore: '載入更多',
            loadingSubtitles: '正在載入字幕...',
            noSubtitles: '此媒體項目沒有字幕',
            unknownLanguage: '未知語言',
            forcedTag: '強制',
            externalTag: '外部',
            deleteSubtitle: '刪除字幕',
            deleteSubtitleConfirm: '確定要刪除此字幕嗎？',
            deleteSubtitleSuccess: '字幕刪除成功',
            deleteSubtitleFailed: '刪除字幕失敗: {message}',
            refreshSubtitlesFailed: '重新整理字幕資訊失敗',
            selectMediaItem: '請選擇媒體項目',
            selectSubtitleFile: '請選擇字幕檔案',
            subtitleFileEmpty: '字幕檔案為空',
            subtitleFileTooLarge: '字幕檔案超過 20MB 限制',
            invalidSubtitleFormat: '字幕格式無效',
            extensionMismatch: '字幕檔案副檔名與選擇的格式不一致',
            uploadSubtitleSuccess: '字幕上傳成功',
            uploadSubtitleFailed: '上傳失敗: {message}',
            parseResponseFailed: '解析回應失敗: {message}',
            uploadNetworkError: '上傳失敗: 網路錯誤',
            unknownError: '未知錯誤',
            successTitle: '成功',
            errorTitle: '錯誤',
            seasonNumber: '第 {number} 季',
            seasonWords: ['季', 'season'],
            langZh: '中文',
            langZhHans: '簡體中文',
            langZhHant: '繁體中文',
            langZhHantHk: '繁體中文（香港）',
            langEn: '英文',
            langJa: '日文',
            langKo: '韓文',
            langFr: '法文',
            langDe: '德文',
            langEs: '西班牙文'
        },
        'zh-HK': {
            chooseMedia: '選擇媒體',
            mediaLibrary: '媒體庫',
            loading: '載入中...',
            searchMedia: '搜尋媒體',
            searchPlaceholder: '輸入媒體名稱搜尋（可選）',
            searchDescription: '可以搜尋或直接載入完整樹狀清單',
            loadMediaList: '載入媒體清單',
            mediaItems: '媒體項目',
            loadListFirst: '請先選擇媒體庫並載入清單',
            currentSubtitles: '目前字幕',
            selectMediaToViewSubtitles: '請先選擇媒體項目以查看目前字幕',
            uploadNewSubtitle: '上載新字幕',
            subtitleLanguage: '字幕語言',
            subtitleFormat: '字幕格式',
            forcedSubtitle: '強制字幕',
            forcedDescription: '用於只在外語對話時顯示的字幕',
            subtitleFile: '字幕檔案',
            selectFile: '選擇檔案',
            noFileSelected: '尚未選擇檔案',
            supportedFormats: '支援格式: SRT, ASS, SSA, VTT, SUB',
            uploadSubtitle: '上載字幕',
            chooseLibraryOption: '請選擇媒體庫',
            noLibrariesFound: '找不到媒體庫',
            loadLibrariesFailed: '載入媒體庫失敗: {message}',
            pleaseSelectLibrary: '請先選擇媒體庫',
            emptyLibrary: '此媒體庫沒有項目',
            loadMediaFailed: '載入媒體失敗: {message}',
            searchMediaFailed: '搜尋媒體失敗: {message}',
            loadChildrenFailed: '載入子項失敗: {message}',
            noMatchingItems: '找不到符合的媒體項目',
            loadMore: '載入更多',
            loadingSubtitles: '正在載入字幕...',
            noSubtitles: '此媒體項目沒有字幕',
            unknownLanguage: '未知語言',
            forcedTag: '強制',
            externalTag: '外部',
            deleteSubtitle: '刪除字幕',
            deleteSubtitleConfirm: '確定要刪除此字幕嗎？',
            deleteSubtitleSuccess: '字幕刪除成功',
            deleteSubtitleFailed: '刪除字幕失敗: {message}',
            refreshSubtitlesFailed: '重新整理字幕資訊失敗',
            selectMediaItem: '請選擇媒體項目',
            selectSubtitleFile: '請選擇字幕檔案',
            subtitleFileEmpty: '字幕檔案為空',
            subtitleFileTooLarge: '字幕檔案超過 20MB 限制',
            invalidSubtitleFormat: '字幕格式無效',
            extensionMismatch: '字幕檔案副檔名與所選格式不一致',
            uploadSubtitleSuccess: '字幕上載成功',
            uploadSubtitleFailed: '上載失敗: {message}',
            parseResponseFailed: '解析回應失敗: {message}',
            uploadNetworkError: '上載失敗: 網絡錯誤',
            unknownError: '未知錯誤',
            successTitle: '成功',
            errorTitle: '錯誤',
            seasonNumber: '第 {number} 季',
            seasonWords: ['季', 'season'],
            langZh: '中文',
            langZhHans: '簡體中文',
            langZhHant: '繁體中文',
            langZhHantHk: '繁體中文（香港）',
            langEn: '英文',
            langJa: '日文',
            langKo: '韓文',
            langFr: '法文',
            langDe: '德文',
            langEs: '西班牙文'
        },
        'ja': {
            chooseMedia: 'メディアを選択',
            mediaLibrary: 'メディアライブラリ',
            loading: '読み込み中...',
            searchMedia: 'メディアを検索',
            searchPlaceholder: '検索するメディア名を入力（任意）',
            searchDescription: '検索するか、完全なツリー一覧を読み込みます',
            loadMediaList: 'メディア一覧を読み込む',
            mediaItems: 'メディア項目',
            loadListFirst: '先にメディアライブラリを選択して一覧を読み込んでください',
            currentSubtitles: '現在の字幕',
            selectMediaToViewSubtitles: '字幕を表示するメディア項目を選択してください',
            uploadNewSubtitle: '新しい字幕をアップロード',
            subtitleLanguage: '字幕言語',
            subtitleFormat: '字幕形式',
            forcedSubtitle: '強制字幕',
            forcedDescription: '外国語の会話時のみ表示する字幕に使用します',
            subtitleFile: '字幕ファイル',
            selectFile: 'ファイルを選択',
            noFileSelected: 'ファイルが選択されていません',
            supportedFormats: '対応形式: SRT, ASS, SSA, VTT, SUB',
            uploadSubtitle: '字幕をアップロード',
            chooseLibraryOption: 'メディアライブラリを選択',
            noLibrariesFound: 'メディアライブラリが見つかりません',
            loadLibrariesFailed: 'メディアライブラリの読み込みに失敗しました: {message}',
            pleaseSelectLibrary: '先にメディアライブラリを選択してください',
            emptyLibrary: 'このメディアライブラリには項目がありません',
            loadMediaFailed: 'メディアの読み込みに失敗しました: {message}',
            searchMediaFailed: 'メディアの検索に失敗しました: {message}',
            loadChildrenFailed: '子項目の読み込みに失敗しました: {message}',
            noMatchingItems: '一致するメディア項目が見つかりません',
            loadMore: 'さらに読み込む',
            loadingSubtitles: '字幕を読み込み中...',
            noSubtitles: 'このメディア項目には字幕がありません',
            unknownLanguage: '不明な言語',
            forcedTag: '強制',
            externalTag: '外部',
            deleteSubtitle: '字幕を削除',
            deleteSubtitleConfirm: 'この字幕を削除しますか？',
            deleteSubtitleSuccess: '字幕を削除しました',
            deleteSubtitleFailed: '字幕の削除に失敗しました: {message}',
            refreshSubtitlesFailed: '字幕情報の更新に失敗しました',
            selectMediaItem: 'メディア項目を選択してください',
            selectSubtitleFile: '字幕ファイルを選択してください',
            subtitleFileEmpty: '字幕ファイルが空です',
            subtitleFileTooLarge: '字幕ファイルが 20 MB の制限を超えています',
            invalidSubtitleFormat: '字幕形式が無効です',
            extensionMismatch: '字幕ファイルの拡張子が選択した形式と一致しません',
            uploadSubtitleSuccess: '字幕をアップロードしました',
            uploadSubtitleFailed: 'アップロードに失敗しました: {message}',
            parseResponseFailed: 'レスポンスの解析に失敗しました: {message}',
            uploadNetworkError: 'アップロードに失敗しました: ネットワークエラー',
            unknownError: '不明なエラー',
            successTitle: '成功',
            errorTitle: 'エラー',
            seasonNumber: 'シーズン {number}',
            seasonWords: ['シーズン', 'season'],
            langZh: '中国語',
            langZhHans: '中国語（簡体字）',
            langZhHant: '中国語（繁体字）',
            langZhHantHk: '中国語（繁体字、香港）',
            langEn: '英語',
            langJa: '日本語',
            langKo: '韓国語',
            langFr: 'フランス語',
            langDe: 'ドイツ語',
            langEs: 'スペイン語'
        },
        'ko': {
            chooseMedia: '미디어 선택',
            mediaLibrary: '미디어 라이브러리',
            loading: '불러오는 중...',
            searchMedia: '미디어 검색',
            searchPlaceholder: '검색할 미디어 이름 입력(선택 사항)',
            searchDescription: '검색하거나 전체 트리 목록을 불러올 수 있습니다',
            loadMediaList: '미디어 목록 불러오기',
            mediaItems: '미디어 항목',
            loadListFirst: '먼저 미디어 라이브러리를 선택하고 목록을 불러오세요',
            currentSubtitles: '현재 자막',
            selectMediaToViewSubtitles: '현재 자막을 보려면 미디어 항목을 선택하세요',
            uploadNewSubtitle: '새 자막 업로드',
            subtitleLanguage: '자막 언어',
            subtitleFormat: '자막 형식',
            forcedSubtitle: '강제 자막',
            forcedDescription: '외국어 대화에서만 표시되는 자막에 사용합니다',
            subtitleFile: '자막 파일',
            selectFile: '파일 선택',
            noFileSelected: '선택된 파일 없음',
            supportedFormats: '지원 형식: SRT, ASS, SSA, VTT, SUB',
            uploadSubtitle: '자막 업로드',
            chooseLibraryOption: '미디어 라이브러리 선택',
            noLibrariesFound: '미디어 라이브러리를 찾을 수 없습니다',
            loadLibrariesFailed: '미디어 라이브러리를 불러오지 못했습니다: {message}',
            pleaseSelectLibrary: '먼저 미디어 라이브러리를 선택하세요',
            emptyLibrary: '이 미디어 라이브러리에 항목이 없습니다',
            loadMediaFailed: '미디어를 불러오지 못했습니다: {message}',
            searchMediaFailed: '미디어 검색에 실패했습니다: {message}',
            loadChildrenFailed: '하위 항목을 불러오지 못했습니다: {message}',
            noMatchingItems: '일치하는 미디어 항목이 없습니다',
            loadMore: '더 불러오기',
            loadingSubtitles: '자막을 불러오는 중...',
            noSubtitles: '이 미디어 항목에는 자막이 없습니다',
            unknownLanguage: '알 수 없는 언어',
            forcedTag: '강제',
            externalTag: '외부',
            deleteSubtitle: '자막 삭제',
            deleteSubtitleConfirm: '이 자막을 삭제하시겠습니까?',
            deleteSubtitleSuccess: '자막이 삭제되었습니다',
            deleteSubtitleFailed: '자막 삭제 실패: {message}',
            refreshSubtitlesFailed: '자막 정보를 새로 고치지 못했습니다',
            selectMediaItem: '미디어 항목을 선택하세요',
            selectSubtitleFile: '자막 파일을 선택하세요',
            subtitleFileEmpty: '자막 파일이 비어 있습니다',
            subtitleFileTooLarge: '자막 파일이 20 MB 제한을 초과했습니다',
            invalidSubtitleFormat: '잘못된 자막 형식입니다',
            extensionMismatch: '자막 파일 확장자가 선택한 형식과 일치하지 않습니다',
            uploadSubtitleSuccess: '자막이 업로드되었습니다',
            uploadSubtitleFailed: '업로드 실패: {message}',
            parseResponseFailed: '응답을 해석하지 못했습니다: {message}',
            uploadNetworkError: '업로드 실패: 네트워크 오류',
            unknownError: '알 수 없는 오류',
            successTitle: '성공',
            errorTitle: '오류',
            seasonNumber: '시즌 {number}',
            seasonWords: ['시즌', 'season'],
            langZh: '중국어',
            langZhHans: '중국어 간체',
            langZhHant: '중국어 번체',
            langZhHantHk: '중국어 번체(홍콩)',
            langEn: '영어',
            langJa: '일본어',
            langKo: '한국어',
            langFr: '프랑스어',
            langDe: '독일어',
            langEs: '스페인어'
        }
    };
    translations['en-GB'] = {};
    Object.keys(translations['en-US']).forEach(function (key) {
        translations['en-GB'][key] = translations['en-US'][key];
    });

    // 获取API客户端
    function getApiClient() {
        return ApiClient;
    }

    function normalizeCulture(culture) {
        var normalized = (culture || '').toString().replace('_', '-').toLowerCase();

        if (normalized === 'zh-cn' || normalized === 'zh-sg' || normalized === 'zh-hans' || normalized === 'zh' ||
                normalized.indexOf('simplified') !== -1) {
            return 'zh-CN';
        }

        if (normalized === 'zh-hk' || normalized === 'zh-hant-hk' || normalized.indexOf('hong kong') !== -1) {
            return 'zh-HK';
        }

        if (normalized === 'zh-tw' || normalized === 'zh-mo' || normalized === 'zh-hant' ||
                normalized.indexOf('traditional') !== -1) {
            return 'zh-TW';
        }

        if (normalized === 'en-gb' || normalized === 'en-uk' || normalized.indexOf('united kingdom') !== -1) {
            return 'en-GB';
        }

        if (normalized === 'ja' || normalized === 'ja-jp' || normalized.indexOf('japanese') !== -1) {
            return 'ja';
        }

        if (normalized === 'ko' || normalized === 'ko-kr' || normalized.indexOf('korean') !== -1) {
            return 'ko';
        }

        if (normalized === 'en' || normalized === 'en-us' || normalized.indexOf('english') !== -1) {
            return 'en-US';
        }

        return 'en-US';
    }

    function getStrings() {
        return translations[currentCulture] || translations['en-US'];
    }

    function t(key, values) {
        var strings = getStrings();
        var value = strings[key] || translations['en-US'][key] || key;

        if (values) {
            Object.keys(values).forEach(function (name) {
                value = value.replace(new RegExp('\\{' + name + '\\}', 'g'), values[name]);
            });
        }

        return value;
    }

    function setFieldDescription(container, key) {
        container.innerHTML = '';
        var message = document.createElement('div');
        message.className = 'fieldDescription';
        message.textContent = t(key);
        container.appendChild(message);
    }

    function applyTranslations(view) {
        view.querySelectorAll('[data-i18n]').forEach(function (element) {
            element.textContent = t(element.getAttribute('data-i18n'));
        });

        view.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
            element.setAttribute('placeholder', t(element.getAttribute('data-i18n-placeholder')));
        });

        view.querySelectorAll('[data-i18n-label]').forEach(function (element) {
            var labelText = t(element.getAttribute('data-i18n-label'));
            var labelElement = element.closest('label');
            var labelTextElement = labelElement ? labelElement.querySelector('.selectLabelText') : null;
            element.setAttribute('label', labelText);
            if (typeof element.setLabel === 'function' && labelTextElement) {
                element.setLabel(labelText);
            } else if (labelTextElement) {
                labelTextElement.textContent = labelText;
            }
        });
    }

    function initLocalization(view) {
        var apiClient = getApiClient();
        var url = apiClient.getUrl('/SubtitleManager/Localization');

        return apiClient.getJSON(url).then(function (result) {
            currentCulture = normalizeCulture(result && result.Culture);
            applyTranslations(view);
        }).catch(function (error) {
            currentCulture = 'en-US';
            applyTranslations(view);
        });
    }

    // 显示消息
    function showMessage(message, isError) {
        Dashboard.alert({
            message: message,
            title: isError ? t('errorTitle') : t('successTitle')
        });
    }

    function resetMediaState(view) {
        selectedItemId = null;
        expandedFolders = {};
        itemsCache = {};

        var treeContainer = view.querySelector('#mediaTree');
        if (treeContainer) {
            setFieldDescription(treeContainer, 'loadListFirst');
        }

        var subtitlesContainer = view.querySelector('#currentSubtitles');
        if (subtitlesContainer) {
            setFieldDescription(subtitlesContainer, 'selectMediaToViewSubtitles');
        }
    }

    function removeLoadMoreButton(container) {
        var existing = container.querySelector('[data-load-more-container]');
        if (existing) {
            existing.remove();
        }
    }

    function appendItemsToTree(view, treeContainer, items) {
        var existingList = treeContainer.querySelector('ul[data-root-items]');
        var newList = createItemList(view, items);

        if (!existingList) {
            newList.setAttribute('data-root-items', 'true');
            treeContainer.appendChild(newList);
            return;
        }

        while (newList.firstChild) {
            existingList.appendChild(newList.firstChild);
        }
    }

    function mergeItemLists(primaryItems, secondaryItems) {
        var merged = [];
        var seen = {};

        (primaryItems || []).forEach(function (item) {
            if (!seen[item.Id]) {
                seen[item.Id] = true;
                merged.push(item);
            }
        });

        (secondaryItems || []).forEach(function (item) {
            if (!seen[item.Id]) {
                seen[item.Id] = true;
                merged.push(item);
            }
        });

        return merged;
    }

    function loadAllItemPages(apiClient, baseQuery, pageSize) {
        var allItems = [];
        pageSize = pageSize || itemsPageSize;

        function loadPage(startIndex) {
            var query = {};
            Object.keys(baseQuery).forEach(function (key) {
                query[key] = baseQuery[key];
            });
            query.StartIndex = startIndex;
            query.Limit = pageSize;

            return apiClient.getJSON(apiClient.getUrl('/SubtitleManager/Items', query)).then(function (result) {
                var pageItems = result.Items || [];
                var totalRecordCount = result.TotalRecordCount || pageItems.length;
                allItems = mergeItemLists(allItems, pageItems);

                var nextStartIndex = startIndex + pageSize;
                if (pageItems.length >= pageSize && nextStartIndex < totalRecordCount) {
                    return loadPage(nextStartIndex);
                }

                return {
                    Items: allItems,
                    TotalRecordCount: Math.max(totalRecordCount, allItems.length)
                };
            });
        }

        return loadPage(0);
    }

    function appendLoadMoreButton(view, treeContainer, loadedCount, totalCount, onClick) {
        removeLoadMoreButton(treeContainer);

        if (!totalCount || loadedCount >= totalCount) {
            return;
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'loadMoreContainer';
        wrapper.setAttribute('data-load-more-container', 'true');

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'raised emby-button';
        button.textContent = t('loadMore') + ' (' + loadedCount + '/' + totalCount + ')';
        button.addEventListener('click', onClick);

        wrapper.appendChild(button);
        treeContainer.appendChild(wrapper);
    }

    // 加载媒体库列表
    function loadLibraries(view) {
        loading.show();
        var apiClient = getApiClient();

        apiClient.getJSON(apiClient.getUrl('/SubtitleManager/Libraries')).then(function (result) {
            loading.hide();
            var selectLibrary = view.querySelector('#selectLibrary');
            selectLibrary.innerHTML = '';
            var placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = t('chooseLibraryOption');
            selectLibrary.appendChild(placeholderOption);

            if (result.Libraries && result.Libraries.length > 0) {
                result.Libraries.forEach(function (library) {
                    var option = document.createElement('option');
                    option.value = library.Id;
                    option.textContent = library.Name;
                    selectLibrary.appendChild(option);
                });
            } else {
                selectLibrary.innerHTML = '';
                var emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = t('noLibrariesFound');
                selectLibrary.appendChild(emptyOption);
            }
        }).catch(function (error) {
            loading.hide();
            showMessage(t('loadLibrariesFailed', { message: error.message }), true);
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
            var seasonWords = getStrings().seasonWords || translations['en-US'].seasonWords;
            var lowerName = name.toLowerCase();
            var hasSeasonWord = seasonWords.some(function (word) {
                return lowerName.indexOf(word.toLowerCase()) !== -1;
            });

            if (!hasSeasonWord) {
                return t('seasonNumber', { number: item.IndexNumber });
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
            showMessage(t('pleaseSelectLibrary'), true);
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
    function loadRootItems(view, libraryId, startIndex) {
        loading.show();
        var apiClient = getApiClient();
        startIndex = startIndex || 0;

        var url = apiClient.getUrl('/SubtitleManager/Items', {
            ParentId: libraryId,
            Recursive: false,
            StartIndex: startIndex,
            Limit: itemsPageSize
        });

        apiClient.getJSON(url).then(function (result) {
            loading.hide();
            var items = result.Items || [];
            var totalRecordCount = result.TotalRecordCount || items.length;

            // 渲染树形结构
            var treeContainer = view.querySelector('#mediaTree');
            if (startIndex === 0) {
                treeContainer.innerHTML = '';
            } else {
                removeLoadMoreButton(treeContainer);
            }

            if (items.length === 0 && startIndex === 0) {
                setFieldDescription(treeContainer, 'emptyLibrary');
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

            if (startIndex === 0 && needsParentFetch && Object.keys(parentIdsToFetch).length > 0) {
                // 使用递归查询获取完整树（包括被跳过的中间层）
                loadAllItemPages(apiClient, {
                    ParentId: libraryId,
                    Recursive: true
                }, itemsPageSize).then(function(recursiveResult) {
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

                    appendItemsToTree(view, treeContainer, rootItems);
                }).catch(function(error) {
                    // 降级：显示原始结果
                    appendItemsToTree(view, treeContainer, items);
                    appendLoadMoreButton(view, treeContainer, startIndex + items.length, totalRecordCount, function () {
                        loadRootItems(view, libraryId, startIndex + items.length);
                    });
                });
            } else {
                // 正常情况：直接显示
                appendItemsToTree(view, treeContainer, items);
                appendLoadMoreButton(view, treeContainer, startIndex + items.length, totalRecordCount, function () {
                    loadRootItems(view, libraryId, startIndex + items.length);
                });
            }
        }).catch(function (error) {
            loading.hide();
            showMessage(t('loadMediaFailed', { message: error.message }), true);
        });
    }

    // 递归搜索（用于搜索框）
    function searchRecursive(view, libraryId, searchText, startIndex) {
        loading.show();
        var apiClient = getApiClient();
        startIndex = startIndex || 0;

        // 使用后端 SearchTerm 和分页，避免大型库一次性拉取大量项目。
        var url = apiClient.getUrl('/SubtitleManager/Items', {
            ParentId: libraryId,
            Recursive: true,
            SearchTerm: searchText,
            StartIndex: startIndex,
            Limit: searchPageSize
        });

        apiClient.getJSON(url).then(function (result) {
            loading.hide();
            var matchedItems = result.Items || [];
            var totalRecordCount = result.TotalRecordCount || matchedItems.length;
            var treeContainer = view.querySelector('#mediaTree');

            if (startIndex === 0) {
                treeContainer.innerHTML = '';
            } else {
                removeLoadMoreButton(treeContainer);
            }

            if (matchedItems.length === 0 && startIndex === 0) {
                setFieldDescription(treeContainer, 'noMatchingItems');
                return;
            }

            appendItemsToTree(view, treeContainer, matchedItems);
            appendLoadMoreButton(view, treeContainer, startIndex + matchedItems.length, totalRecordCount, function () {
                searchRecursive(view, libraryId, searchText, startIndex + matchedItems.length);
            });
        }).catch(function (error) {
            loading.hide();
            showMessage(t('searchMediaFailed', { message: error.message }), true);
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
        ul.className = 'mediaTreeList';

        sortItems(items).forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'mediaTreeNode';

            var itemDiv = document.createElement('div');
            itemDiv.className = 'mediaTreeRow';
            itemDiv.setAttribute('data-item-id', item.Id);

            var itemIsFolder = isFolder(item.Type);

            if (itemIsFolder) {
                // 文件夹
                var icon = document.createElement('span');
                icon.className = 'mediaTreeExpander';
                icon.textContent = '▶';
                icon.setAttribute('data-folder-icon', item.Id);

                // 箭头点击：展开/收起
                icon.addEventListener('click', function (e) {
                    e.stopPropagation();
                    toggleFolder(view, item.Id, li, icon);
                });

                itemDiv.appendChild(icon);

                var folderIcon = document.createElement('i');
                folderIcon.className = 'md-icon mediaTreeIcon';
                folderIcon.textContent = getMediaIcon(item.Type);
                itemDiv.appendChild(folderIcon);

                var text = document.createElement('span');
                text.className = 'mediaTreeText';
                text.textContent = formatDisplayName(item);
                itemDiv.appendChild(text);

                // 文件夹：整行点击展开/收起
                itemDiv.addEventListener('click', function (e) {
                    e.stopPropagation();
                    toggleFolder(view, item.Id, li, icon);
                });

            } else {
                // 媒体文件（叶子节点）
                var indent = document.createElement('span');
                indent.className = 'mediaTreeIndent';
                itemDiv.appendChild(indent);

                var mediaIcon = document.createElement('i');
                mediaIcon.className = 'md-icon mediaTreeIcon';
                mediaIcon.textContent = getMediaIcon(item.Type);
                itemDiv.appendChild(mediaIcon);

                var text = document.createElement('span');
                text.className = 'mediaTreeText';
                text.textContent = formatDisplayName(item);
                itemDiv.appendChild(text);

                // 点击显示字幕
                itemDiv.addEventListener('click', function (e) {
                    e.stopPropagation();
                    selectMedia(view, item, itemDiv);
                });

                if (selectedItemId === item.Id) {
                    itemDiv.classList.add('mediaTreeRowSelected');
                }
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
        loadAllItemPages(apiClient, {
            ParentId: folderId,
            Recursive: true
        }, itemsPageSize).then(function (result) {
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
            childTree.classList.add('mediaTreeChildren');
            liElement.appendChild(childTree);
        }).catch(function (error) {
            loading.hide();
            showMessage(t('loadChildrenFailed', { message: error.message }), true);
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
        ul.className = 'mediaTreeList';

        sortItems(items).forEach(function (item) {
            var li = document.createElement('li');
            li.className = 'mediaTreeNode';

            var itemDiv = document.createElement('div');
            itemDiv.className = 'mediaTreeRow';
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
                    icon.className = 'mediaTreeExpander';
                    icon.textContent = '▶';
                    icon.setAttribute('data-folder-icon', item.Id);

                    // 箭头点击：展开/收起
                    icon.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleFolderWithCache(view, item.Id, li, icon, allItems);
                    });

                    itemDiv.appendChild(icon);

                    var folderIcon = document.createElement('i');
                    folderIcon.className = 'md-icon mediaTreeIcon';
                    folderIcon.textContent = getMediaIcon(item.Type);
                    itemDiv.appendChild(folderIcon);

                    var text = document.createElement('span');
                    text.className = 'mediaTreeText';
                    text.textContent = formatDisplayName(item);
                    itemDiv.appendChild(text);

                    // 文件夹：整行点击展开/收起
                    itemDiv.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleFolderWithCache(view, item.Id, li, icon, allItems);
                    });

                } else {
                    // 文件夹但无子项，显示为普通项
                    var folderIcon = document.createElement('i');
                    folderIcon.className = 'md-icon mediaTreeIcon mediaTreeIconIndented';
                    folderIcon.textContent = getMediaIcon(item.Type);
                    itemDiv.appendChild(folderIcon);

                    var text = document.createElement('span');
                    text.className = 'mediaTreeText';
                    text.textContent = formatDisplayName(item);
                    itemDiv.appendChild(text);
                }
            } else {
                // 叶子节点（视频等）
                var mediaIcon = document.createElement('i');
                mediaIcon.className = 'md-icon mediaTreeIcon mediaTreeIconIndented';
                mediaIcon.textContent = getMediaIcon(item.Type);
                itemDiv.appendChild(mediaIcon);

                var text = document.createElement('span');
                text.className = 'mediaTreeText';
                text.textContent = formatDisplayName(item);
                itemDiv.appendChild(text);

                // 点击选择
                itemDiv.addEventListener('click', function (e) {
                    e.stopPropagation();
                    selectMedia(view, item, itemDiv);
                });

                // 如果是当前选中的项，设置背景色
                if (selectedItemId === item.Id) {
                    itemDiv.classList.add('mediaTreeRowSelected');
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
                loadAllItemPages(apiClient, {
                    ParentId: folderId,
                    Recursive: false
                }, itemsPageSize).then(function (result) {
                    loading.hide();
                    var items = result.Items || [];

                    if (items.length === 0) {
                        if (children.length === 0) {
                            return;
                        }

                        items = children;
                    }

                    var mergedItems = mergeItemLists(allItems, items);
                    expandedFolders[folderId] = mergedItems;

                    // 更新图标
                    if (iconElement) {
                        iconElement.textContent = '▼ ';
                    }

                    // 创建子树
                    var childTree = createItemListWithCache(view, items, mergedItems);
                    childTree.classList.add('mediaTreeChildren');
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
            childTree.classList.add('mediaTreeChildren');
            liElement.appendChild(childTree);
        }
    }

    // 选择媒体项
    function selectMedia(view, item, itemDiv) {
        // 清除之前的选中状态
        view.querySelectorAll('#mediaTree .mediaTreeRowSelected').forEach(function (div) {
            div.classList.remove('mediaTreeRowSelected');
        });

        // 设置新的选中状态
        selectedItemId = item.Id;
        if (itemDiv) {
            itemDiv.classList.add('mediaTreeRowSelected');
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
        setFieldDescription(container, 'loadingSubtitles');
    }

    // 显示当前字幕
    function showCurrentSubtitles(view, item) {
        var container = view.querySelector('#currentSubtitles');

        if (!item || !item.Subtitles || item.Subtitles.length === 0) {
            setFieldDescription(container, 'noSubtitles');
            return;
        }

        container.innerHTML = '';
        var paperList = document.createElement('div');
        paperList.className = 'paperList';

        item.Subtitles.forEach(function (sub, index) {
            var listItem = document.createElement('div');
            listItem.className = 'listItem currentSubtitleListItem';

            var listItemBody = document.createElement('div');
            listItemBody.className = 'listItemBody two-line currentSubtitleBody';

            var textDiv1 = document.createElement('div');
            textDiv1.className = 'listItemBodyText';
            textDiv1.textContent = (index + 1) + '. ' + (sub.DisplayLanguage || sub.Language || t('unknownLanguage'));
            if (sub.IsForced) {
                textDiv1.textContent += ' [' + t('forcedTag') + ']';
            }
            if (sub.IsExternal) {
                textDiv1.textContent += ' [' + t('externalTag') + ']';
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
            if (sub.IsExternal && (sub.Path || sub.Index !== undefined)) {
                var deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'paper-icon-button-light currentSubtitleDelete';
                deleteBtn.title = t('deleteSubtitle');
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
        Dashboard.confirm(t('deleteSubtitleConfirm'), t('deleteSubtitle'), function(confirmed) {
            if (!confirmed) {
                return;
            }

            loading.show();
            var apiClient = getApiClient();

            var deleteQuery = {
                ItemId: item.Id
            };

            if (subtitle.Index !== undefined && subtitle.Index !== null) {
                deleteQuery.SubtitleIndex = subtitle.Index;
            }

            if (subtitle.Path) {
                deleteQuery.SubtitlePath = subtitle.Path;
            }

            var url = apiClient.getUrl('/SubtitleManager/DeleteSubtitle', deleteQuery);

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
                showMessage(data.Message || t('deleteSubtitleSuccess'), !data.Success);

                if (data.Success) {
                    // 延迟刷新，等待服务器元数据更新
                    setTimeout(function() {
                        reloadMediaItem(view, item.Id);
                    }, 500);
                }
            }).catch(function(error) {
                loading.hide();
                showMessage(t('deleteSubtitleFailed', { message: error.message }), true);
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
                            Index: s.Index,
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
            showMessage(t('refreshSubtitlesFailed'), true);
        });
    }

    // 上传字幕
    function uploadSubtitle(view) {
        if (!selectedItemId) {
            showMessage(t('selectMediaItem'), true);
            return;
        }

        var language = view.querySelector('#selectLanguage').value;
        var format = view.querySelector('#selectFormat').value;
        var isForced = view.querySelector('#chkForced').checked;
        var fileInput = view.querySelector('#subtitleFile');

        if (!fileInput.files || fileInput.files.length === 0) {
            showMessage(t('selectSubtitleFile'), true);
            return;
        }

        var file = fileInput.files[0];
        var normalizedFormat = format.toLowerCase();
        var fileName = file.name || '';
        var fileExtension = fileName.indexOf('.') === -1 ? '' : fileName.split('.').pop().toLowerCase();

        if (file.size === 0) {
            showMessage(t('subtitleFileEmpty'), true);
            return;
        }

        if (file.size > maxSubtitleFileSize) {
            showMessage(t('subtitleFileTooLarge'), true);
            return;
        }

        if (allowedSubtitleFormats.indexOf(normalizedFormat) === -1) {
            showMessage(t('invalidSubtitleFormat'), true);
            return;
        }

        if (fileExtension !== normalizedFormat) {
            showMessage(t('extensionMismatch'), true);
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
                        view.querySelector('#selectedFileName').textContent = t('noFileSelected');
                        view.querySelector('#selectedFileName').classList.remove('hasSelectedFile');

                        // 显示成功消息
                        showMessage(response.Message || t('uploadSubtitleSuccess'), false);

                        // 刷新当前媒体项的字幕信息（不重置树结构）
                        setTimeout(function() {
                            reloadMediaItem(view, selectedItemId);
                        }, 500);
                    } else {
                        showMessage(t('uploadSubtitleFailed', { message: response.Message || t('unknownError') }), true);
                    }
                } catch (e) {
                    showMessage(t('parseResponseFailed', { message: e.message }), true);
                }
            } else {
                showMessage(t('uploadSubtitleFailed', { message: 'HTTP ' + xhr.status }), true);
            }
        };

        xhr.onerror = function () {
            loading.hide();
            showMessage(t('uploadNetworkError'), true);
        };

        xhr.send(file);
    }

    // View构造函数
    function View(view, params) {
        BaseView.apply(this, arguments);

        // 加载语言和媒体库列表
        initLocalization(view).then(function () {
            loadLibraries(view);
        });

        // 绑定搜索按钮
        view.querySelector('#btnSearch').addEventListener('click', function () {
            selectedItemId = null;
            expandedFolders = {};
            itemsCache = {};
            setFieldDescription(view.querySelector('#currentSubtitles'), 'selectMediaToViewSubtitles');
            searchMedia(view);
        });

        view.querySelector('#selectLibrary').addEventListener('change', function () {
            resetMediaState(view);
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
                selectedFileNameSpan.classList.add('hasSelectedFile');
            } else {
                selectedFileNameSpan.textContent = t('noFileSelected');
                selectedFileNameSpan.classList.remove('hasSelectedFile');
            }
        });

        // 绑定上传按钮
        view.querySelector('#btnUpload').addEventListener('click', function () {
            uploadSubtitle(view);
        });

        // 支持回车搜索
        view.querySelector('#searchBox').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                selectedItemId = null;
                expandedFolders = {};
                itemsCache = {};
                setFieldDescription(view.querySelector('#currentSubtitles'), 'selectMediaToViewSubtitles');
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
