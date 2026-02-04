// ==UserScript==
// @name         Gemini Chat Sidebar
// @namespace    http://tampermonkey.net/
// @author       ShaneD711
// @match        https://gemini.google.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- Config & State ---
    const DEFAULT_CONFIG = { width: 280, position: 'right' };
    let config = {
        width: parseInt(localStorage.getItem('gemini_sidebar_width')) || DEFAULT_CONFIG.width,
        position: localStorage.getItem('gemini_sidebar_pos') || DEFAULT_CONFIG.position
    };

    function saveConfig() {
        localStorage.setItem('gemini_sidebar_width', config.width);
        localStorage.setItem('gemini_sidebar_pos', config.position);
    }

    // --- CSS ---
    const css = `
        :root {
            --nav-bg: #1e1e1e; --nav-text: #fff; --nav-border: #444;
            --item-bg: #2a2a2a; --item-hover: #3a3a3a; --item-active: #1e3a1e;
            --input-bg: #333; --input-border: #555;
            --toggle-bg: #333; --toggle-hover: #444;
        }

        body.light-theme-detected {
            --nav-bg: #ffffff; --nav-text: #1f1f1f; --nav-border: #e0e0e0;
            --item-bg: #f0f4f8; --item-hover: #e1e5e8; --item-active: #ddfbb8;
            --input-bg: #fff; --input-border: #ccc;
            --toggle-bg: #e0e0e0; --toggle-hover: #d0d0d0;
        }

        #gemini-nav-sidebar {
            position: fixed; top: 0; bottom: 0; width: ${config.width}px;
            background: var(--nav-bg); color: var(--nav-text);
            border-left: 1px solid var(--nav-border);
            z-index: 2147483647 !important; display: flex; flex-direction: column;
            transition: transform 0.2s ease;
            box-shadow: -5px 0 20px rgba(0,0,0,0.15);
            font-family: 'Google Sans', Roboto, sans-serif;
        }

        .sidebar-right { right: 0; }
        .sidebar-left { left: 0; border-right: 1px solid var(--nav-border); border-left: none; }
        #gemini-nav-sidebar.collapsed { transform: translateX(100%); }

        /* Resizer */
        #gemini-resizer {
            position: absolute; top: 0; bottom: 0; width: 10px;
            cursor: col-resize; z-index: 10; opacity: 0; transition: opacity 0.2s;
        }
        #gemini-resizer:hover { opacity: 1; background: rgba(66, 133, 244, 0.3); }
        .sidebar-right #gemini-resizer { left: -5px; }
        .sidebar-left #gemini-resizer { right: -5px; }

        /* Edge Toggle Button */
        #gemini-nav-toggle {
            position: fixed; top: 50%; transform: translateY(-50%);
            width: 24px; height: 60px;
            background: var(--toggle-bg); color: var(--nav-text);
            border: 1px solid var(--nav-border);
            z-index: 2147483646;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            font-size: 14px; user-select: none;
            transition: right 0.2s ease, left 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        #gemini-nav-toggle:hover { background: var(--toggle-hover); }
        .toggle-right { border-radius: 8px 0 0 8px; border-right: none; }
        .toggle-left { border-radius: 0 8px 8px 0; border-left: none; }

        /* Header */
        .gemini-nav-header { padding: 12px; background: rgba(0,0,0,0.05); border-bottom: 1px solid var(--nav-border); display: flex; flex-direction: column; gap: 8px; }
        .header-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: bold; }

        #nav-search-input { width: 100%; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--nav-text); font-size: 12px; outline: none; box-sizing: border-box; }

        #load-history-btn {
            font-size: 11px; text-align: center; cursor: pointer; color: #888;
            padding: 6px; border: 1px dashed var(--nav-border); border-radius: 4px;
            transition: all 0.2s; user-select: none;
        }
        #load-history-btn:hover { background: rgba(66, 133, 244, 0.1); color: #4285f4; border-color: #4285f4; }
        #load-history-btn:active { transform: translateY(1px); }

        /* List */
        .gemini-nav-list { flex: 1; overflow-y: auto; padding: 8px; scroll-behavior: smooth; }

        .gemini-nav-item {
            padding: 10px; margin-bottom: 6px; background: var(--item-bg);
            cursor: pointer; border-radius: 6px; font-size: 12px; line-height: 1.5;
            transition: all 0.2s; border-left: 3px solid transparent;
            display: flex; flex-direction: column; gap: 2px;
        }
        .gemini-nav-item:hover { background: var(--item-hover); transform: translateX(-2px); }
        .gemini-nav-item.is-reading { background: var(--item-active); border-left-color: #34a853 !important; font-weight: bold; }

        .item-role { font-size: 10px; font-weight: 700; opacity: 0.7; text-transform: uppercase; margin-bottom: 2px; }
        .type-user .item-role { color: #4285f4; }
        .type-model .item-role { color: #aaa; }

        .item-text {
            display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
            overflow: hidden; text-overflow: ellipsis; word-break: break-word; white-space: normal;
        }

        .highlight-flash { outline: 2px solid #fbbc04 !important; transition: outline 0.5s; }
        .empty-tip { padding: 20px; color: #888; text-align: center; font-size: 12px; }
    `;
    GM_addStyle(css);

    let state = {
        collapsed: true,
        lastCount: 0,
        userScrolledUp: false,
        elementMap: new Map(),
        isResizing: false,
        isHistoryLoading: false // 状态锁
    };

    function updateTheme() {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const rgb = bodyBg.match(/\d+/g);
        if (rgb) {
            const brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000);
            if (brightness > 125) document.body.classList.add('light-theme-detected');
            else document.body.classList.remove('light-theme-detected');
        }
    }

    function createUI() {
        if(document.getElementById('gemini-nav-sidebar')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'gemini-nav-sidebar';
        sidebar.className = `collapsed sidebar-${config.position}`;
        sidebar.style.width = `${config.width}px`;

        const resizer = document.createElement('div');
        resizer.id = 'gemini-resizer';
        resizer.title = 'Drag to Resize';
        initResizer(resizer, sidebar);
        sidebar.appendChild(resizer);

        const header = document.createElement('div');
        header.className = 'gemini-nav-header';

        const row1 = document.createElement('div');
        row1.className = 'header-row';
        const titleSpan = document.createElement('span');

        // --- 修改点：这里修改了标题 ---
        titleSpan.textContent = 'Gemini 导航';
        // --------------------------

        const refreshBtn = document.createElement('span');
        refreshBtn.id = 'force-refresh';
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.title = 'Refresh';
        refreshBtn.textContent = '⟳';
        refreshBtn.onclick = () => { state.lastCount = 0; render(true); };
        row1.appendChild(titleSpan);
        row1.appendChild(refreshBtn);

        const searchInput = document.createElement('input');
        searchInput.id = 'nav-search-input';
        searchInput.placeholder = 'Search...';
        searchInput.addEventListener('input', (e) => filterList(e.target.value));

        const historyBtn = document.createElement('div');
        historyBtn.id = 'load-history-btn';
        historyBtn.textContent = '⬆ Load History';
        historyBtn.onclick = loadMoreHistory;

        header.appendChild(row1);
        header.appendChild(searchInput);
        header.appendChild(historyBtn);

        const list = document.createElement('div');
        list.className = 'gemini-nav-list';
        list.id = 'gemini-nav-list';

        list.addEventListener('scroll', () => {
            const isAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 50;
            state.userScrolledUp = !isAtBottom;
        });

        sidebar.appendChild(header);
        sidebar.appendChild(list);

        // Edge Toggle Button
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'gemini-nav-toggle';
        toggleBtn.className = config.position === 'right' ? 'toggle-right' : 'toggle-left';
        toggleBtn.textContent = '◀';

        document.body.appendChild(sidebar);
        document.body.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
            state.collapsed = !state.collapsed;
            updateSidebarState(sidebar, toggleBtn);
        });

        updateSidebarState(sidebar, toggleBtn);
    }

    function updateSidebarState(sidebar, btn) {
        const isRight = config.position === 'right';
        if (state.collapsed) {
            sidebar.classList.add('collapsed');
            if (isRight) { btn.style.right = '0px'; btn.style.left = 'auto'; btn.textContent = '◀'; }
            else { btn.style.left = '0px'; btn.style.right = 'auto'; btn.textContent = '▶'; }
        } else {
            sidebar.classList.remove('collapsed');
            if (isRight) { btn.style.right = `${config.width}px`; btn.style.left = 'auto'; btn.textContent = '▶'; }
            else { btn.style.left = `${config.width}px`; btn.style.right = 'auto'; btn.textContent = '◀'; }

            const list = document.getElementById('gemini-nav-list');
            if (list && !state.userScrolledUp) setTimeout(() => list.scrollTop = list.scrollHeight, 100);
        }
    }

    function initResizer(resizer, sidebar) {
        resizer.addEventListener('mousedown', (e) => {
            state.isResizing = true;
            document.body.style.cursor = 'col-resize';
            sidebar.style.transition = 'none';
            const btn = document.getElementById('gemini-nav-toggle');
            if(btn) btn.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!state.isResizing) return;
            let newWidth = config.position === 'right' ? window.innerWidth - e.clientX : e.clientX;
            const maxWidth = window.innerWidth * 0.8;

            if (newWidth > 200 && newWidth < maxWidth) {
                sidebar.style.width = `${newWidth}px`;
                config.width = newWidth;

                const btn = document.getElementById('gemini-nav-toggle');
                if (btn && !state.collapsed) {
                    if (config.position === 'right') btn.style.right = `${newWidth}px`;
                    else btn.style.left = `${newWidth}px`;
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (state.isResizing) {
                state.isResizing = false;
                document.body.style.cursor = '';
                sidebar.style.transition = '';
                const btn = document.getElementById('gemini-nav-toggle');
                if(btn) btn.style.transition = '';
                saveConfig();
            }
        });
    }

    function filterList(keyword) {
        const items = document.querySelectorAll('.gemini-nav-item');
        const term = keyword.toLowerCase();
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'flex' : 'none';
        });
    }

    function loadMoreHistory() {
        const anyMessage = document.querySelector('.user-query-container') || document.querySelector('.query-content');
        let scroller = null;

        if (anyMessage) {
            let parent = anyMessage.parentElement;
            while (parent) {
                const style = window.getComputedStyle(parent);
                if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
                    scroller = parent;
                    break;
                }
                parent = parent.parentElement;
                if (parent === document.body) {
                    if (document.documentElement.scrollHeight > window.innerHeight) scroller = window;
                    break;
                }
            }
        }

        if (!scroller) {
            const mainEl = document.querySelector('main');
            if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) scroller = mainEl;
        }

        if (scroller) {
            state.isHistoryLoading = true;
            const btn = document.getElementById('load-history-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Loading...';

            scroller.scrollTo({ top: 0, behavior: 'auto' });

            setTimeout(() => {
                btn.textContent = originalText;
                if(state.isHistoryLoading) render(true);
            }, 2000);
        } else {
            console.error('Gemini Sidebar: No scroller found');
            const btn = document.getElementById('load-history-btn');
            btn.textContent = 'Failed';
            setTimeout(() => btn.textContent = '⬆ Load History', 2000);
        }
    }

    function formatText(text) {
        const LIMIT = 3000;
        let formatted = text.substring(0, LIMIT);
        if (text.length > LIMIT) formatted += ' ...';
        return formatted;
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const navItem = state.elementMap.get(entry.target);
                if (navItem) {
                    document.querySelectorAll('.is-reading').forEach(el => el.classList.remove('is-reading'));
                    navItem.classList.add('is-reading');
                }
            }
        });
    }, { threshold: 0.5 });

    function render(force = false) {
        if (state.isResizing) return;
        const list = document.getElementById('gemini-nav-list');
        if (!list) return;

        updateTheme();

        const rawTargets = document.querySelectorAll('.user-query-container, .query-content, [data-message-id]');

        if (rawTargets.length === 0) {
            if (list.childElementCount > 0 && !list.firstChild.classList?.contains('empty-tip')) {
                list.textContent = '';
                const emptyTip = document.createElement('div');
                emptyTip.className = 'empty-tip';
                emptyTip.textContent = 'New Chat...';
                list.appendChild(emptyTip);
                state.lastCount = 0;
                state.elementMap.clear();
            }
            return;
        }

        // [ANCHOR STEP 1] 抓取指纹
        let anchorFingerprint = null;
        if (state.isHistoryLoading || force) {
            if (list.firstElementChild && !list.firstElementChild.classList.contains('empty-tip')) {
                const textEl = list.firstElementChild.querySelector('.item-text');
                if (textEl) anchorFingerprint = textEl.textContent;
            }
        }

        const uniqueMessages = [];
        rawTargets.forEach(el => {
            const text = el.innerText.trim();
            if (!text || text.length < 1) return;
            if (text === 'edit' || text === 'more_vert') return;

            if (uniqueMessages.length === 0) {
                uniqueMessages.push({ el: el, text: text });
                return;
            }

            const lastMsg = uniqueMessages[uniqueMessages.length - 1];
            if (lastMsg.el.contains(el)) return;
            if (el.contains(lastMsg.el)) {
                lastMsg.el = el;
                lastMsg.text = text;
                return;
            }
            uniqueMessages.push({ el: el, text: text });
        });

        const isNewMessage = uniqueMessages.length > state.lastCount;
        if (!force && !state.isHistoryLoading && uniqueMessages.length === state.lastCount) return;

        state.lastCount = uniqueMessages.length;
        list.textContent = '';
        state.elementMap.clear();
        intersectionObserver.disconnect();

        uniqueMessages.forEach((msg) => {
            const item = document.createElement('div');
            item.className = 'gemini-nav-item';

            const isUser = msg.el.className.includes('user') || msg.el.closest('.user-query-container');
            if (isUser) item.classList.add('type-user');
            else item.classList.add('type-model');

            const roleSpan = document.createElement('span');
            roleSpan.className = 'item-role';
            roleSpan.textContent = isUser ? 'You' : 'Gemini';

            const contentSpan = document.createElement('span');
            contentSpan.className = 'item-text';
            contentSpan.textContent = formatText(msg.text);
            contentSpan.title = msg.text.substring(0, 1000);

            item.appendChild(roleSpan);
            item.appendChild(contentSpan);

            item.onclick = () => {
                msg.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                msg.el.classList.add('highlight-flash');
                setTimeout(() => msg.el.classList.remove('highlight-flash'), 1000);
            };

            state.elementMap.set(msg.el, item);
            intersectionObserver.observe(msg.el);

            list.appendChild(item);
        });

        // [ANCHOR STEP 2] 纯净居中逻辑
        if (state.isHistoryLoading || force) {
            if (anchorFingerprint) {
                let anchorItem = null;
                for (let item of list.children) {
                    if (item.querySelector('.item-text')?.textContent === anchorFingerprint) {
                        anchorItem = item;
                        break;
                    }
                }

                // 核心：强制居中 (Center Lock)
                if (anchorItem) {
                    setTimeout(() => {
                        anchorItem.scrollIntoView({ block: 'center', behavior: 'auto' });
                    }, 0);
                }
            }
            state.isHistoryLoading = false;
        }
        else if (isNewMessage && !state.userScrolledUp && !force && !state.isHistoryLoading) {
            setTimeout(() => { list.scrollTop = list.scrollHeight; }, 50);
        }
    }

    function initGlobalListener() {
        document.body.addEventListener('click', () => setTimeout(() => render(), 300));
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                state.lastCount = 0;
                state.userScrolledUp = false;
                render(true);
            }
        }, 500);
    }

    function init() {
        createUI();
        setInterval(() => render(false), 1000);
        initGlobalListener();
        console.log('Gemini Chat Outline Loaded');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }

})();