document.addEventListener('DOMContentLoaded', () => {
    initParticles();

    // Supabase Initialization
    const supabaseUrl = 'https://dehtwcvtmfussylekpoo.supabase.co';
    const supabaseKey = 'sb_publishable_YJ_zhLqbnAwVo37tzc8Miw_DVvmIUjK';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    let currentUser = null;

    const btnBeginJourney = document.getElementById('btn-begin-journey');
    const landingView = document.getElementById('landing-view');

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatView = document.getElementById('chat-view');
    const chatHistory = document.getElementById('chat-history');

    // Sidebar Elements
    const sidebar = document.getElementById('history-sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const historyList = document.getElementById('history-list');

    // Modal Elements
    const verseModal = document.getElementById('verse-modal');
    const openModalBtns = document.querySelectorAll('.open-daily-verse-btn');
    const closeModalBtn = document.getElementById('close-modal');

    // Auth Elements
    const authModal = document.getElementById('auth-modal');
    const closeAuthModal = document.getElementById('close-auth-modal');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    const btnGoogleAuth = document.getElementById('btn-google-auth');
    const btnLogout = document.getElementById('btn-logout');

    const nameModal = document.getElementById('name-modal');
    const nameForm = document.getElementById('name-form');
    const userFirstName = document.getElementById('user-first-name');

    // Upgrade Elements
    const upgradeModal = document.getElementById('upgrade-modal');
    const closeUpgradeModal = document.getElementById('close-upgrade-modal');
    const btnUpgradePro = document.getElementById('btn-upgrade-pro');
    const usageCounter = document.getElementById('usage-counter');
    const usageText = document.getElementById('usage-text');
    let userUsage = { tier: 'free', questions_today: 0, limit: 5 };

    // Share Elements
    const shareModal = document.getElementById('share-modal');
    const closeShareModal = document.getElementById('close-share-modal');
    const sharePreviewContainer = document.getElementById('share-preview-container');
    const btnNativeShare = document.getElementById('btn-native-share');
    const btnDownloadImage = document.getElementById('btn-download-image');
    let currentShareImage = null;

    // Onboarding Elements
    const onboardingModal = document.getElementById('onboarding-modal');
    const btnSkipOnboarding = document.getElementById('btn-skip-onboarding');
    const onboardingGreeting = document.getElementById('onboarding-greeting');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');

    // Dashboard Elements
    const dashboardModal = document.getElementById('dashboard-modal');
    const openDashboardBtn = document.getElementById('open-dashboard-btn');
    const closeDashboardBtn = document.getElementById('close-dashboard-modal');
    const dashboardName = document.getElementById('dashboard-name');
    const dashboardEmail = document.getElementById('dashboard-email');
    const dashboardTier = document.getElementById('dashboard-tier');
    const dashboardUsage = document.getElementById('dashboard-usage');
    const profileForm = document.getElementById('profile-form');
    const profileSuccessMsg = document.getElementById('profile-success-msg');
    const btnDashboardUpgrade = document.getElementById('btn-dashboard-upgrade');
    const btnDashboardLogout = document.getElementById('btn-dashboard-logout');

    // Bookmark Elements
    const bookmarksModal = document.getElementById('bookmarks-modal');
    const openBookmarksBtn = document.getElementById('open-bookmarks-btn');
    const closeBookmarksBtn = document.getElementById('close-bookmarks-modal');
    const bookmarksContainer = document.getElementById('bookmarks-container');
    let userBookmarks = []; // Cache to prevent over-fetching

    let authMode = 'login'; // 'login' or 'signup'

    // Session Management
    let sessionId = localStorage.getItem('ask_krishna_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ask_krishna_session_id', sessionId);
    }

    // Daily Verse Populate
    populateDailyVerse();

    // Handle Sidebar Toggles
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            fetchSessions(); // Refresh sessions when opening
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Handle Modal Toggles & Upgrade
    if (closeUpgradeModal) {
        closeUpgradeModal.addEventListener('click', () => {
            upgradeModal.classList.remove('active');
        });
    }

    if (btnUpgradePro) {
        btnUpgradePro.addEventListener('click', () => {
            btnUpgradePro.querySelector('.btn-text').textContent = "Opening secure gateway...";
            setTimeout(() => {
                alert("This would open Razerpay/Stripe checkout in production.");
                btnUpgradePro.querySelector('.btn-text').textContent = "Unlock Infinite Wisdom — ₹499/mo";
                upgradeModal.classList.remove('active');
            }, 1000);
        });
    }

    if (closeShareModal) {
        closeShareModal.addEventListener('click', () => {
            shareModal.classList.remove('active');
            sharePreviewContainer.innerHTML = '';
            currentShareImage = null;
        });
    }

    if (btnDownloadImage) {
        btnDownloadImage.addEventListener('click', () => {
            if (!currentShareImage) return;
            const a = document.createElement('a');
            a.href = currentShareImage;
            a.download = `Ask_Krishna_Wisdom_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    if (btnNativeShare) {
        btnNativeShare.addEventListener('click', async () => {
            if (!currentShareImage) return;
            try {
                // Convert base64 to blob
                const res = await fetch(currentShareImage);
                const blob = await res.blob();
                const file = new File([blob], 'wisdom.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'A verse from Shri Krishna',
                        text: 'Received guidance from GeetaBot.com',
                        files: [file]
                    });
                } else {
                    alert('Native sharing is not supported on this browser. Please use the Download button.');
                }
            } catch (err) {
                console.error("Error sharing", err);
            }
        });
    }

    if (btnSkipOnboarding) {
        btnSkipOnboarding.addEventListener('click', () => {
            onboardingModal.classList.remove('active');
            chatInput.focus();
        });
    }

    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            onboardingModal.classList.remove('active');
            chatInput.value = chip.textContent;
            chatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Dashboard Listeners
    if (openDashboardBtn) {
        openDashboardBtn.addEventListener('click', () => {
            if (currentUser) {
                const firstName = currentUser.user_metadata?.first_name || '';
                dashboardName.value = firstName;
                dashboardEmail.value = currentUser.email;

                if (userUsage) {
                    dashboardTier.textContent = userUsage.tier === 'pro' ? 'Pro Tier' : 'Free Tier';
                    if (userUsage.tier === 'pro') {
                        dashboardUsage.textContent = 'Unlimited Guidance';
                        btnDashboardUpgrade.style.display = 'none';
                    } else {
                        dashboardUsage.textContent = `${userUsage.questions_today} of ${userUsage.limit} Questions Asked`;
                        btnDashboardUpgrade.style.display = 'block';
                    }
                }
            }
            dashboardModal.classList.add('active');
        });
    }

    if (closeDashboardBtn) {
        closeDashboardBtn.addEventListener('click', () => {
            dashboardModal.classList.remove('active');
            profileSuccessMsg.style.display = 'none';
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = dashboardName.value.trim();
            if (!newName) return;

            const { data, error } = await supabase.auth.updateUser({
                data: { first_name: newName }
            });

            if (!error) {
                profileSuccessMsg.style.display = 'block';
                setTimeout(() => {
                    profileSuccessMsg.style.display = 'none';
                }, 3000);
            }
        });
    }

    if (btnDashboardUpgrade) {
        btnDashboardUpgrade.addEventListener('click', () => {
            dashboardModal.classList.remove('active');
            upgradeModal.classList.add('active');
        });
    }

    if (btnDashboardLogout) {
        btnDashboardLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    }

    // Bookmark Listeners
    if (openBookmarksBtn) {
        openBookmarksBtn.addEventListener('click', () => {
            bookmarksModal.classList.add('active');
            loadBookmarks();
        });
    }

    if (closeBookmarksBtn) {
        closeBookmarksBtn.addEventListener('click', () => {
            bookmarksModal.classList.remove('active');
        });
    }

    // Modal Listeners
    if (btnBeginJourney) {
        btnBeginJourney.addEventListener('click', () => {
            authModal.classList.add('active');
        });
    }

    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', () => {
            authModal.classList.remove('active');
        });
    }

    tabLogin.addEventListener('click', () => {
        authMode = 'login';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        btnAuthSubmit.querySelector('.btn-text').textContent = 'Log In';
        authError.classList.add('hidden');
    });

    tabSignup.addEventListener('click', () => {
        authMode = 'signup';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        btnAuthSubmit.querySelector('.btn-text').textContent = 'Sign Up';
        authError.classList.add('hidden');
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.classList.add('hidden');
        btnAuthSubmit.disabled = true;
        btnAuthSubmit.style.opacity = '0.5';

        const email = authEmail.value;
        const password = authPassword.value;

        try {
            if (authMode === 'signup') {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        } finally {
            btnAuthSubmit.disabled = false;
            btnAuthSubmit.style.opacity = '1';
        }
    });

    btnGoogleAuth.addEventListener('click', async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) console.error("Google auth error", error);
    });

    nameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = userFirstName.value.trim();
        if (!firstName) return;

        const { data, error } = await supabase.auth.updateUser({
            data: { first_name: firstName }
        });

        if (!error) {
            nameModal.classList.remove('active');
            showChatView();
        }
    });

    // Supabase Auth State Change Listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            authModal.classList.remove('active');

            // Check if user has a first name
            if (!currentUser.user_metadata || !currentUser.user_metadata.first_name) {
                nameModal.classList.add('active');
            } else {
                nameModal.classList.remove('active');
                showChatView();
            }
        } else {
            currentUser = null;
            landingView.classList.remove('hidden');
            landingView.classList.add('active');
            chatView.classList.remove('active');
            chatView.classList.add('hidden');
            onboardingModal.classList.remove('active');
        }
    });

    function showChatView() {
        if (landingView.classList.contains('active')) {
            landingView.classList.remove('active');
            landingView.classList.add('hidden');
            setTimeout(() => {
                chatView.classList.remove('hidden');
                chatView.classList.add('active');
                loadHistory();
                fetchUsage();
            }, 500);
        } else if (chatView.classList.contains('hidden')) {
            chatView.classList.remove('hidden');
            chatView.classList.add('active');
            loadHistory();
            fetchUsage();
        }
    }

    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(ta => {
        ta.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.scrollHeight > 150) {
                this.style.overflowY = 'auto';
            } else {
                this.style.overflowY = 'hidden';
            }
        });
        // Enter to submit
        ta.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.closest('form').dispatchEvent(new Event('submit'));
            }
        });
    });

    // Handle Modal Toggles
    if (openModalBtns.length > 0) {
        openModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                verseModal.classList.add('active');
            });
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            verseModal.classList.remove('active');
        });
    }

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === verseModal) {
            verseModal.classList.remove('active');
        }
    });

    // Handle Chat Submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';

        addUserMessage(message);
        fetchResponse(message);
    });

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message message-user';
        div.textContent = text;
        chatHistory.appendChild(div);
        scrollToBottom();
    }

    function addLoadingIndicator() {
        const div = document.createElement('div');
        div.className = 'loading-dots';
        div.id = 'loading-indicator';
        div.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        chatHistory.appendChild(div);
        scrollToBottom();
    }

    function removeLoadingIndicator() {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.remove();
    }

    async function fetchResponse(message) {
        const messageId = Date.now().toString();
        const contentContainer = addKrishnaStreamingResponseContainer(messageId);
        const textElement = contentContainer.querySelector('.krishna-text');

        chatInput.disabled = true;
        document.getElementById('btn-send').style.opacity = '0.5';

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session ? session.access_token : '';
            // Handle API stream response
            const res = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message, session_id: sessionId })
            });

            if (!res.ok) {
                if (res.status === 403) {
                    const errorData = await res.json();
                    if (errorData.detail === "FREE_LIMIT_REACHED") {
                        removeLoadingIndicator();
                        upgradeModal.classList.add('active');
                        // Optimistically update UI so it looks stuck at max
                        if (userUsage && usageCounter) {
                            userUsage.questions_today = userUsage.limit;
                            updateUsageUI();
                        }
                        return;
                    }
                }
                throw new Error("API stream failed");
            }

            removeLoadingIndicator();
            const { msgId, contentContainer } = addKrishnaStreamingResponseContainer();
            let accumulatedText = "";
            let versesData = null;

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') {
                            break;
                        }

                        try {
                            const dataObj = JSON.parse(dataStr);

                            // Check if this payload contains verses (sent at start)
                            if (Array.isArray(dataObj)) {
                                versesData = dataObj;
                                continue;
                            }

                            // Otherwise it's text delta
                            if (dataObj.content) {
                                accumulatedText += dataObj.content;
                                contentContainer.innerHTML = formatText(accumulatedText);
                                scrollToBottom();
                            }
                        } catch (e) {
                            // If it's unstructured text, append raw
                            accumulatedText += dataStr;
                            contentContainer.innerHTML = formatText(accumulatedText);
                            scrollToBottom();
                        }
                    }
                }
            }

            // Assuming successful message, optimistic update of usage counter
            if (userUsage.tier === 'free') {
                userUsage.questions_today += 1;
                updateUsageUI();
            }

            // Append verses after the stream is fully finished
            if (versesData && versesData.length > 0) {
                versesData.forEach(verse => {
                    if (verse.sanskrit || verse.english) {
                        const cardTemplate = document.getElementById('verse-card-template').content.cloneNode(true);
                        cardTemplate.querySelector('.ch').textContent = verse.chapter;
                        cardTemplate.querySelector('.vs').textContent = verse.verse;
                        if (verse.sanskrit) {
                            cardTemplate.querySelector('.verse-sanskrit').textContent = verse.sanskrit;
                        } else {
                            cardTemplate.querySelector('.verse-sanskrit').remove();
                        }
                        cardTemplate.querySelector('.verse-english').textContent = verse.english;

                        // Bind Share Button
                        const btnShare = cardTemplate.querySelector('.share-verse-btn');
                        btnShare.addEventListener('click', () => {
                            generateShareCard(verse);
                        });

                        // Bind Bookmark Button
                        const btnBookmark = cardTemplate.querySelector('.bookmark-verse-btn');
                        btnBookmark.addEventListener('click', (e) => {
                            toggleBookmark(verse, e.currentTarget);
                        });

                        contentContainer.appendChild(cardTemplate);
                    }
                });
                scrollToBottom();
            }

            // Append Feedback Widget
            appendFeedbackWidget(contentContainer);

        } catch (error) {
            console.error('Error fetching stream:', error);
            const contentContainer = chatHistory.querySelector('.message-krishna:last-child .krishna-content');
            if (contentContainer) {
                contentContainer.innerHTML = formatText("The connection to the divine has been momentarily disrupted. Please try speaking again.");
            } else {
                // Fallback if no container was created or found
                const div = document.createElement('div');
                div.className = 'message message-krishna';
                div.innerHTML = `<div class="krishna-avatar-wrapper"><div class="krishna-avatar"></div><div class="krishna-content">${formatText("The connection to the divine has been momentarily disrupted. Please try speaking again.")}</div></div>`;
                chatHistory.appendChild(div);
            }
        } finally {
            chatInput.disabled = false;
            document.getElementById('btn-send').style.opacity = '1';
            chatInput.focus();
        }
    }

    function addKrishnaStreamingResponseContainer(id = Date.now().toString()) {
        const div = document.createElement('div');
        div.className = 'message message-krishna';
        div.id = 'msg-' + id;

        let html = `
            <div class="krishna-avatar-wrapper">
                <div class="krishna-avatar">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="krishna-content">
                    <div class="krishna-text"></div>
                </div>
            </div>
        `;

        div.innerHTML = html;
        chatHistory.appendChild(div);
        scrollToBottom();
        return { msgId: id, contentContainer: div.querySelector('.krishna-content') };
    }

    function formatText(text) {
        return text.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
    }

    function scrollToBottom() {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }

    async function loadHistory() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session ? session.access_token : '';

            const res = await fetch(`/api/history/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {

                    // Clear history before appending, just in case
                    const msgs = chatHistory.querySelectorAll('.message');
                    msgs.forEach(m => m.remove());

                    data.messages.forEach(msg => {
                        if (msg.role === 'user') {
                            addUserMessage(msg.content);
                        } else {
                            try {
                                const { msgId, contentContainer } = addKrishnaStreamingResponseContainer(msg.date || Date.now());
                                contentContainer.querySelector('.krishna-text').textContent = msg.content;
                                if (msg.verses && msg.verses.length > 0) {
                                    msg.verses.forEach(verse => {
                                        if (verse.sanskrit || verse.english) {
                                            const cardTemplate = document.getElementById('verse-card-template').content.cloneNode(true);
                                            cardTemplate.querySelector('.ch').textContent = verse.chapter || "";
                                            cardTemplate.querySelector('.vs').textContent = verse.verse || "";
                                            if (verse.sanskrit) {
                                                cardTemplate.querySelector('.verse-sanskrit').textContent = verse.sanskrit;
                                            } else {
                                                const skNode = cardTemplate.querySelector('.verse-sanskrit');
                                                if (skNode) skNode.remove();
                                            }
                                            cardTemplate.querySelector('.verse-english').textContent = verse.english;

                                            // Bind Bookmark Button
                                            const btnBookmark = cardTemplate.querySelector('.bookmark-verse-btn');
                                            if (btnBookmark) {
                                                btnBookmark.addEventListener('click', (e) => {
                                                    toggleBookmark(verse, e.currentTarget);
                                                });
                                            }

                                            contentContainer.appendChild(cardTemplate);
                                        }
                                    });
                                }

                                if (msg.feedback) {
                                    appendFeedbackWidget(contentContainer, msg.feedback);
                                } else if (msg.role === 'krishna') {
                                    appendFeedbackWidget(contentContainer);
                                }

                            } catch (err) {
                                console.error("Error formatting history msg", err);
                            }
                        }
                    });

                    // Populate Sidebar with summary
                    const historyList = document.getElementById('history-list');
                    if (historyList) {
                        // We replaced the static sidebar render with fetchSessions
                        fetchSessions();
                    }

                    scrollToBottom();
                }
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }

    async function fetchSessions() {
        if (!historyList) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session ? session.access_token : '';
            if (!token) return;

            const res = await fetch('/api/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                const sessions = data.sessions || [];

                // If brand new user with no sessions, show onboarding
                if (sessions.length === 0 && currentUser) {
                    const firstName = currentUser.user_metadata?.first_name || "Seeker";
                    onboardingGreeting.textContent = `Welcome, ${firstName}.`;
                    onboardingModal.classList.add('active');
                }

                renderSessions(sessions);
            }
        } catch (e) {
            console.error('Error fetching sessions:', e);
        }
    }

    function renderSessions(sessions) {
        if (sessions.length === 0) {
            historyList.innerHTML = `<div class="empty-history">Your spiritual journey awaits...</div>`;
            return;
        }

        // Group sessions
        const now = new Date();
        const today = [];
        const thisWeek = [];
        const earlier = [];

        sessions.forEach(s => {
            const date = new Date(s.created_at);
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 1) {
                today.push(s);
            } else if (diffDays <= 7) {
                thisWeek.push(s);
            } else {
                earlier.push(s);
            }
        });

        historyList.innerHTML = `
            <div class="history-item" id="new-journey-btn">
                <span class="history-date" style="color: var(--accent-gold);">✦ Start New Journey</span>
                <div class="history-preview">Begin a new path and clear your current spiritual conversation.</div>
            </div>
        `;

        const renderGroup = (label, items) => {
            if (items.length === 0) return;
            const groupTitle = document.createElement('div');
            groupTitle.className = 'history-group-label';
            groupTitle.textContent = label;
            historyList.appendChild(groupTitle);

            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'history-item';
                if (item.id === sessionId) {
                    el.classList.add('active');
                }

                const dateHeader = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                el.innerHTML = `
                    <span class="history-date">${dateHeader}</span>
                    <div class="history-preview">${item.first_message}</div>
                `;

                el.addEventListener('click', () => {
                    sessionId = item.id;
                    localStorage.setItem('ask_krishna_session_id', sessionId);
                    sidebar.classList.remove('open');
                    loadHistory();
                });

                historyList.appendChild(el);
            });
        }

        renderGroup('Today', today);
        renderGroup('This Week', thisWeek);
        renderGroup('Earlier', earlier);

        document.getElementById('new-journey-btn').addEventListener('click', () => {
            sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            localStorage.setItem('ask_krishna_session_id', sessionId);

            // Clear chat UI immediately
            const msgs = chatHistory.querySelectorAll('.message');
            msgs.forEach(m => m.remove());

            sidebar.classList.remove('open');
            fetchSessions();
        });
    }

    async function fetchUsage() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session ? session.access_token : '';
            if (!token) return;

            const res = await fetch('/api/user/usage', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                userUsage = await res.json();
                updateUsageUI();
            }
        } catch (e) {
            console.error('Error fetching usage:', e);
        }
    }

    function updateUsageUI() {
        if (!usageCounter) return;

        if (userUsage.tier === 'pro') {
            usageCounter.classList.add('hidden');
        } else {
            usageCounter.classList.remove('hidden');
            usageText.textContent = `${userUsage.questions_today} / ${userUsage.limit}`;

            if (userUsage.questions_today >= userUsage.limit) {
                usageCounter.classList.add('limit-near');
            } else {
                usageCounter.classList.remove('limit-near');
            }
        }
    }

    async function generateShareCard(verse) {
        const offscreenContainer = document.getElementById('hidden-share-container');
        offscreenContainer.classList.remove('sr-only');

        // Populate the offscreen canvas DOM
        offscreenContainer.querySelector('.share-ch-vs').textContent = `${verse.chapter}.${verse.verse}`;
        offscreenContainer.querySelector('.share-sanskrit').textContent = verse.sanskrit || '';
        offscreenContainer.querySelector('.share-english').textContent = verse.english || '';

        try {
            const canvasEl = document.getElementById('share-card-canvas');
            const canvas = await html2canvas(canvasEl, {
                scale: 1, // 1080x1080 is already large
                useCORS: true,
                backgroundColor: null,
            });

            currentShareImage = canvas.toDataURL("image/png");

            // Re-hide offscreen DOM
            offscreenContainer.classList.add('sr-only');

            // Show Preview
            sharePreviewContainer.innerHTML = `<img src="${currentShareImage}" style="width: 100%; height: auto; display: block;" />`;
            shareModal.classList.add('active');

        } catch (e) {
            console.error("Failed to generate share card", e);
            offscreenContainer.classList.add('sr-only');
            alert("The divine connection fluttered. We could not capture the verse right now.");
        }
    }

    // -----------------------------------------
    // Bookmarks API
    // -----------------------------------------
    async function toggleBookmark(verse, btnElement) {
        const payload = {
            chapter: verse.chapter.toString(),
            verse: verse.verse.toString(),
            sanskrit: verse.sanskrit || "",
            english: verse.english || ""
        };

        try {
            // Optimistic UI toggle
            btnElement.classList.toggle('active');

            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) return;

            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                // Revert on failure
                btnElement.classList.toggle('active');
                console.error("Failed to toggle bookmark");
            } else {
                // Force a reload next time modal is opened
                userBookmarks = [];
            }
        } catch (e) {
            console.error("Bookmark toggle error", e);
            btnElement.classList.toggle('active');
        }
    }

    async function loadBookmarks() {
        if (!bookmarksContainer) return;

        // Show loading state if empty
        if (bookmarksContainer.innerHTML.trim() === '') {
            bookmarksContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">Fetching your sacred verses...</div>';
        }

        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) return;

            const res = await fetch('/api/bookmarks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                userBookmarks = data.bookmarks || [];
                renderBookmarksGallery(userBookmarks);
            }
        } catch (e) {
            console.error("Failed to load bookmarks", e);
            bookmarksContainer.innerHTML = '<div style="text-align: center; color: #c0392b; padding: 2rem;">Unable to load saved verses.</div>';
        }
    }

    function renderBookmarksGallery(bookmarks) {
        bookmarksContainer.innerHTML = '';
        if (bookmarks.length === 0) {
            bookmarksContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 3rem 1rem;">You have not saved any verses yet.<br>Seek guidance and tap the star icon to keep a verse close to your heart.</div>';
            return;
        }

        bookmarks.forEach(bm => {
            const item = document.createElement('div');
            item.className = 'bookmarked-item';

            // Format date loosely
            const savedDate = new Date(bm.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            item.innerHTML = `
                <div class="bookmarked-item-header">
                    <div>
                        <span class="bg">Bhagavad Gita</span>
                        <span class="ch-vs">${bm.chapter}.${bm.verse}</span>
                    </div>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${savedDate}</span>
                </div>
                ${bm.sanskrit ? `<p class="verse-sanskrit">${bm.sanskrit}</p>` : ''}
                <p class="verse-english">${bm.english}</p>
            `;
            bookmarksContainer.appendChild(item);
        });
    }

    // -----------------------------------------
    // Feedback API
    // -----------------------------------------
    function appendFeedbackWidget(container, existingFeedback = null) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'feedback-container';

        const upBtn = document.createElement('button');
        upBtn.className = 'icon-btn feedback-btn';
        upBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;

        const downBtn = document.createElement('button');
        downBtn.className = 'icon-btn feedback-btn';
        downBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>`;

        if (existingFeedback === 'helpful') upBtn.classList.add('active');
        if (existingFeedback === 'unhelpful') downBtn.classList.add('active');

        // Allow feedback only if it hasn't been set yet
        if (!existingFeedback) {
            upBtn.addEventListener('click', () => {
                submitFeedback('helpful', upBtn, downBtn);
            });
            downBtn.addEventListener('click', () => {
                submitFeedback('unhelpful', downBtn, upBtn);
            });
        } else {
            upBtn.disabled = true;
            downBtn.disabled = true;
        }

        feedbackDiv.appendChild(upBtn);
        feedbackDiv.appendChild(downBtn);
        container.appendChild(feedbackDiv);
    }

    async function submitFeedback(type, activeBtn, inactiveBtn) {
        if (!sessionId) return;

        // Visual change immediately
        activeBtn.classList.add('active');
        inactiveBtn.classList.remove('active');
        activeBtn.disabled = true;
        inactiveBtn.disabled = true;

        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            if (!token) return;

            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ session_id: sessionId, feedback: type })
            });

            if (!res.ok) {
                console.error("Failed to submit feedback");
                activeBtn.classList.remove('active');
                activeBtn.disabled = false;
                inactiveBtn.disabled = false;
            }
        } catch (e) {
            console.error("Feedback error", e);
            activeBtn.classList.remove('active');
            activeBtn.disabled = false;
            inactiveBtn.disabled = false;
        }
    }

    // Ambient Particles Engine
    function initParticles() {
        const canvas = document.getElementById('particles-canvas');
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = -Math.random() * 0.5 - 0.1; // Float upwards like incense
                this.opacity = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.speedX + Math.sin(Date.now() * 0.001 + this.y * 0.01) * 0.2;
                this.y += this.speedY;

                if (this.y < -10) {
                    this.y = height + 10;
                    this.x = Math.random() * width;
                }
            }
            draw() {
                ctx.fillStyle = `rgba(232, 160, 32, ${this.opacity})`; // Gold particles
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 60; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        animate();
    }

    // Daily Verse curation
    function populateDailyVerse() {
        const verses = [
            {
                s: "Karmanye vadhikaraste ma phaleshu kadachana",
                e: "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action.",
                r: "2.47"
            },
            {
                s: "Uddhared atmanatmanam natmanam avasadayet",
                e: "Let a man lift himself by his own Self alone; let him not lower himself, for this self alone is the friend of oneself.",
                r: "6.5"
            },
            {
                s: "Krodhad bhavati sammohah sammohat smriti-vibhramah",
                e: "From anger, complete delusion arises, and from delusion bewilderment of memory. When memory is bewildered, intelligence is lost.",
                r: "2.63"
            },
            {
                s: "Yada yada hi dharmasya glanir bhavati bharata",
                e: "Whenever and wherever there is a decline in religious practice, O descendant of Bharata, and a predominant rise of irreligion.",
                r: "4.7"
            }
        ];

        // Pick one based on the day of the year so it stays consistent for 24 hours
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        const verse = verses[dayOfYear % verses.length];

        const sElem = document.getElementById('daily-sanskrit');
        const eElem = document.getElementById('daily-english');
        const rElem = document.querySelector('.widget-ref');
        if (sElem) sElem.textContent = verse.s;
        if (eElem) eElem.textContent = verse.e;
        if (rElem) rElem.textContent = `(Bhagavad Gita ${verse.r})`;
    }
});
