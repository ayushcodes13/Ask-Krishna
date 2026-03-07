document.addEventListener('DOMContentLoaded', () => {
    initParticles();

    const landingForm = document.getElementById('landing-form');
    const landingInput = document.getElementById('landing-input');
    const landingView = document.getElementById('landing-view');

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatView = document.getElementById('chat-view');
    const chatHistory = document.getElementById('chat-history');

    // Modal Elements
    const verseModal = document.getElementById('verse-modal');
    const openModalBtns = document.querySelectorAll('.open-daily-verse-btn');
    const closeModalBtn = document.getElementById('close-modal');

    // Session Management
    let sessionId = localStorage.getItem('ask_krishna_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ask_krishna_session_id', sessionId);
    }

    // Daily Verse Populate
    populateDailyVerse();

    // Load History
    loadHistory();

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

    // Handle Landing Submission
    landingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = landingInput.value.trim();
        if (!message) return;

        // Transition to Chat View
        landingView.classList.remove('active');
        landingView.classList.add('hidden');

        setTimeout(() => {
            chatView.classList.remove('hidden');
            chatView.classList.add('active');

            // Add user message
            addUserMessage(message);
            // Fetch Krishna's response
            fetchResponse(message);
        }, 800);
    });

    // Handle Sidebar Toggles
    openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    closeSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
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
        // Create Krishna's empty message container first
        const messageId = Date.now().toString();
        const contentContainer = addKrishnaStreamingResponseContainer(messageId);
        const textElement = contentContainer.querySelector('.krishna-text');

        chatInput.disabled = true;
        document.getElementById('btn-send').style.opacity = '0.5';

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, session_id: sessionId })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let incompleteLine = '';

            let fullText = "";
            let versesData = null;
            let currentEvent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = (incompleteLine + chunk).split('\n');
                incompleteLine = lines.pop(); // keep the last partial line

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.substring(7).trim();
                    } else if (line.startsWith('data: ')) {
                        const data = line.substring(6);

                        if (currentEvent === 'verses') {
                            try {
                                versesData = JSON.parse(data);
                            } catch (e) {
                                console.error("Error parsing verses", e);
                            }
                        } else if (currentEvent === 'message') {
                            // We need to decode literal "\n" sequences sent by SSE as two characters back into real newlines
                            const decodedData = data.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                            fullText += decodedData;

                            textElement.textContent = fullText;
                            scrollToBottom();
                        } else if (currentEvent === 'done') {
                            break;
                        }
                    }
                }
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
                        contentContainer.appendChild(cardTemplate);
                    }
                });
                scrollToBottom();
            }

        } catch (error) {
            console.error('Error fetching stream:', error);
            textElement.innerHTML = formatText("The connection to the divine has been momentarily disrupted. Please try speaking again.");
        } finally {
            chatInput.disabled = false;
            document.getElementById('btn-send').style.opacity = '1';
            chatInput.focus();
        }
    }

    function addKrishnaStreamingResponseContainer(id) {
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
        return div.querySelector('.krishna-content');
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
            const res = await fetch(`/api/history/${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    // Hide landing, show chat
                    landingView.classList.remove('active');
                    landingView.classList.add('hidden');
                    chatView.classList.remove('hidden');
                    chatView.classList.add('active');

                    data.messages.forEach(msg => {
                        if (msg.role === 'user') {
                            addUserMessage(msg.content);
                        } else {
                            const contentContainer = addKrishnaStreamingResponseContainer(msg.date || Date.now());
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
                                        contentContainer.appendChild(cardTemplate);
                                    }
                                });
                            }
                        }
                    });

                    // Populate Sidebar with summary
                    const historyList = document.getElementById('history-list');
                    historyList.innerHTML = `
                        <div class="history-item" onclick="localStorage.removeItem('ask_krishna_session_id'); window.location.reload();">
                            <span class="history-date" style="color: var(--accent-gold);">✦ Start New Journey</span>
                            <div class="history-preview">Begin a new path and clear your current spiritual conversation.</div>
                        </div>
                        <div class="history-item" style="cursor: default; border-color: transparent;">
                            <span class="history-date">Current Journey</span>
                            <div class="history-preview">${data.messages.length} exchanges recorded.</div>
                        </div>
                    `;

                    scrollToBottom();
                }
            }
        } catch (e) {
            console.error("Failed to load history", e);
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

        document.getElementById('daily-sanskrit').textContent = verse.s;
        document.getElementById('daily-english').textContent = verse.e;
        document.querySelector('.widget-ref').textContent = `(Bhagavad Gita ${verse.r})`;
    }
});
