function parseJsonSafely(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function normalizeRepositoryResponse(data) {
    // Common happy path.
    if (Array.isArray(data)) return data;
    // QAF can return false when request is rejected by server-side checks.
    if (data === false || data == null) return [];
    // Some deployments return stringified JSON.
    if (typeof data === "string") {
      const parsed = parseJsonSafely(data);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") {
        const nested =
          parsed.data ?? parsed.items ?? parsed.result ?? parsed.value ?? [];
        return Array.isArray(nested) ? nested : [];
      }
      return [];
    }
    // Some deployments wrap records inside known properties.
    if (typeof data === "object") {
      const nested = data.data ?? data.items ?? data.result ?? data.value ?? [];
      return Array.isArray(nested) ? nested : [];
    }
    return [];
  }

  function getResolvedUserContext() {
    const portalUser = parseJsonSafely(localStorage.getItem("user_key"))?.value;
    if (portalUser?.EmployeeGUID || portalUser?.Email || portalUser?.EmployeeID) {
      return portalUser;
    }

    // Local-dev fallback: set from console as JSON string.
    // Example:
    // localStorage.setItem("kb_user_context", JSON.stringify({EmployeeGUID:"...", Email:"...", EmployeeID:"..."}))
    const localDevUser = parseJsonSafely(localStorage.getItem("kb_user_context"));
    if (
      localDevUser?.EmployeeGUID ||
      localDevUser?.Email ||
      localDevUser?.EmployeeID
    ) {
      return localDevUser;
    }

    return null;
  }


  let topics = [];
  /** Set when the topic API fails - shown in topic panel. */
  let topicLoadHint = "";

  let solutions = [];
  let solutionLoadHint = "";
  let selectedTopic = "All";

  /** Keyword pre-filter from ?Keywords= URL param, set by kb-article keyword links. */
  let urlKeyword = (function () {
    try {
      return decodeURIComponent(
        new URLSearchParams(window.location.search).get("Keywords") || ""
      ).trim();
    } catch (_) {
      return "";
    }
  })();
  // Lazy loading variables. Pagination is cursor-based: each API call requests a
  // fixed page size (solutionsPerPage) of records created before/at
  // `lastCreatedDateCursor`, and the cursor is advanced to the CreatedDate of the
  // last record returned - see fetchSolutionsFromApi / loadMoreSolutions.
  const solutionsPerPage = 10;
  /** CreatedDate cursor sent as the CreatedDate arg on the next RNSP call. */
  let lastCreatedDateCursor = "";
  let isLoading = false;
  let hasMoreSolutions = true;
  let displayedSolutions = [];
  let latestSearchRequestId = 0;
  let lastExecutedSearchKey = "";
  let isPageInitializing = false;
  let hasInitializedPage = false;
  let lastDataRefreshAt = 0;
  const REFRESH_THROTTLE_MS = 1500;
  let hasQueuedContextRecovery = false;
  let inFlightRefreshPromise = null;
  let contextRecoveryTimerId = null;
  let contextRecoveryAttempts = 0;
  const MAX_CONTEXT_RECOVERY_ATTEMPTS = 12;
  const CONTEXT_RECOVERY_INTERVAL_MS = 1500;

  const CURRENT_PAGE_PATH = "/pages/KnowledgeBase";

  const HELPDESK_PAGE_PATHS = [
    "/pages/ServiceDashboard",
    "/pages/ServiceCatalog",
    "/pages/KnowledgeBase",
    "/pages/TeamDashboard",
    "/pages/ReportAndAnalytics",
    "/pages/HelpdeskPermission",
  ];

  const HELPDESK_PERMISSION_PAGES = {
    "46-3": [
      "/pages/ServiceDashboard",
      "/pages/ServiceCatalog",
      "/pages/KnowledgeBase",
      "/pages/TeamDashboard",
      "/pages/ReportAndAnalytics",
      "/pages/HelpdeskPermission",
    ],
    "46-2": [
      "/pages/ServiceDashboard",
      "/pages/ServiceCatalog",
      "/pages/TeamDashboard",
      "/pages/KnowledgeBase",
    ],
    "46-1": [
      "/pages/ServiceDashboard",
      "/pages/ServiceCatalog",
      "/pages/TeamDashboard",
      "/pages/KnowledgeBase",
    ],
  };

  /** Base name for the shared repository API endpoint: {Base URL}/api/rnsp */
  const RNSP_API_PATH = "/api/rnsp";
  const RNSP_TOPIC_API_NAME = "ITSM_KB_TOPIC_DATA";
  const RNSP_SOLUTION_API_NAME = "ITSM_KB_DATA";

  // ---- Permission constants and helpers (copied from Reference.js) ----
  /**
   * Add / Edit / Delete on this page are gated by NewLP: only users whose NewLP
   * contains "11" (super-user) or "46-3" (KnowledgeBase admin) may use these actions.
   */
  const KB_MANAGE_PERMISSION_CODES = ["11", "46-3"];

  function hasKbManagePermission() {
    const codes = parsePermissionCodes(getNewLPFromStorage());
    return codes.some(function (code) {
      return KB_MANAGE_PERMISSION_CODES.indexOf(code) !== -1;
    });
  }

  /**
   * Resolves the QafPageService instance (used to open the OOTB Add/Edit/Delete forms).
   */
  function getQafPageService() {
    try {
      if (window.QafPageService && typeof window.QafPageService.AddItem === "function") {
        return window.QafPageService;
      }
      if (
        window.parent &&
        window.parent.QafPageService &&
        typeof window.parent.QafPageService.AddItem === "function"
      ) {
        return window.parent.QafPageService;
      }
    } catch (_) {
      /* ignore */
    }
    return null;
  }

  /** Re-fetches topics + solutions from the repositories and re-renders both panels. */
  function refreshKnowledgeBaseAfterSave() {
    return refreshDataIfNeeded(true);
  }

  /**
   * Opens the OOTB "Add" form for the given repository. Prefers window.QafLibrary.openAddForm
   * (richer API) and falls back to window.QafPageService.AddItem.
   */
  function openAddRecordForm(repositoryName) {
    if (!hasKbManagePermission()) return;

    if (window.QafLibrary && typeof window.QafLibrary.openAddForm === "function") {
      window.QafLibrary.openAddForm({
        repositoryName: repositoryName,
        objectID: repositoryName,
        onDone: refreshKnowledgeBaseAfterSave,
      });
      return;
    }

    const pageService = getQafPageService();
    if (pageService && typeof pageService.AddItem === "function") {
      pageService.AddItem(repositoryName, refreshKnowledgeBaseAfterSave);
      return;
    }

    console.warn(`Unable to open Add form for "${repositoryName}". QafPageService.AddItem is not available.`);
  }

  function openAddTopicForm() {
    openAddRecordForm("Topic");
  }

  function openAddSolutionForm() {
    openAddRecordForm("Solutions");
  }

  /**
   * Opens the OOTB "Edit" form for a specific Solutions record. Prefers
   * window.QafLibrary.dispatchRowAction and falls back to window.QafPageService.EditItem.
   */
  function openEditSolutionForm(recordId) {
    if (!hasKbManagePermission() || !recordId) return;

    if (window.QafLibrary && typeof window.QafLibrary.dispatchRowAction === "function") {
      window.QafLibrary.dispatchRowAction({
        action: "edit",
        recordID: recordId,
        repositoryName: "Solutions",
        objectID: "Solutions",
        onDone: refreshKnowledgeBaseAfterSave,
      });
      return;
    }

    const pageService = getQafPageService();
    if (pageService && typeof pageService.EditItem === "function") {
      pageService.EditItem("Solutions", recordId, refreshKnowledgeBaseAfterSave);
      return;
    }

    console.warn("Unable to open Edit form. QafPageService.EditItem is not available.");
  }

  /**
   * Opens the OOTB "Delete" confirmation form for a specific Solutions record. Prefers
   * window.QafLibrary.dispatchRowAction and falls back to window.QafPageService.DeleteItem.
   */
  function openDeleteSolutionForm(recordId) {
    if (!hasKbManagePermission() || !recordId) return;

    if (window.QafLibrary && typeof window.QafLibrary.dispatchRowAction === "function") {
      window.QafLibrary.dispatchRowAction({
        action: "delete",
        recordID: recordId,
        repositoryName: "Solutions",
        objectID: "Solutions",
        onDone: refreshKnowledgeBaseAfterSave,
      });
      return;
    }

    const pageService = getQafPageService();
    if (pageService && typeof pageService.DeleteItem === "function") {
      pageService.DeleteItem(recordId, refreshKnowledgeBaseAfterSave);
      return;
    }

    console.warn("Unable to open Delete form. QafPageService.DeleteItem is not available.");
  }

  /**
   * Shows the "+" (Topic) and "+ Solution" buttons only for users whose NewLP
   * grants manage permission (see hasKbManagePermission()); hidden otherwise.
   */
  function syncKbAddButtonStates() {
    const allowed = hasKbManagePermission();

    const topicBtn = document.getElementById("kbAddTopicBtn");
    if (topicBtn) {
      topicBtn.style.display = allowed ? "" : "none";
      topicBtn.setAttribute("aria-hidden", String(!allowed));
    }

    const solutionBtn = document.getElementById("kbAddSolutionBtn");
    if (solutionBtn) {
      solutionBtn.style.display = allowed ? "" : "none";
      solutionBtn.setAttribute("aria-hidden", String(!allowed));
    }
  }

  /**
   * CS_Setting-driven button theme (self-contained, mirrors the Status page's
   * implementation in status.js so this page doesn't depend on library.js
   * being loaded here).
   */
  const CS_SETTING_THEME_STORAGE_KEY = "CS_SETTING";
  const CS_SETTING_THEME_CSS_VARS = {
    backgroundColor: "--ButtonBackGroundColor",
    textColor: "--ButtonTextColor",
  };

  function pushCsSettingThemeCandidate(candidates, value) {
    if (!value || typeof value !== "object") return;
    candidates.push(value);
  }

  function collectCsSettingThemeCandidates(parsed) {
    const candidates = [];
    if (!parsed) return candidates;
    if (typeof parsed === "string") {
      return collectCsSettingThemeCandidates(parseJsonSafely(parsed));
    }
    if (typeof parsed !== "object") return candidates;
    pushCsSettingThemeCandidate(candidates, parsed);
    if (typeof parsed.value === "string") {
      collectCsSettingThemeCandidates(parseJsonSafely(parsed.value)).forEach((c) =>
        candidates.push(c),
      );
    } else if (parsed.value && typeof parsed.value === "object") {
      collectCsSettingThemeCandidates(parsed.value).forEach((c) => candidates.push(c));
    }
    if (parsed.QAFTHEME) pushCsSettingThemeCandidate(candidates, parsed.QAFTHEME);
    return candidates;
  }

  function readThemeColorsFromSource(source) {
    if (!source || typeof source !== "object") return { backgroundColor: "", textColor: "" };
    const bg =
      source.ButtonBackGroundColor ||
      source.buttonBackGroundColor ||
      source.ButtonBackgroundColor ||
      source.buttonBackgroundColor ||
      "";
    const text = source.ButtonTextColor || source.buttonTextColor || "";
    return {
      backgroundColor: bg ? String(bg) : "",
      textColor: text ? String(text) : "",
    };
  }

  function readCsSettingButtonTheme() {
    let backgroundColor = "";
    let textColor = "";
    try {
      const raw = window.localStorage && window.localStorage.getItem(CS_SETTING_THEME_STORAGE_KEY);
      if (!raw) return { backgroundColor, textColor };
      const parsed = parseJsonSafely(raw);
      const candidates = collectCsSettingThemeCandidates(parsed);
      candidates.forEach((candidate) => {
        const colors = readThemeColorsFromSource(candidate);
        if (colors.backgroundColor) backgroundColor = backgroundColor || colors.backgroundColor;
        if (colors.textColor) textColor = textColor || colors.textColor;
      });
    } catch (error) {
      /* ignore malformed CS_SETTING */
    }
    return { backgroundColor, textColor };
  }

  /**
   * Sets the CS_Setting theme CSS variables on `host` and marks it with the
   * `qaf-cs-theme-host` class so the `.qaf-cs-theme-btn--primary/--secondary`
   * rules in knowledgebase.css can pick them up.
   */
  function applyCsSettingTheme(host) {
    let hostEl = host;
    if (typeof host === "string") hostEl = document.querySelector(host);
    if (!hostEl) return;
    const theme = readCsSettingButtonTheme();
    if (theme.backgroundColor) {
      hostEl.style.setProperty(CS_SETTING_THEME_CSS_VARS.backgroundColor, theme.backgroundColor);
    } else {
      hostEl.style.removeProperty(CS_SETTING_THEME_CSS_VARS.backgroundColor);
    }
    if (theme.textColor) {
      hostEl.style.setProperty(CS_SETTING_THEME_CSS_VARS.textColor, theme.textColor);
    } else {
      hostEl.style.removeProperty(CS_SETTING_THEME_CSS_VARS.textColor);
    }
    hostEl.classList.add("qaf-cs-theme-host");
  }

  /**
   * Applies the portal's CS_Setting-driven button theme to all KB action
   * buttons (Add Topic, Add Solution, and each solution's Edit/Delete icons).
   */
  function applyKbCsSettingButtonTheme() {
    applyCsSettingTheme(document.body);
  }

  // ---- End of permission and action helpers ----

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function waitForUserContext(maxWaitMs = 4000, pollMs = 200) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < maxWaitMs) {
      const user = getResolvedUserContext();
      if (user?.EmployeeGUID || user?.Email || user?.EmployeeID) return;
      await sleep(pollMs);
    }
  }

  function hasUserContext() {
    const user = getResolvedUserContext();
    return Boolean(user?.EmployeeGUID || user?.Email || user?.EmployeeID);
  }

  function clearContextRecoveryLoop() {
    if (contextRecoveryTimerId) {
      window.clearInterval(contextRecoveryTimerId);
      contextRecoveryTimerId = null;
    }
    contextRecoveryAttempts = 0;
    hasQueuedContextRecovery = false;
  }

  function queueSingleContextRecovery() {
    if (hasUserContext()) {
      clearContextRecoveryLoop();
      refreshDataIfNeeded(true);
      return;
    }
    if (hasQueuedContextRecovery) return;
    hasQueuedContextRecovery = true;
    contextRecoveryAttempts = 0;
    contextRecoveryTimerId = window.setInterval(function () {
      contextRecoveryAttempts += 1;
      if (hasUserContext()) {
        clearContextRecoveryLoop();
        refreshDataIfNeeded(true);
        return;
      }
      if (contextRecoveryAttempts >= MAX_CONTEXT_RECOVERY_ATTEMPTS) {
        clearContextRecoveryLoop();
      }
    }, CONTEXT_RECOVERY_INTERVAL_MS);
  }

  function getArticleUrl(solutionId) {
    const basePath = "/pages/Article";
    const id = String(solutionId || "").trim();
    if (!id) return basePath;
    return `${basePath}?id=${encodeURIComponent(id)}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function htmlToPlainText(html) {
    const holder = document.createElement("div");
    holder.innerHTML = String(html || "");
    return String(holder.innerText || holder.textContent || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
  }

  function escapeHtmlWithLineBreaks(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }

  function truncateTextByWordsPreservingWhitespace(text, maxWords) {
    const source = String(text || "");
    if (!source || !Number.isFinite(maxWords) || maxWords <= 0) return "";
    const words = source.match(/\S+/g) || [];
    if (words.length <= maxWords) return source;

    let count = 0;
    const tokenPattern = /\S+/g;
    let match;
    while ((match = tokenPattern.exec(source)) !== null) {
      count += 1;
      if (count === maxWords) {
        return source.slice(0, match.index + match[0].length).replace(/\s+$/g, "");
      }
    }
    return source;
  }

  function normalizeContentPreviewSource(value) {
    // Some stored contents already end with a standalone "more" on a new line.
    // Remove only that trailing token so we can render a consistent inline link.
    return htmlToPlainText(value)
      .replace(/\s+more\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function initNavDock() {
    if (!document.getElementById("qafNavdockList")) return;
    const api = window.QafNavDock;
    if (!api || typeof api.init !== "function") return;
    api.init({
      toggleElementId: "qafNavToggle",
      listElementId: "qafNavdockList",
    });
  }

  function toSafeString(value) {
    return String(value == null ? "" : value).trim();
  }

  function readStorageRawValue(key) {
    if (!window.localStorage) return "";
    let raw = window.localStorage.getItem(key);
    if (raw == null && window.sessionStorage) {
      raw = window.sessionStorage.getItem(key);
    }
    if (raw == null || raw === "") return "";
    const parsed = parseJsonSafely(raw);
    if (parsed && typeof parsed === "object" && parsed.value != null) {
      return String(parsed.value).trim();
    }
    if (typeof parsed === "string") return parsed.trim();
    return String(raw).trim();
  }

  function getNewLPFromStorage() {
    const keys = ["NewLP", "newLP", "newlp"];
    for (let index = 0; index < keys.length; index += 1) {
      const direct = readStorageRawValue(keys[index]);
      if (direct) return direct;
    }

    const userRaw = readStorageRawValue("user_key");
    let userParsed = parseJsonSafely(userRaw);
    let userValue =
      userParsed && typeof userParsed === "object" && userParsed.value != null
        ? userParsed.value
        : userParsed;
    if (typeof userValue === "string") {
      userParsed = parseJsonSafely(userValue) || userParsed;
      userValue =
        userParsed && typeof userParsed === "object" && userParsed.value != null
          ? userParsed.value
          : userParsed;
    }
    if (userValue && typeof userValue === "object") {
      const nested =
        userValue.NewLP || userValue.newLP || userValue.newlp || userValue.LP || "";
      if (nested) return String(nested).trim();
    }

    return "";
  }

  function parsePermissionCodes(newLP) {
    return toSafeString(newLP)
      .split(",")
      .map(function (code) {
        return code.trim();
      })
      .filter(Boolean);
  }

  function normalizeBaseUrl(raw) {
    let value = toSafeString(raw);
    if (!value) return "";
    value = value.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(value)) {
      value = "https://" + value.replace(/^\/+/, "");
    }
    return value;
  }

  function getPageBaseUrl() {
    const fromStorage = toSafeString(window.localStorage && window.localStorage.getItem("env"));
    if (fromStorage) return normalizeBaseUrl(fromStorage);
    if (typeof window.location !== "undefined" && window.location.origin) {
      return normalizeBaseUrl(window.location.origin);
    }
    return "";
  }

  function normalizePagePath(path) {
    return toSafeString(path).toLowerCase();
  }

  function getAllowedPagePaths(newLP) {
    const normalized = toSafeString(newLP);
    if (normalized === "11") {
      return HELPDESK_PAGE_PATHS.slice();
    }

    const allowed = {};
    parsePermissionCodes(normalized).forEach(function (code) {
      const pages = HELPDESK_PERMISSION_PAGES[code];
      if (!Array.isArray(pages)) return;
      pages.forEach(function (path) {
        allowed[normalizePagePath(path)] = path;
      });
    });

    return Object.keys(allowed).map(function (key) {
      return allowed[key];
    });
  }

  function hasCurrentPageAccess(newLP) {
    const target = normalizePagePath(CURRENT_PAGE_PATH);
    const allowedPaths = getAllowedPagePaths(newLP);
    for (let index = 0; index < allowedPaths.length; index += 1) {
      if (normalizePagePath(allowedPaths[index]) === target) return true;
    }
    return false;
  }

  function buildUnauthorizedRedirectUrl() {
    return getPageBaseUrl() + "/not-found?unauthorized=un";
  }

  function hidePageContent() {
    if (document.body) document.body.style.visibility = "hidden";
  }

  function showPageContent() {
    if (document.body) document.body.style.visibility = "";
  }

  function enforcePageAccess() {
    if (!hasCurrentPageAccess(getNewLPFromStorage())) {
      window.location.replace(buildUnauthorizedRedirectUrl());
      return false;
    }
    return true;
  }

  /**
   * Calls the shared repository API: {Base URL}/api/rnsp
   * Payload shape: { "Name": "<api name>", "Args": { ... } }
   */
  async function callRnspApi(name, args) {
    const baseUrl = getPageBaseUrl();
    const endpoint = `${baseUrl}${RNSP_API_PATH}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Name: name, Args: args || {} }),
    });

    if (!response.ok) {
      throw new Error(`${RNSP_API_PATH} request failed with status ${response.status}`);
    }

    const raw = await response.json();
    return normalizeRepositoryResponse(raw);
  }

  async function fetchTopicsFromApi() {
    topicLoadHint = "";

    try {
      const data = await callRnspApi(RNSP_TOPIC_API_NAME, {});
      if (!data.length) return [];

      const uniqueNames = new Set();
      const mappedTopics = [];
      data.forEach((item) => {
        const name = item && item["TopicName"] ? String(item["TopicName"]).trim() : "";
        if (!name || uniqueNames.has(name)) return;
        uniqueNames.add(name);
        mappedTopics.push({ name });
      });

      console.log("Topic records:", data.length, "Mapped:", mappedTopics.length);
      return mappedTopics;
    } catch (error) {
      console.warn("Topic fetch error:", error);
      topicLoadHint = "Unexpected error loading topics.";
      return [];
    }
  }

  /**
   * Cursor-based pagination: `createdDate` is the CreatedDate to fetch the next
   * `solutionsPerPage` (10) records from/before. The API always returns a single
   * page of up to 10 records - see loadMoreSolutions() for how the cursor is
   * advanced to the CreatedDate of the last record on every call.
   */
  async function fetchSolutionsFromApi(keyword, topicName, createdDate) {
    solutionLoadHint = "";

    try {
      const args = {
        Keyword: String(keyword || "").trim(),
        Topic: topicName && topicName !== "All" ? String(topicName).trim() : "",
        RecordCount: String(solutionsPerPage),
        CreatedDate: createdDate || getInitialCreatedDateCursor(),
      };

      const data = await callRnspApi(RNSP_SOLUTION_API_NAME, args);
      if (!data.length) return [];

      const mapped = data
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          return {
            // Use RecordID if available, otherwise fallback to SolutionID; we need a stable identifier for edit/delete.
            recordId: String(item["RecordID"] || item["SolutionID"] || `record-${Math.random().toString(36).slice(2)}`),
            id: String(
              item["SolutionID"] ||
                item["Title"] ||
                `record-${Math.random().toString(36).slice(2)}`,
            ),
            title: String(item["Title"] || "").trim() || "(No title)",
            content: String(item["Content"] || "").trim(),
            topic: String(item["TopicName"] || "").trim() || "Uncategorized",
            keywords: String(item["Keywords"] || "").trim(),
            createdDate: item["CreatedDate"] || "",
          };
        })
        .filter(Boolean);

      console.log("Solution records:", data.length, "Mapped:", mapped.length);
      return mapped;
    } catch (error) {
      console.warn("Solutions fetch error:", error);
      solutionLoadHint = "Unexpected error loading solutions.";
      return [];
    }
  }

  /**
   * Formats a Date as "YYYY-MM-DDTHH:mm:ss" (local time, no offset/millis) to match
   * the CreatedDate shape the RNSP API expects, e.g. "2026-09-26T15:00:00".
   */
  function formatCreatedDateForApi(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }

  /** CreatedDate cursor to use for a brand-new (non-append) fetch: "now". */
  function getInitialCreatedDateCursor() {
    return formatCreatedDateForApi(new Date());
  }

  function getSearchCacheKey(query, topicName) {
    return `${String(topicName || "All").trim()}||${String(query || "").trim()}`;
  }

  function invalidateSearchState() {
    lastExecutedSearchKey = "";
  }

  const DEFAULT_PORTAL_BACKGROUND_IMAGE_URL =
    "https://qaffirst.quickappflow.com/Attachment/downloadfile?fileUrl=Pages1%2Fsearchpage_logo_709cb606-4f05-4688-8e75-030ffe87893c.png";

  function bindImageWithFallback(elementId, src, fallbackSrc) {
    const image = document.getElementById(elementId);
    if (!image) return;

    image.onerror = function handleImageError() {
      if (!fallbackSrc || image.src.endsWith(fallbackSrc)) return;
      image.src = fallbackSrc;
    };

    image.src = src || fallbackSrc;
  }

  function applyPortalImages({ backgroundImageUrl }) {
    bindImageWithFallback(
      "portalBackgroundImage",
      backgroundImageUrl,
      DEFAULT_PORTAL_BACKGROUND_IMAGE_URL,
    );
  }

  function loadPortalImages() {
    applyPortalImages({
      backgroundImageUrl: DEFAULT_PORTAL_BACKGROUND_IMAGE_URL,
    });
  }

  /* Topics */
  function renderTopics() {
    let html = `<div class="kb-topic-chip ${selectedTopic === "All" ? "kb-topic-chip--active" : ""}" onclick='filterByTopic("All")'>All</div>`;
    if (!topics.length) {
      const msg = topicLoadHint || "No topics found";
      html += `<div class="kb-topic-chip kb-topic-chip--hint">${msg}</div>`;
    } else {
      topics.forEach((t) => {
        const isActive = selectedTopic === t.name;
        html += `<div class="kb-topic-chip ${isActive ? "kb-topic-chip--active" : ""}" onclick='filterByTopic(${JSON.stringify(t.name)})'>
          <span class="kb-topic-chip__text">${t.name}</span>
          ${isActive && selectedTopic !== "All" ? `<span class="kb-topic-chip__clear" title="Clear filter" onclick="clearTopicFilter(event)">&times;</span>` : ""}
        </div>`;
      });
    }
    document.getElementById("topicList").innerHTML = html;

    // Update add button states and theme
    syncKbAddButtonStates();
    applyKbCsSettingButtonTheme();
  }

  /* Solutions */
  function displaySolutions(data, append = false) {
    let container = document.getElementById("solutionsContainer");
    if (!container) return;

    if (!append) {
      container.innerHTML = "";
    }

    if (!data.length && !append) {
      if (solutionLoadHint) {
        container.innerHTML = `<div class="kb-topic-chip kb-topic-chip--hint">${solutionLoadHint}</div>`;
      } else {
        container.innerHTML = `<p class="solution-empty">Not Found.</p>`;
      }
      return;
    }

    data.forEach((s, i) => {
      const rawContentText = String(s.content || "");
      const plainContentText = htmlToPlainText(rawContentText);
      const contentText = normalizeContentPreviewSource(rawContentText);
      const contentWords = contentText ? contentText.split(/\s+/) : [];
      const articleLinkOnclick = `try{sessionStorage.setItem("qaf_article_solution_id",${JSON.stringify(
        String(s.id),
      )});}catch(e){}`;
      const articleHref = getArticleUrl(s.id);
      const articleOnclickAttr = articleLinkOnclick.replace(/"/g, "&quot;");
      const hasTrailingMoreToken = /\s+more\s*$/i.test(plainContentText);
      const isLongContent = contentWords.length > 30;
      const shouldShowMoreLink =
        hasTrailingMoreToken || isLongContent;
      const previewBaseText = isLongContent
        ? truncateTextByWordsPreservingWhitespace(contentText, 30)
        : contentText;
      const previewTextHtml = escapeHtml(
        shouldShowMoreLink ? previewBaseText.replace(/\s+$/g, "") : previewBaseText,
      );
      const contentPreviewHtml = shouldShowMoreLink
        ? `${previewTextHtml}... <a class="solution-read-more" href="${articleHref}" onclick="${articleOnclickAttr}">more</a>`
        : previewTextHtml;

      const topicBadgeText = escapeHtml(String(s.topic ?? "").trim() || "Uncategorized");
      const keywordBadgesHtml = String(s.keywords ?? "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .map((k) => `<span class="kb-status-badge is-keyword">${escapeHtml(k)}</span>`)
        .join("");

      // Edit/Delete actions – only for users with permission
      const recordIdAttr = JSON.stringify(String(s.recordId ?? ""));
      const editOnclickAttr = `event.stopPropagation(); openEditSolutionForm(${recordIdAttr});`.replace(/"/g, "&quot;");
      const deleteOnclickAttr = `event.stopPropagation(); openDeleteSolutionForm(${recordIdAttr});`.replace(/"/g, "&quot;");
      const solutionActionsHtml = hasKbManagePermission()
        ? `
        <div class="solution-actions">
            <button type="button" class="solution-action-btn solution-action-btn--edit qaf-cs-theme-btn qaf-cs-theme-btn--secondary" title="Edit" aria-label="Edit solution" onclick="${editOnclickAttr}"><i class="fa fa-edit" aria-hidden="true"></i></button>
            <button type="button" class="solution-action-btn solution-action-btn--delete qaf-cs-theme-btn qaf-cs-theme-btn--secondary" title="Delete" aria-label="Delete solution" onclick="${deleteOnclickAttr}"><i class="fa fa-trash" aria-hidden="true"></i></button>
        </div>`
        : "";

      container.innerHTML += `
    <div class="solution card">
        ${solutionActionsHtml}
        <div class="solution-card-title"><a href="${articleHref}" onclick="${articleOnclickAttr}">${escapeHtml(s.title || "")}</a></div>
        <div class="solution-card-content">${contentPreviewHtml}</div>

        <div class="solution-badges"><span class="kb-status-badge is-topic">Topic: ${topicBadgeText}</span>${keywordBadgesHtml}</div>
    </div>
    `;
    });

    // Remove loader completely - no loading UI should be shown
    const existingLoader = document.getElementById("solutionsLoader");
    if (existingLoader) {
      existingLoader.remove();
    }

    // Update button states and theme after rendering
    syncKbAddButtonStates();
    applyKbCsSettingButtonTheme();
  }

  function closeModal(id) {
    document.getElementById(id).style.display = "none";
  }

  /* Search */

  /**
   * Key used to detect "is this the same record" when merging a new page into
   * the displayed list. recordId alone isn't safe here: on this API it can be
   * blank/non-unique per row (falls back to SolutionID, which may not be a real
   * unique key either), which was causing genuinely new records to be wrongly
   * treated as already-displayed and silently dropped during append. Combining
   * it with a few content fields makes collisions only happen for rows that are
   * actually the same record.
   */
  function getSolutionDedupeKey(s) {
    return [s.recordId, s.createdDate, s.title, s.topic].join("||");
  }

  /**
   * Fetches one page (solutionsPerPage records) of solutions for the given
   * keyword/topic, using `createdDate` as the cursor, and renders them.
   * `append` controls whether the new page is appended to the existing list
   * (infinite scroll) or the container is fully replaced (new search/filter).
   */
  async function fetchAndRenderSolutions(requestId, query, topicName, createdDate, append) {
    isLoading = true;
    try {
      const apiSolutions = await fetchSolutionsFromApi(query, topicName, createdDate);

      // Ignore stale responses if the user changed search/topic while this was in flight.
      if (requestId !== latestSearchRequestId) return;

      // The API returns a fresh page (not the full accumulated set), so on append we
      // merge it into what's already displayed: existing + new API response records.
      // Dedupe by a content-based key in case the CreatedDate cursor lands on a
      // boundary shared by multiple records (same CreatedDate on more than one
      // record can otherwise cause it to reappear).
      let newItems;
      if (append) {
        const existingKeys = new Set(displayedSolutions.map(getSolutionDedupeKey));
        newItems = apiSolutions.filter((s) => !existingKeys.has(getSolutionDedupeKey(s)));
        displayedSolutions = displayedSolutions.concat(newItems);
      } else {
        newItems = apiSolutions;
        displayedSolutions = apiSolutions;
      }
      solutions = displayedSolutions;

      console.log(
        "Solutions page received:", apiSolutions.length,
        "| new after dedupe:", newItems.length,
        "| total displayed:", displayedSolutions.length,
      );

      // Per spec: keep paginating until the API itself returns no additional
      // records - not tied to a fixed page-size threshold. A response with fewer
      // than 10 records (or more) is still displayed in full.
      hasMoreSolutions = apiSolutions.length > 0;

      // Safety valve: if every record in this page was already on screen (e.g. the
      // CreatedDate cursor landed exactly on a timestamp shared by several records
      // and the API keeps returning that same boundary batch), stop instead of
      // looping the same RNSP call forever with no visible progress.
      if (append && apiSolutions.length > 0 && newItems.length === 0) {
        hasMoreSolutions = false;
      }

      // Advance the cursor to the CreatedDate of the last record in *this* page
      // (not the merged list), ready for the next scroll-triggered call.
      if (apiSolutions.length) {
        const lastRecordDate = apiSolutions[apiSolutions.length - 1].createdDate;
        if (lastRecordDate) lastCreatedDateCursor = lastRecordDate;
      }

      if (!append) {
        // Fresh search/filter: always (re)render, even with zero results, so
        // "Not Found." / hint messaging shows correctly.
        displaySolutions(newItems, false);
      } else if (newItems.length) {
        // Infinite scroll: append the new records to the same DOM list that's
        // already showing the earlier pages.
        displaySolutions(newItems, true);
      }

      // After a fresh load (not append), if the container is shorter than the viewport,
      // automatically load more.
      if (!append) {
        setTimeout(checkAndLoadMoreIfNeeded, 100);
      }
    } catch (error) {
      if (requestId !== latestSearchRequestId) return;
      console.warn("Search request failed. Falling back to current list.", error);
      displaySolutions(solutions, false);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Bottom sentinel: a 1px element placed right after the solutions list. "Near
   * bottom" is decided from where the sentinel is on screen, so it works whether
   * the window or a nested container is the thing that scrolls, and it doesn't
   * depend on hitting the exact last pixel (which fractional scroll positions,
   * zoom and scrollbars can prevent).
   */
  const SCROLL_TRIGGER_OFFSET_PX = 300;
  let scrollSentinelObserver = null;

  function ensureScrollSentinel() {
    const container = document.getElementById("solutionsContainer");
    if (!container || !container.parentNode) return null;
    let sentinel = document.getElementById("solutionsScrollSentinel");
    if (!sentinel) {
      sentinel = document.createElement("div");
      sentinel.id = "solutionsScrollSentinel";
      sentinel.setAttribute("aria-hidden", "true");
      sentinel.style.cssText = "height:1px;width:100%;pointer-events:none;";
    }
    if (sentinel.previousElementSibling !== container) {
      container.parentNode.insertBefore(sentinel, container.nextSibling);
    }
    return sentinel;
  }

  function isNearListBottom() {
    const sentinel = ensureScrollSentinel();
    if (!sentinel) return false;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return sentinel.getBoundingClientRect().top <= viewportHeight + SCROLL_TRIGGER_OFFSET_PX;
  }

  /** (Re)arm the observer. IntersectionObserver only fires on *changes*, so this is
   *  called again after every load to get a fresh callback if the sentinel is still visible. */
  function armScrollSentinelObserver() {
    const sentinel = ensureScrollSentinel();
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    if (scrollSentinelObserver) scrollSentinelObserver.disconnect();
    scrollSentinelObserver = new IntersectionObserver(
      function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) handleScroll();
      },
      { root: null, rootMargin: "0px 0px " + SCROLL_TRIGGER_OFFSET_PX + "px 0px", threshold: 0 },
    );
    scrollSentinelObserver.observe(sentinel);
  }

  /**
   * Checks if the solution list ends within the trigger zone and loads more if so.
   */
  function checkAndLoadMoreIfNeeded() {
    if (!hasMoreSolutions || isLoading) return;
    if (isNearListBottom()) loadMoreSolutions(latestSearchRequestId);
  }

  async function searchSolutions() {
    const query = document.getElementById("searchInput")?.value || "";
    const searchKey = getSearchCacheKey(query, selectedTopic);

    // Avoid repeated API calls for the exact same search state.
    if (searchKey === lastExecutedSearchKey) {
      toggleSearchClear();
      return;
    }
    lastExecutedSearchKey = searchKey;

    const requestId = ++latestSearchRequestId;
    // Reset lazy-loading whenever the keyword or topic filter changes: the
    // CreatedDate cursor restarts from "now" so the first page comes back again.
    lastCreatedDateCursor = getInitialCreatedDateCursor();
    hasMoreSolutions = true;
    displayedSolutions = [];

    const container = document.getElementById("solutionsContainer");
    if (container) container.innerHTML = "";

    await fetchAndRenderSolutions(requestId, query, selectedTopic, lastCreatedDateCursor, false);

    if (requestId === latestSearchRequestId) {
      toggleSearchClear();
      armScrollSentinelObserver();
      window.setTimeout(handleScroll, 0);
    }
  }

  function handleSearchInputKeydown(event) {
    if (!event || event.key !== "Enter") return;
    event.preventDefault();
    lastExecutedSearchKey = "";
    searchSolutions();
  }

  // Lazy loading scroll handler
  function handleScroll() {
    // Guard added: the scroll listener is bound once to `window` (see
    // bindMainPanelScrollListener) and is never unbound on SPA route changes,
    // so it keeps firing from anywhere in the app for the rest of the tab's
    // lifetime. Without this check it kept calling loadMoreSolutions() ->
    // real API requests -> even when the user has navigated away from the
    // KnowledgeBase page. Same guard used in triggerLifecycleRefresh() for
    // the other lifecycle-driven API calls.
    if (!isOnKnowledgeBasePath() || !hasKnowledgePageShell()) return;
    if (isLoading || !hasMoreSolutions) return;

    // Trigger when the end of the list is within SCROLL_TRIGGER_OFFSET_PX of the
    // viewport bottom (not only at the exact last pixel).
    if (isNearListBottom()) {
      loadMoreSolutions(latestSearchRequestId);
    }
  }

  /**
   * Infinite scroll: fetch the next page using the CreatedDate of the last
   * record from the previous page as the cursor, and append the results.
   */
  async function loadMoreSolutions(requestId = latestSearchRequestId) {
    if (isLoading || !hasMoreSolutions) return;

    const query = document.getElementById("searchInput")?.value || "";

    // console.log("Loading more solutions, CreatedDate cursor:", lastCreatedDateCursor);

    await fetchAndRenderSolutions(requestId, query, selectedTopic, lastCreatedDateCursor, true);

    if (requestId === latestSearchRequestId) {
      armScrollSentinelObserver();
      window.setTimeout(handleScroll, 0);
    }
  }

  function toggleSearchClear() {
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("searchClearBtn");
    if (!input || !clearBtn) return;
    clearBtn.classList.toggle("visible", input.value.length > 0);
  }

  function clearSearchInput() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    input.value = "";
    lastExecutedSearchKey = "";
    searchSolutions();
    input.focus();
  }

  /**
   * Wires #searchInput (Enter -> searchSolutions, typing -> clear-button visibility)
   * and #searchClearBtn (click -> clearSearchInput). Idempotent per DOM element via a
   * dataset flag, so it's safe to call again after SPA remounts that recreate the nodes.
   *
   * Also explicitly clears any inline onclick/onkeydown/oninput attribute the markup may
   * already define for these elements before attaching via addEventListener. Without this,
   * a single click/keypress can invoke the handler twice (inline attribute + listener),
   * which races two overlapping searchSolutions() calls against each other: the second
   * (empty) call renders "Not Found." immediately while the first call's real, in-flight
   * API response is discarded as stale by the requestId guard.
   */
  function bindSearchControls() {
    const input = document.getElementById("searchInput");
    if (input && !input.dataset.qafKbBound) {
      input.dataset.qafKbBound = "1";
      input.onkeydown = null;
      input.oninput = null;
      input.addEventListener("keydown", handleSearchInputKeydown);
      input.addEventListener("input", toggleSearchClear);
    }

    const clearBtn = document.getElementById("searchClearBtn");
    if (clearBtn && !clearBtn.dataset.qafKbBound) {
      clearBtn.dataset.qafKbBound = "1";
      clearBtn.onclick = null;
      clearBtn.addEventListener("click", function (event) {
        if (event && typeof event.preventDefault === "function") event.preventDefault();
        clearSearchInput();
      });
    }

    toggleSearchClear();
  }

  /**
   * Binds click events to the "Add Topic" and "Add Solution" buttons.
   * These buttons are expected to exist with ids `kbAddTopicBtn` and `kbAddSolutionBtn`.
   */
  function bindAddButtons() {
    const topicBtn = document.getElementById("kbAddTopicBtn");
    if (topicBtn && !topicBtn.dataset.qafKbBound) {
      topicBtn.dataset.qafKbBound = "1";
      topicBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openAddTopicForm();
      });
    }

    const solutionBtn = document.getElementById("kbAddSolutionBtn");
    if (solutionBtn && !solutionBtn.dataset.qafKbBound) {
      solutionBtn.dataset.qafKbBound = "1";
      solutionBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openAddSolutionForm();
      });
    }

    // Update states after binding
    syncKbAddButtonStates();
    applyKbCsSettingButtonTheme();
  }

  /**
   * Topic chips filter independently of - and combine with - the search bar
   * keyword. Selecting a topic does not clear the current search text.
   */
  async function filterByTopic(t) {
    const nextTopic = t || "All";
    if (selectedTopic === nextTopic) return;

    selectedTopic = nextTopic;
    renderTopics();
    lastExecutedSearchKey = "";

    await searchSolutions();
  }

  function clearTopicFilter(event) {
    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }
    filterByTopic("All");
  }

  function bindMainPanelScrollListener() {
    if (!window.__qafKbWindowScrollBound) {
      // Capture phase (true) so scrolls inside nested containers - which don't
      // bubble to window - also reach handleScroll (portal shells often scroll an
      // inner wrapper rather than the window).
      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
      window.addEventListener("resize", handleScroll, { passive: true });
      window.__qafKbWindowScrollBound = true;
    }
    armScrollSentinelObserver();
  }

  function hasKnowledgePageShell() {
    return Boolean(
      document.getElementById("solutionsContainer") &&
        document.getElementById("topicList"),
    );
  }

  /**
   * Checking DOM presence alone isn't enough: this app fetches the next page's HTML
   * over the network before swapping the DOM, so the old KnowledgeBase shell
   * (#solutionsContainer/#topicList) can still be sitting in the page for a moment
   * after the user has already navigated away. history.pushState/replaceState update
   * window.location synchronously the instant Angular Router navigates - before any
   * network fetch or DOM swap - so checking the path here closes that race.
   */
  function isOnKnowledgeBasePath() {
    try {
      const path = String(window.location.pathname || "").toLowerCase();
      return (
        path === CURRENT_PAGE_PATH.toLowerCase() ||
        path.includes("testknowledgebase") ||
        path.includes("knowledgebase")
      );
    } catch (_) {
      return true;
    }
  }

  /* Init */
  async function initPage() {
    if (isPageInitializing) return;
    if (!enforcePageAccess()) return;
    isPageInitializing = true;
    showPageContent();
    hasQueuedContextRecovery = false;
    clearContextRecoveryLoop();

    try {
      initNavDock();
      loadPortalImages();
      applyKbCsSettingButtonTheme();

      // Re-bind page-level DOM listeners in SPA remount scenarios.
      bindMainPanelScrollListener();
      bindSearchControls();
      bindAddButtons();  // Bind "+" buttons

      // Redirect flows can set user context slightly late; wait briefly first.
      if (!hasUserContext()) {
        await waitForUserContext(1500, 100);
      }

      // Pre-fill the search box from a ?Keywords= link (e.g. clicking a keyword
      // badge elsewhere) so the initial Solutions fetch picks it up as the Keyword.
      const searchInputEl = document.getElementById("searchInput");
      if (searchInputEl && urlKeyword && !searchInputEl.value) {
        searchInputEl.value = urlKeyword;
      }

      // Start all data requests in parallel for faster first paint.
      const topicsPromise = (async function () {
        try {
          topics = await fetchTopicsFromApi();
        } catch (error) {
          console.warn("Unable to load topics from repository.", error);
          topics = [];
          topicLoadHint =
            topicLoadHint || "Unexpected error loading topics. See console.";
        }
        renderTopics();
      })();
      const solutionsPromise = (async function () {
        invalidateSearchState();
        await searchSolutions();
        toggleSearchClear();
      })();

      await Promise.allSettled([topicsPromise, solutionsPromise]);

      // One-time delayed recovery for redirect flows where user context arrives late.
      if (!hasUserContext()) queueSingleContextRecovery();
    } finally {
      hasInitializedPage = true;
      lastDataRefreshAt = Date.now();
      isPageInitializing = false;
    }
  }

  async function refreshDataIfNeeded(force = false) {
    if (inFlightRefreshPromise) {
      if (!force) return inFlightRefreshPromise;
      await inFlightRefreshPromise;
    }
    if (isPageInitializing || !hasInitializedPage) return;
    if (document.visibilityState === "hidden" && !force) return;
    if (!force && Date.now() - lastDataRefreshAt < REFRESH_THROTTLE_MS) return;

    lastDataRefreshAt = Date.now();
    inFlightRefreshPromise = (async function () {
      // Topics are relatively static; refresh them only on forced lifecycle refreshes.
      const topicsPromise = force
        ? (async function () {
            try {
              topics = await fetchTopicsFromApi();
            } catch (error) {
              console.warn("Unable to refresh topics from repository.", error);
              topics = [];
            }
            renderTopics();
          })()
        : Promise.resolve();
      const solutionsPromise = (async function () {
        invalidateSearchState();
        await searchSolutions();
      })();
      await Promise.allSettled([topicsPromise, solutionsPromise]);
    })();

    try {
      await inFlightRefreshPromise;
    } finally {
      inFlightRefreshPromise = null;
    }
  }

  function triggerLifecycleRefresh(force = false) {
    // Guard added: pageshow/online/storage listeners below fire from anywhere in
    // the app for the rest of the browser tab's lifetime, long after the user has
    // navigated away from this page - pages.component.ts has no destroy hook to
    // unbind them. Without this check they kept calling refreshDataIfNeeded() ->
    // real GetItems() network requests -> even when #solutionsContainer/#topicList
    // no longer exist on screen (ie. the user is on a completely different page).
    // isOnKnowledgeBasePath() closes the race where the old shell briefly lingers
    // in the DOM while the next page's content is still being fetched over the network.
    if (!isOnKnowledgeBasePath() || !hasKnowledgePageShell()) return;

    // Re-bind scroll listener (reset flag so it re-attaches)
    window.__qafKbWindowScrollBound = false;
    bindMainPanelScrollListener();
    bindSearchControls();
    bindAddButtons();
    if (!hasInitializedPage) {
      initPage();
      return;
    }
    refreshDataIfNeeded(force);
    if (!hasUserContext()) queueSingleContextRecovery();
  }

  function setupSpaLifecycleBridge() {
    if (window.__qafKbLifecycleBridgeBound) return;
    window.__qafKbLifecycleBridgeBound = true;

    let shellPreviouslyPresent = hasKnowledgePageShell();
    let mountRefreshQueued = false;
    const scheduleMountRefresh = function () {
      if (mountRefreshQueued) return;
      mountRefreshQueued = true;
      window.requestAnimationFrame(function () {
        mountRefreshQueued = false;
        if (hasKnowledgePageShell()) triggerLifecycleRefresh(true);
      });
    };

    // Detect shell add/remove in AngularJS SPA route transitions.
    const observer = new MutationObserver(function () {
      const shellNowPresent = hasKnowledgePageShell();
      if (shellNowPresent && !shellPreviouslyPresent) scheduleMountRefresh();
      shellPreviouslyPresent = shellNowPresent;
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // Catch history/hash based navigations common in portal routers.
    const notifyRouteChange = function () {
      scheduleMountRefresh();
    };
    window.addEventListener("hashchange", notifyRouteChange);
    window.addEventListener("popstate", notifyRouteChange);

    if (!window.__qafKbHistoryPatched) {
      window.__qafKbHistoryPatched = true;
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      history.pushState = function () {
        const result = originalPushState.apply(this, arguments);
        notifyRouteChange();
        return result;
      };
      history.replaceState = function () {
        const result = originalReplaceState.apply(this, arguments);
        notifyRouteChange();
        return result;
      };
    }
  }

  function bootstrapKnowledgePage() {
    hidePageContent();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initPage, { once: true });
    } else {
      initPage();
    }
    setupSpaLifecycleBridge();
  }

  // JS execution starts here on page load, reload, and SPA remount.
  bootstrapKnowledgePage();

  window.addEventListener("pageshow", function () {
    // Browser back/forward (including bfcache restore) always revalidates once,
    // but only if this KnowledgeBase page is still the one on screen - see the
    // guard inside triggerLifecycleRefresh().
    triggerLifecycleRefresh(true);
  });

  window.addEventListener("online", function () {
    triggerLifecycleRefresh(true);
  });

  window.addEventListener("storage", function (event) {
    if (event && event.key === "user_key" && hasUserContext()) {
      triggerLifecycleRefresh(true);
    }
  });

  document.addEventListener("keydown", function (e) {
    // alert("Script loaded"); // checks JS file is loaded
  });