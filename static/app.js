/**
 * SmartBot — Modern AI Chatbot Client Application
 * ------------------------------------------------
 * Handles conversational state, local storage persistence, streaming/typing UX,
 * safe markdown rendering with syntax highlighting, voice synthesis, speech recognition,
 * and seamless theme switching.
 */

(function () {
    'use strict';

    // =========================================================================
    // Application State & Configuration
    // =========================================================================
    const STORAGE_KEY_CONVERSATIONS = 'smartbot_conversations_v1';
    const STORAGE_KEY_ACTIVE_ID = 'smartbot_active_chat_id';
    const STORAGE_KEY_THEME = 'smartbot_theme';
    const STORAGE_KEY_TTS = 'smartbot_tts_enabled';

    let state = {
        conversations: [],
        currentId: null,
        isGenerating: false,
        ttsEnabled: false,
        theme: 'dark',
        backendStatus: null,
        speechRecognition: null,
        isRecordingVoice: false
    };

    // =========================================================================
    // DOM Element References
    // =========================================================================
    const elements = {
        appLayout: document.getElementById('app-layout'),
        sidebar: document.getElementById('sidebar'),
        sidebarBackdrop: document.getElementById('sidebar-backdrop'),
        toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
        closeSidebarBtn: document.getElementById('close-sidebar-btn'),
        newChatBtn: document.getElementById('new-chat-btn'),
        searchInput: document.getElementById('search-input'),
        searchClearBtn: document.getElementById('search-clear-btn'),
        conversationList: document.getElementById('conversation-list'),
        emptyHistory: document.getElementById('empty-history'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        clearAllHistoryBtn: document.getElementById('clear-all-history-btn'),
        activeChatTitle: document.getElementById('active-chat-title'),
        renameTitleBtn: document.getElementById('rename-title-btn'),
        currentModelName: document.getElementById('current-model-name'),
        navbarModelPill: document.getElementById('navbar-model-pill'),
        ttsToggleBtn: document.getElementById('tts-toggle-btn'),
        ttsIconOn: document.getElementById('tts-icon-on'),
        ttsIconOff: document.getElementById('tts-icon-off'),
        exportBtn: document.getElementById('export-btn'),
        exportDropdown: document.getElementById('export-dropdown'),
        exportMd: document.getElementById('export-md'),
        exportTxt: document.getElementById('export-txt'),
        exportJson: document.getElementById('export-json'),
        clearCurrentBtn: document.getElementById('clear-current-btn'),
        notificationBanner: document.getElementById('notification-banner'),
        notificationMsg: document.getElementById('notification-msg'),
        notificationClose: document.getElementById('notification-close'),
        chatScrollArea: document.getElementById('chat-scroll-area'),
        welcomeScreen: document.getElementById('welcome-screen'),
        suggestionsGrid: document.getElementById('suggestions-grid'),
        messagesContainer: document.getElementById('messages-container'),
        typingIndicator: document.getElementById('typing-indicator'),
        messagesAnchor: document.getElementById('messages-anchor'),
        scrollBottomBtn: document.getElementById('scroll-bottom-btn'),
        chatForm: document.getElementById('chat-form'),
        inputCard: document.getElementById('input-card'),
        micBtn: document.getElementById('mic-btn'),
        messageInput: document.getElementById('message-input'),
        sendBtn: document.getElementById('send-btn'),
        sendSpinner: document.getElementById('send-spinner'),
        charCounter: document.getElementById('char-counter'),
        statusCard: document.getElementById('status-card'),
        statusDot: document.getElementById('status-dot'),
        statusText: document.getElementById('status-text'),
        statusModelTag: document.getElementById('status-model-tag'),
        // Modal
        confirmationModal: document.getElementById('confirmation-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalMessage: document.getElementById('modal-message'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),
        modalCancelX: document.getElementById('modal-cancel-x')
    };

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        initTheme();
        initSpeechRecognition();
        initTTS();
        loadStateFromStorage();
        bindEventListeners();
        checkBackendStatus();

        // Render conversation list and active chat
        if (!state.currentId || !getConversationById(state.currentId)) {
            createNewConversation(false);
        } else {
            renderConversationsList();
            renderActiveMessages();
        }

        autoResizeInput();
    }

    // =========================================================================
    // Storage & State Management
    // =========================================================================
    function loadStateFromStorage() {
        try {
            const rawChats = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
            state.conversations = rawChats ? JSON.parse(rawChats) : [];
        } catch (e) {
            console.error('Failed to parse conversations from localStorage:', e);
            state.conversations = [];
        }

        state.currentId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || null;
        state.ttsEnabled = localStorage.getItem(STORAGE_KEY_TTS) === 'true';
        updateTTSButtonUI();
    }

    function saveStateToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(state.conversations));
            if (state.currentId) {
                localStorage.setItem(STORAGE_KEY_ACTIVE_ID, state.currentId);
            } else {
                localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
            }
        } catch (e) {
            console.error('Failed to save state to localStorage:', e);
        }
    }

    function getConversationById(id) {
        return state.conversations.find(c => c.id === id);
    }

    function createNewConversation(shouldFocus = true) {
        const newChat = {
            id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: 'New Conversation',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: []
        };

        state.conversations.unshift(newChat);
        state.currentId = newChat.id;
        saveStateToStorage();

        renderConversationsList();
        renderActiveMessages();

        if (window.innerWidth <= 768) {
            closeSidebar();
        }

        if (shouldFocus) {
            elements.messageInput.focus();
        }
    }

    function deleteConversation(id, event) {
        if (event) event.stopPropagation();

        showConfirmDialog(
            'Delete Conversation',
            'Are you sure you want to delete this conversation? This action cannot be undone.',
            () => {
                state.conversations = state.conversations.filter(c => c.id !== id);

                if (state.currentId === id) {
                    state.currentId = state.conversations.length > 0 ? state.conversations[0].id : null;
                }

                saveStateToStorage();

                if (!state.currentId) {
                    createNewConversation(false);
                } else {
                    renderConversationsList();
                    renderActiveMessages();
                }
                showNotification('Conversation deleted.', 'info');
            }
        );
    }

    function clearCurrentConversation() {
        const activeChat = getConversationById(state.currentId);
        if (!activeChat || activeChat.messages.length === 0) return;

        showConfirmDialog(
            'Clear Messages',
            'Are you sure you want to clear all messages from this conversation?',
            () => {
                activeChat.messages = [];
                activeChat.title = 'New Conversation';
                activeChat.updatedAt = new Date().toISOString();
                saveStateToStorage();
                renderConversationsList();
                renderActiveMessages();
                showNotification('Chat messages cleared.', 'info');
            }
        );
    }

    function clearAllHistory() {
        if (state.conversations.length === 0) return;

        showConfirmDialog(
            'Clear All Conversations',
            'Are you sure you want to permanently delete all your conversation history?',
            () => {
                state.conversations = [];
                state.currentId = null;
                saveStateToStorage();
                createNewConversation(false);
                showNotification('All conversation history cleared.', 'info');
            }
        );
    }

    function switchConversation(id) {
        if (state.currentId === id) return;
        state.currentId = id;
        saveStateToStorage();
        renderConversationsList();
        renderActiveMessages();

        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    function updateConversationTitle(id, newTitle) {
        const chat = getConversationById(id);
        if (!chat) return;

        const trimmed = (newTitle || '').trim();
        chat.title = trimmed || 'New Conversation';
        chat.updatedAt = new Date().toISOString();
        saveStateToStorage();

        renderConversationsList();
        if (state.currentId === id) {
            elements.activeChatTitle.textContent = chat.title;
        }
    }

    // =========================================================================
    // UI Rendering: Sidebar & Conversations
    // =========================================================================
    function renderConversationsList() {
        const searchTerm = (elements.searchInput.value || '').trim().toLowerCase();
        elements.conversationList.innerHTML = '';

        const filtered = state.conversations.filter(chat => {
            if (!searchTerm) return true;
            if (chat.title.toLowerCase().includes(searchTerm)) return true;
            return chat.messages.some(m => m.content.toLowerCase().includes(searchTerm));
        });

        if (filtered.length === 0) {
            elements.emptyHistory.style.display = 'block';
            elements.emptyHistory.querySelector('p').textContent = searchTerm ? 'No matching chats found.' : 'No conversations yet.';
            return;
        } else {
            elements.emptyHistory.style.display = 'none';
        }

        filtered.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'conversation-item' + (chat.id === state.currentId ? ' active' : '');
            item.setAttribute('data-id', chat.id);

            item.innerHTML = `
                <svg class="conversation-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="conversation-item-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
                <div class="conversation-item-actions">
                    <button class="item-action-btn btn-rename" title="Rename" aria-label="Rename conversation">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    </button>
                    <button class="item-action-btn btn-delete" title="Delete" aria-label="Delete conversation">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;

            // Click item to switch
            item.addEventListener('click', () => switchConversation(chat.id));

            // Rename button click
            const renameBtn = item.querySelector('.btn-rename');
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newTitle = prompt('Enter a new title for this conversation:', chat.title);
                if (newTitle !== null) {
                    updateConversationTitle(chat.id, newTitle);
                }
            });

            // Delete button click
            const delBtn = item.querySelector('.btn-delete');
            delBtn.addEventListener('click', (e) => deleteConversation(chat.id, e));

            elements.conversationList.appendChild(item);
        });
    }

    // =========================================================================
    // UI Rendering: Chat Area & Messages
    // =========================================================================
    function renderActiveMessages() {
        const activeChat = getConversationById(state.currentId);
        elements.messagesContainer.innerHTML = '';

        if (!activeChat || activeChat.messages.length === 0) {
            elements.welcomeScreen.style.display = 'flex';
            elements.activeChatTitle.textContent = 'New Conversation';
            return;
        }

        elements.welcomeScreen.style.display = 'none';
        elements.activeChatTitle.textContent = activeChat.title || 'Conversation';

        activeChat.messages.forEach((msg, idx) => {
            appendMessageToDOM(msg.role, msg.content, msg.timestamp, idx, false);
        });

        scrollToBottom(false);
    }

    function appendMessageToDOM(role, content, timestamp, index, animate = true) {
        const row = document.createElement('div');
        row.className = `message-row ${role}`;
        if (!animate) row.style.animation = 'none';

        const timeStr = timestamp ? formatTime(timestamp) : formatTime(new Date().toISOString());

        if (role === 'user') {
            row.innerHTML = `
                <div class="message-content-wrapper">
                    <div class="message-bubble">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
                    <div class="message-actions">
                        <span>${timeStr}</span>
                    </div>
                </div>
                <div class="avatar user-avatar" title="You">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
            `;
        } else {
            // Assistant Message with Markdown formatting and action bar
            const renderedHtml = renderMarkdownSafely(content);

            row.innerHTML = `
                <div class="avatar bot-avatar" title="SmartBot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2a2 2 0 0 1 2 2v2h2a6 6 0 0 1 6 6v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a6 6 0 0 1 6-6h2V4a2 2 0 0 1 2-2z"></path>
                        <circle cx="9" cy="13" r="1.5" fill="currentColor"></circle>
                        <circle cx="15" cy="13" r="1.5" fill="currentColor"></circle>
                    </svg>
                </div>
                <div class="message-content-wrapper">
                    <div class="message-bubble markdown-body">${renderedHtml}</div>
                    <div class="message-actions">
                        <button class="msg-action-btn btn-copy-msg" title="Copy entire response">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                        <button class="msg-action-btn btn-speak-msg" title="Read aloud">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                            <span>Listen</span>
                        </button>
                        <button class="msg-action-btn btn-retry-msg" title="Regenerate this response">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            <span>Retry</span>
                        </button>
                        <span style="margin-left: auto;">${timeStr}</span>
                    </div>
                </div>
            `;

            // Attach listeners to assistant action buttons
            const copyBtn = row.querySelector('.btn-copy-msg');
            copyBtn.addEventListener('click', () => {
                copyTextToClipboard(content, copyBtn);
            });

            const speakBtn = row.querySelector('.btn-speak-msg');
            speakBtn.addEventListener('click', () => {
                speakText(content);
            });

            const retryBtn = row.querySelector('.btn-retry-msg');
            retryBtn.addEventListener('click', () => {
                retryLastResponse();
            });

            // Decorate any code blocks with copy buttons and language headers
            decorateCodeBlocks(row);
        }

        elements.messagesContainer.appendChild(row);
    }

    // =========================================================================
    // Markdown Rendering & Code Block Enhancement
    // =========================================================================
    function renderMarkdownSafely(rawMarkdown) {
        if (!rawMarkdown) return '';

        // If marked.js is available on window, use it
        if (typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function') {
            try {
                // Configure marked options
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    highlight: function (code, lang) {
                        if (typeof window.hljs !== 'undefined') {
                            const validLang = lang && window.hljs.getLanguage(lang) ? lang : null;
                            if (validLang) {
                                return window.hljs.highlight(code, { language: validLang }).value;
                            }
                            return window.hljs.highlightAuto(code).value;
                        }
                        return escapeHtml(code);
                    }
                });
                return window.marked.parse(rawMarkdown);
            } catch (err) {
                console.warn('Marked parsing error, falling back to basic parser:', err);
            }
        }

        // Offline / Fallback Lightweight Markdown Parser
        return fallbackMarkdownParser(rawMarkdown);
    }

    function fallbackMarkdownParser(text) {
        let escaped = escapeHtml(text);

        // Code blocks: ```lang ... ```
        escaped = escaped.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, function (match, lang, code) {
            return `<pre><code class="language-${lang || 'plaintext'}">${code}</code></pre>`;
        });

        // Inline code: `code`
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headers: ###, ##, #
        escaped = escaped.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        escaped = escaped.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        escaped = escaped.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold & Italic
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Blockquotes
        escaped = escaped.replace(/^>\s?(.*$)/gim, '<blockquote>$1</blockquote>');

        // Bullet lists
        escaped = escaped.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
        escaped = escaped.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Paragraph line breaks
        escaped = escaped.replace(/\n\n+/g, '</p><p>');
        escaped = '<p>' + escaped + '</p>';
        escaped = escaped.replace(/<p><\/p>/g, '');

        return escaped;
    }

    function decorateCodeBlocks(container) {
        const pres = container.querySelectorAll('pre');
        pres.forEach(pre => {
            const codeEl = pre.querySelector('code');
            const codeText = codeEl ? codeEl.innerText : pre.innerText;

            // Determine language tag
            let lang = 'code';
            if (codeEl && codeEl.className) {
                const match = codeEl.className.match(/language-([a-zA-Z0-9_\-\+]+)/);
                if (match) lang = match[1];
            }

            // Wrap pre in code-container
            const wrapper = document.createElement('div');
            wrapper.className = 'code-container';

            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <span class="code-lang">${lang.toUpperCase()}</span>
                <button class="copy-code-btn" title="Copy code snippet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy code</span>
                </button>
            `;

            const copyBtn = header.querySelector('.copy-code-btn');
            copyBtn.addEventListener('click', () => {
                copyTextToClipboard(codeText, copyBtn, 'Copied!');
            });

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(header);
            wrapper.appendChild(pre);

            // Trigger highlight.js if available
            if (typeof window.hljs !== 'undefined' && codeEl) {
                try {
                    window.hljs.highlightElement(codeEl);
                } catch (e) {
                    // Ignore syntax highlighting error
                }
            }
        });
    }

    // =========================================================================
    // Core Message Sending Flow
    // =========================================================================
    async function sendMessage(overrideText = null) {
        if (state.isGenerating) return;

        const text = (overrideText !== null ? overrideText : elements.messageInput.value).trim();
        if (!text) return;

        // Ensure active conversation exists
        let activeChat = getConversationById(state.currentId);
        if (!activeChat) {
            createNewConversation(false);
            activeChat = getConversationById(state.currentId);
        }

        // Auto-generate title if this is the first user message
        if (activeChat.messages.length === 0) {
            const autoTitle = text.length > 32 ? text.substring(0, 32).trim() + '...' : text;
            activeChat.title = autoTitle;
            elements.activeChatTitle.textContent = autoTitle;
        }

        // Hide welcome screen
        elements.welcomeScreen.style.display = 'none';

        // Add user message to state
        const userMsg = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        };
        activeChat.messages.push(userMsg);
        activeChat.updatedAt = new Date().toISOString();
        saveStateToStorage();

        // Render user message to DOM
        appendMessageToDOM('user', text, userMsg.timestamp, activeChat.messages.length - 1, true);

        // Reset input box
        elements.messageInput.value = '';
        autoResizeInput();
        updateCharCounter();
        scrollToBottom(true);
        renderConversationsList();

        // Show typing indicator & disable input
        setGeneratingState(true);

        // Prepare context window
        const contextMessages = activeChat.messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // --- Streaming via SSE fetch ---
        let fullReply = '';
        let streamRow = null;
        let streamBubble = null;

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: contextMessages })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error ${response.status}`);
            }

            // Create a streaming message row immediately
            streamRow = document.createElement('div');
            streamRow.className = 'message-row assistant streaming';
            streamRow.innerHTML = `
                <div class="avatar bot-avatar" title="SmartBot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2a2 2 0 0 1 2 2v2h2a6 6 0 0 1 6 6v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a6 6 0 0 1 6-6h2V4a2 2 0 0 1 2-2z"></path>
                        <circle cx="9" cy="13" r="1.5" fill="currentColor"></circle>
                        <circle cx="15" cy="13" r="1.5" fill="currentColor"></circle>
                    </svg>
                </div>
                <div class="message-content-wrapper">
                    <div class="message-bubble markdown-body stream-content"></div>
                </div>
            `;
            elements.typingIndicator.style.display = 'none';
            elements.messagesContainer.appendChild(streamRow);
            streamBubble = streamRow.querySelector('.stream-content');
            scrollToBottom(true);

            // Read the SSE stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const jsonStr = line.slice(6).trim();
                    if (!jsonStr) continue;

                    try {
                        const evt = JSON.parse(jsonStr);

                        if (evt.error) {
                            throw new Error(evt.error);
                        }

                        if (evt.chunk) {
                            fullReply += evt.chunk;
                            // Render streaming markdown live
                            streamBubble.innerHTML = renderMarkdownSafely(fullReply) + '<span class="stream-cursor">▊</span>';
                            scrollToBottom(false);
                        }

                        if (evt.done) {
                            // Final render — remove cursor, add action buttons
                            streamBubble.innerHTML = renderMarkdownSafely(fullReply);
                            decorateCodeBlocks(streamRow);

                            const timeStr = formatTime(new Date().toISOString());
                            const actionsDiv = document.createElement('div');
                            actionsDiv.className = 'message-actions';
                            actionsDiv.innerHTML = `
                                <button class="msg-action-btn btn-copy-msg" title="Copy entire response">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    <span>Copy</span>
                                </button>
                                <button class="msg-action-btn btn-speak-msg" title="Read aloud">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                    <span>Listen</span>
                                </button>
                                <button class="msg-action-btn btn-retry-msg" title="Regenerate this response">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                                    <span>Retry</span>
                                </button>
                                <span style="margin-left: auto;">${timeStr}</span>
                            `;

                            const wrapper = streamRow.querySelector('.message-content-wrapper');
                            wrapper.appendChild(actionsDiv);

                            actionsDiv.querySelector('.btn-copy-msg').addEventListener('click', function() {
                                copyTextToClipboard(fullReply, this);
                            });
                            actionsDiv.querySelector('.btn-speak-msg').addEventListener('click', () => speakText(fullReply));
                            actionsDiv.querySelector('.btn-retry-msg').addEventListener('click', () => retryLastResponse());

                            streamRow.classList.remove('streaming');
                        }

                    } catch (parseErr) {
                        if (parseErr.message && parseErr.message !== 'Unexpected end of JSON input') {
                            throw parseErr;
                        }
                    }
                }
            }

            if (!fullReply) throw new Error('No response received from AI.');

            // Save assistant message to state
            const assistantMsg = {
                role: 'assistant',
                content: fullReply,
                timestamp: new Date().toISOString()
            };
            activeChat.messages.push(assistantMsg);
            activeChat.updatedAt = new Date().toISOString();
            saveStateToStorage();

            scrollToBottom(true);

            if (state.ttsEnabled) {
                speakText(fullReply);
            }

        } catch (err) {
            console.error('Stream Chat Error:', err);
            if (streamRow) streamRow.remove();
            handleChatError(err.message);
        } finally {
            setGeneratingState(false);
            elements.messageInput.focus();
        }
    }


    function handleChatError(errorMessage) {
        const errorContent = `⚠️ **Error Processing Request**\n\n${errorMessage}\n\n*Click the "Retry" button below or verify your network connection and .env configuration.*`;
        
        let activeChat = getConversationById(state.currentId);
        if (activeChat) {
            const errorMsg = {
                role: 'assistant',
                content: errorContent,
                timestamp: new Date().toISOString()
            };
            activeChat.messages.push(errorMsg);
            saveStateToStorage();
            appendMessageToDOM('assistant', errorContent, errorMsg.timestamp, activeChat.messages.length - 1, true);
            scrollToBottom(true);
        }

        showNotification('Unable to fetch AI response. Check connection.', 'danger');
    }

    function retryLastResponse() {
        const activeChat = getConversationById(state.currentId);
        if (!activeChat || activeChat.messages.length === 0) return;

        // Find the last user message
        let lastUserMessage = null;
        for (let i = activeChat.messages.length - 1; i >= 0; i--) {
            if (activeChat.messages[i].role === 'user') {
                lastUserMessage = activeChat.messages[i].content;
                break;
            }
        }

        if (lastUserMessage) {
            // Remove the last assistant / error message if present
            if (activeChat.messages[activeChat.messages.length - 1].role === 'assistant') {
                activeChat.messages.pop();
                saveStateToStorage();
                renderActiveMessages();
            }
            sendMessage(lastUserMessage);
        }
    }

    function setGeneratingState(isGenerating) {
        state.isGenerating = isGenerating;
        elements.sendBtn.disabled = isGenerating;
        elements.typingIndicator.style.display = isGenerating ? 'block' : 'none';

        const sendIcon = elements.sendBtn.querySelector('.send-icon');
        if (isGenerating) {
            sendIcon.style.display = 'none';
            elements.sendSpinner.style.display = 'inline-block';
            if (elements.messagesAnchor) {
                elements.messagesAnchor.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            sendIcon.style.display = 'inline-block';
            elements.sendSpinner.style.display = 'none';
        }
    }

    // =========================================================================
    // Speech Recognition (Voice Input)
    // =========================================================================
    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            elements.micBtn.title = 'Speech Recognition not supported in this browser';
            elements.micBtn.style.opacity = '0.5';
            return;
        }

        try {
            state.speechRecognition = new SpeechRec();
            state.speechRecognition.continuous = false;
            state.speechRecognition.interimResults = true;
            state.speechRecognition.lang = 'en-US';

            state.speechRecognition.onstart = () => {
                state.isRecordingVoice = true;
                elements.micBtn.classList.add('recording');
                elements.messageInput.placeholder = 'Listening... Speak into your microphone';
            };

            state.speechRecognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                elements.messageInput.value = transcript;
                autoResizeInput();
                updateCharCounter();
            };

            state.speechRecognition.onerror = (event) => {
                console.warn('Speech Recognition error:', event.error);
                stopVoiceRecording();
            };

            state.speechRecognition.onend = () => {
                stopVoiceRecording();
            };
        } catch (e) {
            console.error('Speech recognition initialization failed:', e);
        }
    }

    function toggleVoiceRecording() {
        if (!state.speechRecognition) {
            showNotification('Voice recognition is not supported in this browser.', 'warning');
            return;
        }

        if (state.isRecordingVoice) {
            state.speechRecognition.stop();
            stopVoiceRecording();
        } else {
            try {
                state.speechRecognition.start();
            } catch (err) {
                console.warn('Could not start speech recognition:', err);
            }
        }
    }

    function stopVoiceRecording() {
        state.isRecordingVoice = false;
        elements.micBtn.classList.remove('recording');
        elements.messageInput.placeholder = 'Message SmartBot... (Press Enter to send, Shift+Enter for new line)';
    }

    // =========================================================================
    // Text-to-Speech (Audio Voice Output)
    // =========================================================================
    function initTTS() {
        if (!('speechSynthesis' in window)) {
            elements.ttsToggleBtn.style.display = 'none';
        }
    }

    function toggleTTS() {
        state.ttsEnabled = !state.ttsEnabled;
        localStorage.setItem(STORAGE_KEY_TTS, state.ttsEnabled.toString());
        updateTTSButtonUI();
        if (state.ttsEnabled) {
            showNotification('Auto Voice Readout enabled.', 'info');
        } else {
            window.speechSynthesis.cancel();
            showNotification('Voice Readout muted.', 'info');
        }
    }

    function updateTTSButtonUI() {
        if (state.ttsEnabled) {
            elements.ttsIconOn.style.display = 'block';
            elements.ttsIconOff.style.display = 'none';
            elements.ttsToggleBtn.classList.add('active');
        } else {
            elements.ttsIconOn.style.display = 'none';
            elements.ttsIconOff.style.display = 'block';
            elements.ttsToggleBtn.classList.remove('active');
        }
    }

    function speakText(markdownOrPlainText) {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel(); // Stop prior speech

        // Strip markdown tokens for clear speech
        const plainText = markdownOrPlainText
            .replace(/```[\s\S]*?```/g, 'Code block omitted.')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[#*_~\[\]\(\)>]/g, '')
            .trim();

        if (!plainText) return;

        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.speak(utterance);
    }

    // =========================================================================
    // Exporting Conversations (Markdown, Plain Text, JSON)
    // =========================================================================
    function exportConversation(format) {
        const activeChat = getConversationById(state.currentId);
        if (!activeChat || activeChat.messages.length === 0) {
            showNotification('Nothing to export. Chat is empty.', 'warning');
            return;
        }

        let content = '';
        let filename = `${activeChat.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}_${Date.now()}`;
        let mimeType = 'text/plain';

        if (format === 'md') {
            filename += '.md';
            mimeType = 'text/markdown';
            content = `# ${activeChat.title}\n\n*Created on: ${new Date(activeChat.createdAt).toLocaleString()}*\n\n---\n\n`;
            activeChat.messages.forEach(m => {
                const author = m.role === 'user' ? '### 👤 User' : '### 🤖 SmartBot';
                content += `${author} (${formatTime(m.timestamp)})\n\n${m.content}\n\n---\n\n`;
            });
        } else if (format === 'txt') {
            filename += '.txt';
            mimeType = 'text/plain';
            content = `${activeChat.title}\nExported: ${new Date().toLocaleString()}\n\n`;
            activeChat.messages.forEach(m => {
                const author = m.role === 'user' ? '[User]' : '[SmartBot]';
                content += `${author} ${formatTime(m.timestamp)}:\n${m.content}\n\n`;
            });
        } else if (format === 'json') {
            filename += '.json';
            mimeType = 'application/json';
            content = JSON.stringify(activeChat, null, 2);
        }

        downloadBlob(content, filename, mimeType);
        elements.exportDropdown.classList.remove('show');
        showNotification(`Exported as ${format.toUpperCase()}`, 'info');
    }

    function downloadBlob(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // =========================================================================
    // Theme Management
    // =========================================================================
    function initTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY_THEME, theme);

        // Update highlight.js theme stylesheet if available
        const hljsLink = document.getElementById('hljs-theme');
        if (hljsLink) {
            if (theme === 'light') {
                hljsLink.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css';
            } else {
                hljsLink.href = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github-dark-dimmed.min.css';
            }
        }
    }

    function toggleTheme() {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }

    // =========================================================================
    // Backend Status Check
    // =========================================================================
    async function checkBackendStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                const data = await res.json();
                state.backendStatus = data;

                elements.statusModelTag.textContent = data.model || 'gpt-4o-mini';
                elements.currentModelName.textContent = data.model || 'gpt-4o-mini';

                if (data.api_key_configured) {
                    elements.statusDot.className = 'status-dot online';
                    elements.statusText.textContent = 'API Connected';
                    elements.statusCard.title = 'OpenAI API is configured and operational';
                } else {
                    elements.statusDot.className = 'status-dot';
                    elements.statusText.textContent = 'Demo Mode (No Key)';
                    elements.statusCard.title = 'Running in Demo Mode: Add OPENAI_API_KEY to .env for live AI';
                    showNotification('Demo Mode Active: Set OPENAI_API_KEY in .env for live answers.', 'warning');
                }
            } else {
                throw new Error('Non-200 status response');
            }
        } catch (err) {
            elements.statusDot.className = 'status-dot error';
            elements.statusText.textContent = 'Offline / Error';
            elements.statusCard.title = 'Cannot connect to Flask backend.';
        }
    }

    // =========================================================================
    // Utility & Helper Functions
    // =========================================================================
    function autoResizeInput() {
        const input = elements.messageInput;
        input.style.height = 'auto';
        const newHeight = Math.min(input.scrollHeight, 180);
        input.style.height = `${newHeight}px`;

        const hasText = input.value.trim().length > 0;
        elements.sendBtn.disabled = !hasText || state.isGenerating;
    }

    function updateCharCounter() {
        const len = elements.messageInput.value.length;
        elements.charCounter.textContent = `${len} / 4000`;

        if (len > 3800) {
            elements.charCounter.className = 'char-counter limit';
        } else if (len > 3000) {
            elements.charCounter.className = 'char-counter warning';
        } else {
            elements.charCounter.className = 'char-counter';
        }
    }

    function scrollToBottom(smooth = true) {
        if (elements.messagesAnchor) {
            elements.messagesAnchor.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTime(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    function copyTextToClipboard(text, triggerBtn, successText = 'Copied!') {
        if (!navigator.clipboard) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        } else {
            navigator.clipboard.writeText(text);
        }

        if (triggerBtn) {
            const span = triggerBtn.querySelector('span');
            const originalText = span ? span.textContent : '';
            triggerBtn.classList.add('copied');
            if (span) span.textContent = successText;

            setTimeout(() => {
                triggerBtn.classList.remove('copied');
                if (span) span.textContent = originalText;
            }, 2000);
        }
    }

    function showNotification(message, type = 'info') {
        elements.notificationMsg.textContent = message;
        elements.notificationBanner.className = `notification-banner ${type}`;
        elements.notificationBanner.style.display = 'flex';

        setTimeout(() => {
            elements.notificationBanner.style.display = 'none';
        }, 5000);
    }

    function showConfirmDialog(title, message, onConfirm) {
        elements.modalTitle.textContent = title;
        elements.modalMessage.textContent = message;
        elements.confirmationModal.style.display = 'flex';

        const handleConfirm = () => {
            elements.confirmationModal.style.display = 'none';
            cleanup();
            if (typeof onConfirm === 'function') onConfirm();
        };

        const handleCancel = () => {
            elements.confirmationModal.style.display = 'none';
            cleanup();
        };

        const cleanup = () => {
            elements.modalConfirmBtn.removeEventListener('click', handleConfirm);
            elements.modalCancelBtn.removeEventListener('click', handleCancel);
            elements.modalCancelX.removeEventListener('click', handleCancel);
        };

        elements.modalConfirmBtn.addEventListener('click', handleConfirm);
        elements.modalCancelBtn.addEventListener('click', handleCancel);
        elements.modalCancelX.addEventListener('click', handleCancel);
    }

    function openSidebar() {
        elements.sidebar.classList.add('open');
        elements.sidebarBackdrop.classList.add('active');
    }

    function closeSidebar() {
        elements.sidebar.classList.remove('open');
        elements.sidebarBackdrop.classList.remove('active');
    }

    // =========================================================================
    // Event Listeners Binding
    // =========================================================================
    function bindEventListeners() {
        // Sidebar Toggle
        elements.toggleSidebarBtn.addEventListener('click', () => {
            if (elements.sidebar.classList.contains('open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        elements.closeSidebarBtn.addEventListener('click', closeSidebar);
        elements.sidebarBackdrop.addEventListener('click', closeSidebar);

        // New Chat Buttons
        elements.newChatBtn.addEventListener('click', () => createNewConversation(true));

        // Keyboard Shortcuts (Ctrl+K for New Chat)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                createNewConversation(true);
            }
        });

        // Search in conversations
        elements.searchInput.addEventListener('input', () => {
            const val = elements.searchInput.value.trim();
            elements.searchClearBtn.style.display = val ? 'block' : 'none';
            renderConversationsList();
        });

        elements.searchClearBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            elements.searchClearBtn.style.display = 'none';
            renderConversationsList();
        });

        // Theme Toggle
        elements.themeToggleBtn.addEventListener('click', toggleTheme);

        // Clear All History
        elements.clearAllHistoryBtn.addEventListener('click', clearAllHistory);

        // Clear Current Chat
        elements.clearCurrentBtn.addEventListener('click', clearCurrentConversation);

        // Rename Active Chat Title
        elements.renameTitleBtn.addEventListener('click', () => {
            const activeChat = getConversationById(state.currentId);
            if (!activeChat) return;
            const newTitle = prompt('Rename this conversation:', activeChat.title);
            if (newTitle !== null) {
                updateConversationTitle(state.currentId, newTitle);
            }
        });

        // Inline double-click title to rename
        elements.activeChatTitle.addEventListener('dblclick', () => {
            const activeChat = getConversationById(state.currentId);
            if (!activeChat) return;
            const newTitle = prompt('Rename this conversation:', activeChat.title);
            if (newTitle !== null) {
                updateConversationTitle(state.currentId, newTitle);
            }
        });

        // Suggested Prompt Cards
        elements.suggestionsGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.suggestion-card');
            if (card) {
                const promptText = card.getAttribute('data-prompt');
                if (promptText) {
                    elements.messageInput.value = promptText;
                    autoResizeInput();
                    sendMessage(promptText);
                }
            }
        });

        // Input & Form Handling
        elements.messageInput.addEventListener('input', () => {
            autoResizeInput();
            updateCharCounter();
        });

        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        elements.sendBtn.addEventListener('click', () => sendMessage());

        // Voice Input (Microphone)
        elements.micBtn.addEventListener('click', toggleVoiceRecording);

        // TTS Toggle
        elements.ttsToggleBtn.addEventListener('click', toggleTTS);

        // Export Dropdown
        elements.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.exportDropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            elements.exportDropdown.classList.remove('show');
        });

        elements.exportMd.addEventListener('click', () => exportConversation('md'));
        elements.exportTxt.addEventListener('click', () => exportConversation('txt'));
        elements.exportJson.addEventListener('click', () => exportConversation('json'));

        // Notification Close
        elements.notificationClose.addEventListener('click', () => {
            elements.notificationBanner.style.display = 'none';
        });

        // Scroll listener for "Scroll to Bottom" button
        elements.chatScrollArea.addEventListener('scroll', () => {
            const distFromBottom = elements.chatScrollArea.scrollHeight - elements.chatScrollArea.scrollTop - elements.chatScrollArea.clientHeight;
            if (distFromBottom > 200) {
                elements.scrollBottomBtn.style.display = 'flex';
            } else {
                elements.scrollBottomBtn.style.display = 'none';
            }
        });

        elements.scrollBottomBtn.addEventListener('click', () => scrollToBottom(true));
    }

    // Initialize when DOM content is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
