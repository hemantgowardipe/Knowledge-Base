(function () {
    "use strict";

    var NAV_DOCK_STYLE_ID = "qaf-navdock-styles";

    var NAV_DOCK_CSS = `/* -- Design tokens (self-contained; do not rely on page :root) -- */
:root {
  --itsm-navdock-width-collapsed: 40px;
  --itsm-navdock-width-expanded: 250px;
  --itsm-navdock-z-index: 10;

  --itsm-navdock-bg: #fafafa;
  --itsm-navdock-border: #9b97979e;
  --itsm-navdock-text: #111827;
  --itsm-navdock-active-bg: #eaf0ff;
  --itsm-navdock-hover-bg: #f8fafc;

  --itsm-navdock-font: "Poppins", "DM Sans", "Segoe UI", Arial, sans-serif;
  --itsm-navdock-font-size: 14px;
  --itsm-navdock-font-weight: 400;
  --itsm-navdock-sublink-font-size: 13px;

  --itsm-navdock-radius: 8px;
  --itsm-navdock-duration-fast: 180ms;
  --itsm-navdock-duration-nav: 350ms;
  --itsm-navdock-ease: ease;

  /* Aliases used by ITSM_nav_dock.js body class toggles */
  --qaf-navdock-width-collapsed: var(--itsm-navdock-width-collapsed);
  --qaf-navdock-width-expanded: var(--itsm-navdock-width-expanded);
}

/* -- Page offset when dock is present -- */
body:has(.qaf-navdock) {
  padding-left: var(--itsm-navdock-width-collapsed) !important;
  transition: padding-left var(--itsm-navdock-duration-nav) var(--itsm-navdock-ease) !important;
}

body.qaf-navdock-expanded:has(.qaf-navdock),
body:has(.qaf-navdock.is-pinned-expanded) {
  padding-left: var(--itsm-navdock-width-expanded) !important;
}

/* -- FontAwesome inside dock -- */
.qaf-navdock .fa,
.qaf-navdock .fa::before,
.qaf-navdock .qaf-navdock__icon,
.qaf-navdock .qaf-navdock__icon::before,
.qaf-navdock .qaf-navdock__chevron,
.qaf-navdock .qaf-navdock__chevron::before,
.qaf-navdock__arrow-indicator .fa,
.qaf-navdock__arrow-indicator .fa::before {
  font-family: FontAwesome !important;
  font-style: normal !important;
  font-weight: normal !important;
  font-variant: normal !important;
  text-rendering: auto !important;
  -webkit-font-smoothing: antialiased !important;
  opacity: 1 !important;
  visibility: visible !important;
}

/* -- Dock shell -- */
.qaf-navdock,
aside.qaf-navdock {
  position: fixed !important;
  left: 0 !important;
  top: 0 !important;
  right: auto !important;
  bottom: auto !important;
  width: var(--itsm-navdock-width-collapsed) !important;
  max-width: 100vw !important;
  height: 100vh !important;
  box-sizing: border-box !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  margin: 0 !important;
  padding: 84px 0 0 0 !important;
  background: var(--itsm-navdock-bg) !important;
  border: 0 !important;
  border-right: 1px solid var(--itsm-navdock-border) !important;
  overflow: hidden !important;
  z-index: var(--itsm-navdock-z-index) !important;
  transform: none !important;
  font-family: var(--itsm-navdock-font) !important;
  transition: width var(--itsm-navdock-duration-nav) var(--itsm-navdock-ease) !important;
  isolation: isolate !important;
}

body > .qaf-navdock {
  margin: 0 !important;
  transform: none !important;
}

.qaf-navdock:hover,
body.qaf-navdock-expanded .qaf-navdock,
body.qaf-navdock-expanded aside.qaf-navdock,
.qaf-navdock.is-pinned-expanded,
aside.qaf-navdock.is-pinned-expanded {
  width: var(--itsm-navdock-width-expanded) !important;
}

/* -- Inner nav wrapper -- */
.qaf-navdock > nav {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* -- Expand / collapse toggle (#qafNavToggle - max specificity to beat page CSS) -- */
.qaf-navdock #qafNavToggle,
.qaf-navdock button.qaf-navdock__arrow-indicator,
.qaf-navdock .qaf-navdock__arrow-indicator {
  position: absolute !important;
  top: 51px !important;
  right: 2px !important;
  left: auto !important;
  bottom: auto !important;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  color: var(--itsm-navdock-text) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  border-radius: var(--itsm-navdock-radius) !important;
  box-shadow: none !important;
  outline: none !important;
  line-height: 1 !important;
  z-index: 5 !important;
  pointer-events: auto !important;
  touch-action: manipulation !important;
  -webkit-appearance: none !important;
  appearance: none !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: none !important;
  overflow: visible !important;
}

.qaf-navdock #qafNavToggle::before,
.qaf-navdock #qafNavToggle::after,
.qaf-navdock .qaf-navdock__arrow-indicator::before,
.qaf-navdock .qaf-navdock__arrow-indicator::after {
  content: none !important;
  display: none !important;
}

.qaf-navdock #qafNavToggle i,
.qaf-navdock #qafNavToggle .fa,
.qaf-navdock .qaf-navdock__arrow-indicator i,
.qaf-navdock .qaf-navdock__arrow-indicator .fa {
  font-family: FontAwesome !important;
  font-size: 26px !important;
  line-height: 1 !important;
  color: var(--itsm-navdock-text) !important;
  display: inline-block !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: none !important;
  opacity: 1 !important;
  visibility: visible !important;
  transform: rotate(0deg) !important;
  transition: transform var(--itsm-navdock-duration-fast) var(--itsm-navdock-ease) !important;
}

/* Font Awesome 4 angle-right glyph - survives pages that strip ::before on .fa */
.qaf-navdock #qafNavToggle .fa-angle-right::before,
.qaf-navdock .qaf-navdock__arrow-indicator .fa-angle-right::before {
  content: "\f105" !important;
  display: inline-block !important;
  font-family: FontAwesome !important;
  font-style: normal !important;
  font-weight: normal !important;
  line-height: 1 !important;
}

.qaf-navdock #qafNavToggle:hover,
.qaf-navdock #qafNavToggle:active,
.qaf-navdock #qafNavToggle:focus,
.qaf-navdock #qafNavToggle:focus-visible,
.qaf-navdock .qaf-navdock__arrow-indicator:hover,
.qaf-navdock .qaf-navdock__arrow-indicator:active,
.qaf-navdock .qaf-navdock__arrow-indicator:focus,
.qaf-navdock .qaf-navdock__arrow-indicator:focus-visible {
  background: transparent !important;
  color: var(--itsm-navdock-text) !important;
  outline: none !important;
  box-shadow: none !important;
  opacity: 1 !important;
  visibility: visible !important;
}

body.qaf-navdock-expanded .qaf-navdock #qafNavToggle i,
body.qaf-navdock-expanded .qaf-navdock #qafNavToggle .fa,
body.qaf-navdock-expanded .qaf-navdock .qaf-navdock__arrow-indicator i,
.qaf-navdock.is-pinned-expanded #qafNavToggle i,
.qaf-navdock.is-pinned-expanded #qafNavToggle .fa,
.qaf-navdock.is-pinned-expanded .qaf-navdock__arrow-indicator i {
  transform: rotate(180deg) !important;
}

/* -- Scrollable menu list -- */
.qaf-navdock__list,
.qaf-navdock nav.qaf-navdock__list {
  position: relative !important;
  z-index: 1 !important;
  min-height: auto !important;
  height: calc(100vh - 88px) !important;
  margin: 0 !important;
  padding: 4px 0 0 0 !important;
  list-style: none !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  -webkit-overflow-scrolling: touch !important;
  background: transparent !important;
  border: 0 !important;
}

.qaf-navdock__list > li,
.qaf-navdock__list > .qaf-navdock__item {
  list-style: none !important;
}

/* -- Top-level items -- */
.qaf-navdock__item {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  flex-shrink: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* -- Links (top-level and shared) -- */
.qaf-navdock__link {
  width: 100% !important;
  min-width: 0 !important;
  min-height: 38px !important;
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  margin: 0 !important;
  padding: 0 10px !important;
  color: var(--itsm-navdock-text) !important;
  text-decoration: none !important;
  border: 0 !important;
  background: transparent !important;
  box-sizing: border-box !important;
  cursor: pointer !important;
  font-family: var(--itsm-navdock-font) !important;
  font-size: var(--itsm-navdock-font-size) !important;
  font-weight: var(--itsm-navdock-font-weight) !important;
  line-height: 1.4 !important;
}

.qaf-navdock__link:hover {
  background: var(--itsm-navdock-hover-bg) !important;
  color: var(--itsm-navdock-text) !important;
  text-decoration: none !important;
}

.qaf-navdock__link:focus,
.qaf-navdock__link:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.qaf-navdock__link.is-active {
  background: var(--itsm-navdock-active-bg) !important;
  color: var(--itsm-navdock-text) !important;
}

/* -- Icons -- */
.qaf-navdock__icon {
  width: 20px !important;
  min-width: 20px !important;
  min-height: 18px !important;
  text-align: center !important;
  font-size: 18px !important;
  line-height: 1 !important;
  color: var(--itsm-navdock-text) !important;
  display: inline-block !important;
  flex-shrink: 0 !important;
}

/* -- Labels (hidden when dock is collapsed) -- */
.qaf-navdock__label {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  color: var(--itsm-navdock-text) !important;
  font-size: var(--itsm-navdock-font-size) !important;
  font-weight: var(--itsm-navdock-font-weight) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  opacity: 0 !important;
  transform: translateX(-6px) !important;
  transition:
    opacity var(--itsm-navdock-duration-fast) var(--itsm-navdock-ease),
    transform var(--itsm-navdock-duration-fast) var(--itsm-navdock-ease) !important;
}

body.qaf-navdock-expanded .qaf-navdock .qaf-navdock__label,
body:not(.qaf-navdock-expanded) .qaf-navdock:hover .qaf-navdock__label,
.qaf-navdock.is-pinned-expanded .qaf-navdock__label {
  opacity: 1 !important;
  transform: translateX(0) !important;
}

/* -- Sub-menu chevron -- */
.qaf-navdock__chevron {
  flex: 0 0 auto !important;
  margin-left: auto !important;
  font-size: 14px !important;
  color: var(--itsm-navdock-text) !important;
  opacity: 0 !important;
  flex-shrink: 0 !important;
  transition:
    opacity var(--itsm-navdock-duration-fast) var(--itsm-navdock-ease),
    transform var(--itsm-navdock-duration-fast) var(--itsm-navdock-ease) !important;
}

.qaf-navdock__link .qaf-navdock__chevron,
.qaf-navdock__link:hover .qaf-navdock__chevron,
.qaf-navdock__link:focus-visible .qaf-navdock__chevron,
.qaf-navdock__link:active .qaf-navdock__chevron,
.qaf-navdock__link:visited .qaf-navdock__chevron {
  color: var(--itsm-navdock-text) !important;
}

body.qaf-navdock-expanded .qaf-navdock .qaf-navdock__chevron,
body:not(.qaf-navdock-expanded) .qaf-navdock:hover .qaf-navdock__chevron,
.qaf-navdock.is-pinned-expanded .qaf-navdock__chevron {
  opacity: 1 !important;
}

.qaf-navdock__item.is-expanded > .qaf-navdock__link .qaf-navdock__chevron {
  transform: rotate(180deg) !important;
}

/* -- Sub-menus -- */
.qaf-navdock__submenu {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: var(--itsm-navdock-bg) !important;
  border: 0 !important;
}

.qaf-navdock__submenu[hidden] {
  display: none !important;
}

.qaf-navdock__submenu:not([hidden]),
.qaf-navdock__item.is-expanded > .qaf-navdock__submenu {
  display: block !important;
}

.qaf-navdock__submenu:not([hidden]) .qaf-navdock__label,
.qaf-navdock__item.is-expanded .qaf-navdock__submenu .qaf-navdock__label {
  opacity: 1 !important;
  transform: translateX(0) !important;
}

/* -- Sub-menu links -- */
.qaf-navdock__sublink {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  width: 100% !important;
  min-height: 34px !important;
  margin: 0 !important;
  padding: 8px 10px 8px 44px !important;
  color: var(--itsm-navdock-text) !important;
  text-decoration: none !important;
  font-size: var(--itsm-navdock-sublink-font-size) !important;
  font-weight: var(--itsm-navdock-font-weight) !important;
  white-space: nowrap !important;
  background: transparent !important;
  border: 0 !important;
  box-sizing: border-box !important;
}

.qaf-navdock__sublink:hover,
.qaf-navdock__sublink:focus,
.qaf-navdock__sublink:focus-visible {
  background: var(--itsm-navdock-active-bg) !important;
  color: var(--itsm-navdock-text) !important;
  text-decoration: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.qaf-navdock__sublink.is-active {
  background: var(--itsm-navdock-active-bg) !important;
  color: var(--itsm-navdock-text) !important;
  font-weight: 500 !important;
}

.qaf-navdock__subitem {
  display: block !important;
  width: 100% !important;
}
`;

    function injectNavDockStyles() {
      if (document.getElementById(NAV_DOCK_STYLE_ID)) return;
      var style = document.createElement("style");
      style.id = NAV_DOCK_STYLE_ID;
      style.textContent = NAV_DOCK_CSS;
      (document.head || document.documentElement).appendChild(style);
    }

    injectNavDockStyles();

    var HELPDESK_NAV_MENU = [
      {
        displayName: "Service Dashboard",
        icon: "fa fa-tachometer",
        iconColor: "#000000",
        sequence: 1,
        navigateTo: "/pages/ServiceDashboard",
      },
      {
        displayName: "Service Catalog",
        icon: "fa fa-list",
        iconColor: "#000000",
        sequence: 2,
        navigateTo: "/pages/ServiceCatalog",
      },
      {
        displayName: "Knowledge Base",
        icon: "fa fa-book",
        iconColor: "#000000",
        sequence: 3,
        navigateTo: "/pages/KnowledgeBase",
      },
      {
        displayName: "Team Dashboard",
        icon: "fa fa-ticket",
        iconColor: "#000000",
        sequence: 4,
        navigateTo: "/pages/TeamDashboard",
      },
      {
        displayName: "Analytics",
        icon: "fa fa-bar-chart",
        iconColor: "#000000",
        sequence: 5,
        menuKey: "Analytics",
        navigateTo: "/pages/HelpdeskDashboard",
        subMenus: [
          {
            displayName: "Helpdesk Dashboard",
            icon: "fa fa-file-text-o",
            iconColor: "#000000",
            sequence: 1,
            navigateTo: "/pages/HelpdeskDashboard",
          },
          {
            displayName: "Team SLA",
            icon: "fa fa-users",
            iconColor: "#000000",
            sequence: 2,
            navigateTo: "/pages/TeamSLA",
          },
          {
            displayName: "Agent SLA",
            icon: "fa fa-user",
            iconColor: "#000000",
            sequence: 3,
            navigateTo: "/pages/AgentSLA",
          },
        ],
      },
      {
        displayName: "Permission",
        icon: "fa fa-lock",
        iconColor: "#000000",
        sequence: 6,
        navigateTo: "/pages/HelpdeskPermission",
      },
      {
        displayName: "Admin",
        icon: "fa fa-wrench",
        iconColor: "#000000",
        sequence: 7,
        menuKey: "admin",
        navigateTo: "/pages/HelpdeskAdmin",
        subMenus: [
          /*
           * Status, Priority, Category and SubCategory used to be four entries
           * pointing at four pages. They are now the four tabs of one page, so
           * this is one entry; the page picks its opening tab from the URL, and
           * "#status" / "#priority" / "#category" / "#subcategory" still link
           * straight to a given tab.
           */
          {
            displayName: "Settings",
            icon: "fa fa-cog",
            iconColor: "#000000",
            sequence: 1,
            navigateTo: "/pages/HelpdeskSetting",
          },
          {
            displayName: "SLA Definition",
            icon: "fa fa-clock-o",
            iconColor: "#000000",
            sequence: 2,
            navigateTo: "/pages/sladefinition",
          },
        ],
      },
    ];

    /* Permission code -> allowed page paths (module 46 = Helpdesk) */
    var HELPDESK_PERMISSION_PAGES = {
      "46-3": [
        "/pages/ServiceDashboard",
        "/pages/ServiceCatalog",
        "/pages/KnowledgeBase",
        "/pages/TeamDashboard",
        "/pages/HelpdeskDashboard",
        "/pages/TeamSLA",
        "/pages/AgentSLA",
        "/pages/HelpdeskPermission",
        "/pages/HelpdeskAdmin",
        "/pages/sladefinition",
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

    function tryParseJson(input) {
      try {
        return JSON.parse(input);
      } catch (_) {
        return null;
      }
    }

    function getNewLPFromStorage() {
      function readRawValue(key) {
        if (!window.localStorage) return "";
        var raw = window.localStorage.getItem(key);
        if (raw == null && window.sessionStorage) {
          raw = window.sessionStorage.getItem(key);
        }
        if (raw == null || raw === "") return "";
        var parsed = tryParseJson(raw);
        if (parsed && typeof parsed === "object" && parsed.value != null) {
          return String(parsed.value).trim();
        }
        if (typeof parsed === "string") return parsed.trim();
        return String(raw).trim();
      }

      var keys = ["NewLP", "newLP", "newlp"];
      var index;
      for (index = 0; index < keys.length; index += 1) {
        var direct = readRawValue(keys[index]);
        if (direct) return direct;
      }

      var userRaw = readRawValue("user_key");
      var userParsed = tryParseJson(userRaw);
      var userValue =
        userParsed && typeof userParsed === "object" && userParsed.value != null
          ? userParsed.value
          : userParsed;
      if (typeof userValue === "string") {
        userParsed = tryParseJson(userValue) || userParsed;
        userValue =
          userParsed && typeof userParsed === "object" && userParsed.value != null
            ? userParsed.value
            : userParsed;
      }
      if (userValue && typeof userValue === "object") {
        var nested =
          userValue.NewLP || userValue.newLP || userValue.newlp || userValue.LP || "";
        if (nested) return String(nested).trim();
      }

      return "";
    }

    function parsePermissionCodes(newLP) {
      return String(newLP || "")
        .split(",")
        .map(function (code) {
          return code.trim();
        })
        .filter(Boolean);
    }

    function normalizeNavPath(path) {
      return String(path || "").trim().toLowerCase();
    }

    function collectAllMenuPaths(items) {
      var paths = [];
      var seen = {};
      (Array.isArray(items) ? items : []).forEach(function (item) {
        if (!item) return;
        if (item.navigateTo) {
          var navKey = normalizeNavPath(item.navigateTo);
          if (navKey && !seen[navKey]) {
            seen[navKey] = true;
            paths.push(item.navigateTo);
          }
        }
        if (Array.isArray(item.subMenus)) {
          item.subMenus.forEach(function (sub) {
            if (!sub || !sub.navigateTo) return;
            var subKey = normalizeNavPath(sub.navigateTo);
            if (subKey && !seen[subKey]) {
              seen[subKey] = true;
              paths.push(sub.navigateTo);
            }
          });
        }
      });
      return paths;
    }

    function canShowAdminMenu(newLP) {
      return parsePermissionCodes(newLP).some(function (code) {
        return code === "11" || code === "46-3";
      });
    }

    function isAdminMenuItem(item) {
      if (!item || typeof item !== "object") return false;
      if (String(item.menuKey || "").toLowerCase() === "admin") return true;
      return String(item.displayName || "").trim().toLowerCase() === "admin";
    }

    function hasSuperAdminAccess(newLP) {
      return parsePermissionCodes(newLP).some(function (code) {
        return code === "11";
      });
    }

    function getAllowedPagePaths(newLP) {
      var normalized = String(newLP || "").trim();
      if (hasSuperAdminAccess(normalized)) {
        return collectAllMenuPaths(HELPDESK_NAV_MENU);
      }

      var allowed = {};
      parsePermissionCodes(normalized).forEach(function (code) {
        var pages = HELPDESK_PERMISSION_PAGES[code];
        if (!Array.isArray(pages)) return;
        pages.forEach(function (path) {
          allowed[normalizeNavPath(path)] = path;
        });
      });

      return Object.keys(allowed).map(function (key) {
        return allowed[key];
      });
    }

    function filterNavMenuByPermissions(menuItems, newLP) {
      var effectiveNewLP = newLP != null ? newLP : getNewLPFromStorage();
      var source = Array.isArray(menuItems) && menuItems.length ? menuItems : HELPDESK_NAV_MENU;

      if (!String(effectiveNewLP || "").trim()) {
        return sortItems(source.slice());
      }

      var allowedPaths = getAllowedPagePaths(effectiveNewLP);
      var allowedSet = {};
      allowedPaths.forEach(function (path) {
        allowedSet[normalizeNavPath(path)] = true;
      });

      function isPathAllowed(path) {
        return Boolean(allowedSet[normalizeNavPath(path)]);
      }

      function processItem(item) {
        if (!item || typeof item !== "object") return null;

        var hasSubMenus = Array.isArray(item.subMenus) && item.subMenus.length > 0;

        if (isAdminMenuItem(item)) {
          if (!canShowAdminMenu(effectiveNewLP)) return null;
          var adminSubs = sortItems(
            item.subMenus.filter(function (sub) {
              return isPathAllowed(sub.navigateTo);
            })
          );
          if (!adminSubs.length) return null;
          return Object.assign({}, item, { subMenus: adminSubs });
        }

        if (hasSubMenus) {
          var filteredSubs = sortItems(
            item.subMenus.filter(function (sub) {
              return isPathAllowed(sub.navigateTo);
            })
          );
          if (!filteredSubs.length) return null;
          return Object.assign({}, item, { subMenus: filteredSubs });
        }

        return isPathAllowed(item.navigateTo) ? item : null;
      }

      return (Array.isArray(menuItems) ? menuItems : source).map(processItem).filter(Boolean);
    }

    function getPermittedNavMenu() {
      return filterNavMenuByPermissions(HELPDESK_NAV_MENU);
    }

    function resolveNavMenuItems(items) {
      var source =
        Array.isArray(items) && items.length ? items : HELPDESK_NAV_MENU;
      return filterNavMenuByPermissions(source);
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function toAbsoluteUrl(navigateTo) {
      var raw = String(navigateTo || "").trim();
      if (!raw) return "#";
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.charAt(0) === "/") return window.location.origin + raw;
      return window.location.origin + "/" + raw;
    }

    function isActive(navigateTo) {
      if (!navigateTo) return false;
      var path = String((window.location && window.location.pathname) || "").toLowerCase();
      var url  = navigateTo.toLowerCase().replace(/^\//, "");
      return Boolean(url && path.indexOf(url) >= 0);
    }

    function sortItems(items) {
      return items.slice().sort(function (a, b) {
        return Number(a.sequence || 0) - Number(b.sequence || 0);
      });
    }

    function renderSubMenus(subMenus) {
      if (!Array.isArray(subMenus) || subMenus.length === 0) return "";

      var items = sortItems(subMenus)
        .map(function (sub) {
          var label      = escapeHtml(sub.displayName || "");
          var iconClass  = escapeHtml(sub.icon || "fa fa-circle");
          var iconColor  = escapeHtml(sub.iconColor || "#000000");
          var href       = escapeHtml((sub.navigateTo));
          var activeClass = isActive(sub.navigateTo) ? " is-active" : "";

          return (
            '<div class="qaf-navdock__item qaf-navdock__subitem">' +
              '<a class="qaf-navdock__link qaf-navdock__sublink' + activeClass + '" href="' + href + '">' +
                '<i class="qaf-navdock__icon ' + iconClass + '" style="color:' + iconColor + ';" aria-hidden="true"></i>' +
                '<span class="qaf-navdock__label">' + label + '</span>' +
              '</a>' +
            '</div>'
          );
        })
        .join("");

      return '<div class="qaf-navdock__submenu" hidden>' + items + '</div>';
    }

    function renderNavDock(items, listElementId) {
      var navList = document.getElementById(listElementId || "qafNavdockList");
      if (!navList) return;

      var menuItems = sortItems(resolveNavMenuItems(items));

      navList.innerHTML = menuItems
        .map(function (item) {
          var label      = escapeHtml(item.displayName || "");
          var iconClass  = escapeHtml(item.icon || "fa fa-circle");
          var iconColor  = escapeHtml(item.iconColor || "#000000");
          var href       = item.subMenus && item.subMenus.length ? "#" : escapeHtml((item.navigateTo));
          var hasSubMenus = Array.isArray(item.subMenus) && item.subMenus.length > 0;
          var activeClass = hasSubMenus ? "" : isActive(item.navigateTo) ? " is-active" : "";
          var subMenuHtml = hasSubMenus ? renderSubMenus(item.subMenus) : "";
          var expandAttr  = hasSubMenus ? ' data-has-submenu="true"' : "";

          return (
            '<div class="qaf-navdock__item"' + expandAttr + '>' +
              '<a class="qaf-navdock__link' + activeClass + '" href="' + href + '"' +
                (hasSubMenus ? ' aria-expanded="false" aria-haspopup="true"' : '') + '>' +
                '<i class="qaf-navdock__icon ' + iconClass + '" style="color:' + iconColor + ';" aria-hidden="true"></i>' +
                '<span class="qaf-navdock__label">' + label + '</span>' +
                (hasSubMenus
                  ? '<i class="qaf-navdock__chevron fa fa-angle-down" aria-hidden="true"></i>'
                  : '') +
              '</a>' +
              subMenuHtml +
            '</div>'
          );
        })
        .join("");

      /* Bind sub-menu toggles after render */
      bindSubMenuToggles(navList);
      expandActiveSubMenus(navList);
    }
    function expandActiveSubMenus(navList) {
      if (!navList) return;
      navList.querySelectorAll('[data-has-submenu="true"]').forEach(function (item) {
        var submenu = item.querySelector(".qaf-navdock__submenu");
        if (!submenu) return;
        var hasActive = submenu.querySelector(".qaf-navdock__sublink.is-active");
        if (!hasActive) return;
        openSubMenu(item);
      });
    }
    function closeAllSubMenus(navList) {
      if (!navList) return;
      navList.querySelectorAll('[data-has-submenu="true"]').forEach(function (item) {
        var submenu = item.querySelector(".qaf-navdock__submenu");
        if (submenu) submenu.hidden = true;
        item.classList.remove("is-expanded");
        var link = item.querySelector(".qaf-navdock__link");
        if (link) link.setAttribute("aria-expanded", "false");
      });
    }

    function openSubMenu(item) {
      if (!item) return;
      var submenu = item.querySelector(".qaf-navdock__submenu");
      if (!submenu) return;
      submenu.hidden = false;
      item.classList.add("is-expanded");
      var link = item.querySelector(".qaf-navdock__link");
      if (link) link.setAttribute("aria-expanded", "true");
    }



    /* Toggle collapse / expand of sub-menus (single delegated listener survives re-render) */
    function bindSubMenuToggles(navList) {
      if (!navList || navList.__qafSubMenuBound) return;
      navList.__qafSubMenuBound = true;
      navList.addEventListener("click", function (e) {
        var link = e.target.closest('[data-has-submenu="true"] > .qaf-navdock__link');
        if (!link || !navList.contains(link)) return;
        e.preventDefault();
        var item = link.parentElement;
        var submenu = item.querySelector(".qaf-navdock__submenu");
        if (!submenu) return;

        var isOpen = item.classList.contains("is-expanded");
        closeAllSubMenus(navList);
        if (!isOpen) openSubMenu(item);
      });
    }

    function applyNavDockExpanded(expanded, navToggle) {
      var dock = document.querySelector(".qaf-navdock");
      document.body.classList.toggle("qaf-navdock-expanded", expanded);
      if (dock) dock.classList.toggle("is-pinned-expanded", expanded);
      var toggle = navToggle || document.getElementById("qafNavToggle");
      if (toggle) toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    }

    function bindToggle(toggleElementId) {
      var toggleId = toggleElementId || "qafNavToggle";
      var dock = document.querySelector(".qaf-navdock");
      if (!dock) return;

      /* Delegated capture listener wins over page scripts that bind the button directly */
      if (!dock.__itsmNavDockToggleBound) {
        dock.__itsmNavDockToggleBound = true;
        dock.addEventListener(
          "click",
          function (e) {
            var navToggle = e.target.closest("#" + toggleId);
            if (!navToggle || !dock.contains(navToggle)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            applyNavDockExpanded(
              !document.body.classList.contains("qaf-navdock-expanded"),
              navToggle
            );
          },
          true
        );
      }

      var navToggle = document.getElementById(toggleId);
      if (navToggle) {
        delete navToggle.__qafNavBound;
        if (navToggle.getAttribute("aria-expanded") === "true") {
          applyNavDockExpanded(true, navToggle);
        }
      }
    }

    function closeFloatingRowMenus() {
      document.querySelectorAll(".row-actions__menu, .more-menu").forEach(function (menu) {
        menu.setAttribute("hidden", "");
        menu.classList.remove("is-open");
      });
    }

    function bindNavDockClosesFloatingMenus() {
      if (document.documentElement.__qafNavDockCloseFloatingMenusBound) return;
      var dock = document.querySelector(".qaf-navdock");
      if (!dock) return;
      document.documentElement.__qafNavDockCloseFloatingMenusBound = true;
      dock.addEventListener("pointerenter", closeFloatingRowMenus);
    }

    var navDockPermissionWatchState = {
      bound: false,
      lastNewLP: null,
      pollTimer: null,
      pollAttempts: 0,
      maxPollAttempts: 24,
      pollIntervalMs: 500,
    };

    function shouldRefreshNavDock(listElementId) {
      var navList = document.getElementById(listElementId || "qafNavdockList");
      if (!navList) return false;

      var currentNewLP = getNewLPFromStorage();
      var menuItems = resolveNavMenuItems();
      var hasRenderedItems = navList.children.length > 0;

      if (currentNewLP !== navDockPermissionWatchState.lastNewLP) return true;
      if (!hasRenderedItems && menuItems.length > 0) return true;
      if (hasRenderedItems && navList.children.length !== menuItems.length) return true;
      return false;
    }

    function refreshNavDockFromPermissions(listElementId) {
      var listId = listElementId || "qafNavdockList";
      if (!shouldRefreshNavDock(listId)) return;
      renderNavDock(undefined, listId);
      navDockPermissionWatchState.lastNewLP = getNewLPFromStorage();
    }

    function scheduleNavDockPermissionPoll(listElementId) {
      if (navDockPermissionWatchState.pollAttempts >= navDockPermissionWatchState.maxPollAttempts) {
        return;
      }

      navDockPermissionWatchState.pollAttempts += 1;
      clearTimeout(navDockPermissionWatchState.pollTimer);
      navDockPermissionWatchState.pollTimer = setTimeout(function () {
        refreshNavDockFromPermissions(listElementId);

        var menuItems = resolveNavMenuItems();
        var currentNewLP = getNewLPFromStorage();
        if (!menuItems.length && !currentNewLP) {
          scheduleNavDockPermissionPoll(listElementId);
        }
      }, navDockPermissionWatchState.pollIntervalMs);
    }

    function bindNavDockPermissionWatch(listElementId) {
      if (navDockPermissionWatchState.bound) return;
      navDockPermissionWatchState.bound = true;

      window.addEventListener("storage", function (event) {
        if (!event || !event.key) return;
        if (
          event.key === "NewLP" ||
          event.key === "newLP" ||
          event.key === "newlp" ||
          event.key === "user_key"
        ) {
          navDockPermissionWatchState.lastNewLP = null;
          refreshNavDockFromPermissions(listElementId);
        }
      });
    }

    function startNavDockPermissionWatch(listElementId) {
      navDockPermissionWatchState.pollAttempts = 0;
      navDockPermissionWatchState.lastNewLP = null;
      bindNavDockPermissionWatch(listElementId);
      refreshNavDockFromPermissions(listElementId);
      scheduleNavDockPermissionPoll(listElementId);
    }

    var SLA_PAGE_PATHS = [
      "/pages/TeamSLA",
      "/pages/AgentSLA",
      "/pages/sladefinition",
      "/pages/HelpdeskAdmin",
    ];

    function normalizeBaseUrl(raw) {
      var value = String(raw || "").trim();
      if (!value) return "";
      value = value.replace(/\/+$/, "");
      if (!/^https?:\/\//i.test(value)) {
        value = "https://" + value.replace(/^\/+/, "");
      }
      return value;
    }

    function getPageBaseUrl() {
      var fromStorage = String(
        (window.localStorage && window.localStorage.getItem("ma")) || ""
      ).trim();
      if (fromStorage) return normalizeBaseUrl(fromStorage);
      if (window.location && window.location.origin) {
        return normalizeBaseUrl(window.location.origin);
      }
      return "";
    }

    function pathMatchesLocation(navigateTo, pathname) {
      var path = normalizeNavPath(pathname);
      var url = normalizeNavPath(navigateTo).replace(/^\//, "");
      return Boolean(url && path.indexOf(url) >= 0);
    }

    function getCurrentSlaPagePath() {
      var pathname = (window.location && window.location.pathname) || "";
      var match = null;
      SLA_PAGE_PATHS.forEach(function (pagePath) {
        if (pathMatchesLocation(pagePath, pathname)) {
          match = pagePath;
        }
      });
      return match;
    }

    function hasSlaPageAccess(newLP, pagePath) {
      if (!pagePath) return true;
      if (!String(newLP || "").trim()) return true;
      var allowedPaths = getAllowedPagePaths(newLP);
      var target = normalizeNavPath(pagePath);
      var index;
      for (index = 0; index < allowedPaths.length; index += 1) {
        if (normalizeNavPath(allowedPaths[index]) === target) return true;
      }
      return false;
    }

    function buildUnauthorizedRedirectUrl() {
      return getPageBaseUrl() + "/not-found?unauthorized=un";
    }

    function hideBodyForSlaAccessCheck() {
      if (document.body) document.body.style.visibility = "hidden";
    }

    function showBodyAfterSlaAccessCheck() {
      if (document.body) document.body.style.visibility = "";
    }

    function enforceSlaPageAccess() {
      var currentPage = getCurrentSlaPagePath();
      if (!currentPage) return true;
      if (!hasSlaPageAccess(getNewLPFromStorage(), currentPage)) {
        window.location.replace(buildUnauthorizedRedirectUrl());
        return false;
      }
      return true;
    }

    function init(options) {
      injectNavDockStyles();
      if (getCurrentSlaPagePath()) {
        if (!enforceSlaPageAccess()) return;
        showBodyAfterSlaAccessCheck();
      }
      var config = options || {};
      var listId = config.listElementId || "qafNavdockList";
      bindToggle(config.toggleElementId);
      bindSubMenuToggles(document.getElementById(listId));
      renderNavDock(config.items, listId);
      bindNavDockClosesFloatingMenus();
      startNavDockPermissionWatch(listId);
    }

    window.QafNavDock = {
      init: init,
      render: renderNavDock,
      defaults: HELPDESK_NAV_MENU.slice(),
      getPermittedMenu: getPermittedNavMenu,
      getNewLP: getNewLPFromStorage,
      refresh: refreshNavDockFromPermissions,
      toggle: function () {
        applyNavDockExpanded(!document.body.classList.contains("qaf-navdock-expanded"));
      },
      setExpanded: applyNavDockExpanded,
    };

    function onDocumentReady(fn) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
      else fn();
    }

    function autoInitNavDock() {
      if (window.__qafSkipNavDockAutoInit) return;
      if (!document.getElementById("qafNavdockList")) return;
      if (getCurrentSlaPagePath()) {
        if (!enforceSlaPageAccess()) return;
        showBodyAfterSlaAccessCheck();
      }
      var api = window.QafNavDock;
      if (!api || typeof api.init !== "function") return;
      api.init({
        toggleElementId: "qafNavToggle",
        listElementId: "qafNavdockList",
      });
    }

    if (getCurrentSlaPagePath()) {
      hideBodyForSlaAccessCheck();
    }

    onDocumentReady(autoInitNavDock);

    window.renderNavDock = function (items, listElementId) {
      var api = window.QafNavDock;
      if (api && typeof api.init === "function") {
        api.init({
          items: resolveNavMenuItems(items),
          toggleElementId: "qafNavToggle",
          listElementId: listElementId || "qafNavdockList",
        });
        return;
      }
      init({ items: resolveNavMenuItems(items), toggleElementId: "qafNavToggle", listElementId: listElementId || "qafNavdockList" });
    };

    window.toggleQafNavDockCollapse = function () {
      applyNavDockExpanded(!document.body.classList.contains("qaf-navdock-expanded"));
    };

  })();