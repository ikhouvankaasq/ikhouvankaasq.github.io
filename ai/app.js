// Data Store
const store = {
    models: [],
    tests: [],
    results: [],
    reviews: [],
    users: [],
    currentUser: null
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initEventListeners();
    checkAuth();
    renderFeaturedModels();
    renderAllModels();
    renderAllTests();
    renderLeaderboards();
    updateStats();
});

// Load/Save Data
function loadData() {
    const savedData = localStorage.getItem('aiTestHubData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        Object.assign(store, parsed);
    } else {
        // Initialize with sample data
        initializeSampleData();
    }
}

function saveData() {
    localStorage.setItem('aiTestHubData', JSON.stringify(store));
}

function initializeSampleData() {
    store.models = [
        {
            id: 1,
            name: 'GPT-4',
            provider: 'OpenAI',
            category: 'llm',
            description: 'Most capable GPT model yet with advanced reasoning, creativity, and instruction-following abilities.',
            rating: 4.9,
            reviews: 234,
            testsTaken: 15420,
            icon: '🧠',
            createdAt: Date.now()
        },
        {
            id: 2,
            name: 'Claude 3.5',
            provider: 'Anthropic',
            category: 'llm',
            description: 'Advanced AI assistant excelling in reasoning, coding, and helpful interactions with enhanced safety.',
            rating: 4.8,
            reviews: 189,
            testsTaken: 12350,
            icon: '🎭',
            createdAt: Date.now()
        },
        {
            id: 3,
            name: 'Midjourney V6',
            provider: 'Midjourney',
            category: 'image',
            description: 'State-of-the-art image generation with incredible detail, coherence, and artistic style control.',
            rating: 4.7,
            reviews: 312,
            testsTaken: 8920,
            icon: '🎨',
            createdAt: Date.now()
        },
        {
            id: 4,
            name: 'Gemini Ultra',
            provider: 'Google',
            category: 'multimodal',
            description: 'Google\'s most capable multimodal model handling text, images, audio, and video seamlessly.',
            rating: 4.6,
            reviews: 156,
            testsTaken: 7650,
            icon: '⭐',
            createdAt: Date.now()
        },
        {
            id: 5,
            name: 'Claude 3 Opus',
            provider: 'Anthropic',
            category: 'llm',
            description: 'Most powerful Claude model for complex reasoning, coding, and nuanced analysis.',
            rating: 4.8,
            reviews: 201,
            testsTaken: 11200,
            icon: '💎',
            createdAt: Date.now()
        },
        {
            id: 6,
            name: 'CodeLlama 70B',
            provider: 'Meta',
            category: 'coding',
            description: 'Open-source large language model specialized for code generation and understanding.',
            rating: 4.5,
            reviews: 98,
            testsTaken: 5430,
            icon: '💻',
            createdAt: Date.now()
        },
        {
            id: 7,
            name: 'Stable Diffusion XL',
            provider: 'Stability AI',
            category: 'image',
            description: 'High-quality image generation with improved composition and photorealism.',
            rating: 4.4,
            reviews: 267,
            testsTaken: 9870,
            icon: '🖼️',
            createdAt: Date.now()
        },
        {
            id: 8,
            name: 'Whisper Large',
            provider: 'OpenAI',
            category: 'audio',
            description: 'State-of-the-art speech recognition with multilingual support and high accuracy.',
            rating: 4.7,
            reviews: 145,
            testsTaken: 4320,
            icon: '🎤',
            createdAt: Date.now()
        }
    ];

    store.tests = [
        {
            id: 1,
            title: 'General Knowledge Quiz',
            description: 'Test AI models on their general knowledge across various topics including science, history, and current events.',
            category: 'general',
            difficulty: 'intermediate',
            questions: [
                { text: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correct: 2 },
                { text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1 },
                { text: 'What is the largest mammal on Earth?', options: ['African Elephant', 'Blue Whale', 'Giraffe', 'Polar Bear'], correct: 1 }
            ],
            timesTaken: 892,
            createdAt: Date.now()
        },
        {
            id: 2,
            title: 'Code Debugging Challenge',
            description: 'Evaluate AI coding abilities by presenting buggy code and checking if the model can identify and fix issues.',
            category: 'coding',
            difficulty: 'advanced',
            questions: [
                { text: 'What is wrong with this Python code?\n\nfor i in range(10)\n    print(i)', options: ['Missing colon after range(10)', 'Wrong indentation', 'range() is deprecated', 'print() needs parentheses'], correct: 0 },
                { text: 'Which of these is a valid way to declare a variable in JavaScript?', options: ['var x = 5', 'let x = 5', 'const x = 5', 'All of the above'], correct: 3 }
            ],
            timesTaken: 456,
            createdAt: Date.now()
        },
        {
            id: 3,
            title: 'Creative Writing Assessment',
            description: 'Test AI creativity and language generation through various writing prompts and story completion tasks.',
            category: 'llm',
            difficulty: 'beginner',
            questions: [
                { text: 'Complete this story: "The old clock struck midnight and..."', options: ['Nothing happened', 'The door slowly opened', 'Everyone woke up', 'It was already morning'], correct: 1 },
                { text: 'Which opening line is most engaging?', options: ['It was a day.', 'The sun rose over the horizon, casting golden light across the sleeping town.', 'Day started.', 'Morning came.'], correct: 1 }
            ],
            timesTaken: 623,
            createdAt: Date.now()
        },
        {
            id: 4,
            title: 'Math Reasoning Test',
            description: 'Evaluate AI mathematical reasoning and problem-solving capabilities across different difficulty levels.',
            category: 'reasoning',
            difficulty: 'intermediate',
            questions: [
                { text: 'If x + 5 = 12, what is x?', options: ['7', '17', '5', '12'], correct: 0 },
                { text: 'What is 15% of 200?', options: ['25', '30', '35', '40'], correct: 1 }
            ],
            timesTaken: 789,
            createdAt: Date.now()
        },
        {
            id: 5,
            title: 'Image Analysis Quiz',
            description: 'Test AI understanding and description capabilities for various types of images and visual content.',
            category: 'image',
            difficulty: 'beginner',
            questions: [
                { text: 'What type of image would be best described as "a golden retriever playing fetch in a park"?', options: ['Portrait', 'Landscape', 'Action shot', 'Abstract'], correct: 2 },
                { text: 'Which description best fits a sunset over mountains?', options: ['Urban cityscape', 'Serene nature scene', 'Interior design', 'Food photography'], correct: 1 }
            ],
            timesTaken: 534,
            createdAt: Date.now()
        }
    ];

    store.results = [];
    store.reviews = [
        { id: 1, modelId: 1, userId: 'demo', userName: 'Demo User', rating: 5, text: 'Incredible reasoning capabilities!', date: Date.now() - 86400000 },
        { id: 2, modelId: 1, userId: 'demo', userName: 'Demo User', rating: 5, text: 'Best AI model for complex tasks.', date: Date.now() - 172800000 }
    ];

    store.users = [
        { id: 'demo', name: 'Demo User', email: 'demo@example.com', password: 'demo123', createdAt: Date.now() }
    ];

    saveData();
}

// Event Listeners
function initEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
        });
    });

    // Close modals on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`.nav-link[data-section="${sectionId}"]`)?.classList.add('active');

    // Close mobile menu
    document.getElementById('mobileNav').classList.remove('active');

    // Scroll to top
    window.scrollTo(0, 0);
}

function toggleMobileMenu() {
    document.getElementById('mobileNav').classList.toggle('active');
    const mobileAuth = document.getElementById('mobileAuth');
    if (store.currentUser) {
        mobileAuth.innerHTML = `
            <span>${store.currentUser.name}</span>
            <button class="btn-ghost" onclick="logout()">Logout</button>
        `;
    } else {
        mobileAuth.innerHTML = `
            <button class="btn-ghost" onclick="openModal('login'); toggleMobileMenu();">Login</button>
            <button class="btn-primary" onclick="openModal('signup'); toggleMobileMenu();">Sign Up</button>
        `;
    }
}

// Modal Functions
function openModal(modalName) {
    document.getElementById(`${modalName}Modal`).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalName) {
    document.getElementById(`${modalName}Modal`).classList.add('hidden');
    document.body.style.overflow = '';
}

function closeModalOnOverlay(e, modalName) {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(modalName);
    }
}

function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => openModal(to), 200);
}

// Authentication
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = store.users.find(u => u.email === email && u.password === password);
    if (user) {
        store.currentUser = { id: user.id, name: user.name, email: user.email };
        saveData();
        checkAuth();
        closeModal('login');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } else {
        alert('Invalid email or password');
    }
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    if (store.users.find(u => u.email === email)) {
        alert('Email already registered');
        return;
    }

    const newUser = {
        id: 'user_' + Date.now(),
        name,
        email,
        password,
        createdAt: Date.now()
    };

    store.users.push(newUser);
    store.currentUser = { id: newUser.id, name: newUser.name, email: newUser.email };
    saveData();
    checkAuth();
    closeModal('signup');
    document.getElementById('signupName').value = '';
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
}

function logout() {
    store.currentUser = null;
    saveData();
    checkAuth();
    toggleMobileMenu();
}

function checkAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userMenu = document.getElementById('userMenu');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (store.currentUser) {
        loginBtn.classList.add('hidden');
        signupBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userAvatar.textContent = store.currentUser.name.charAt(0).toUpperCase();
        userName.textContent = store.currentUser.name;
        document.getElementById('createTestBtn').classList.remove('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        signupBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
        document.getElementById('createTestBtn').classList.add('hidden');
    }
}

// Render Functions
function renderFeaturedModels() {
    const container = document.getElementById('featuredModels');
    const featured = store.models.slice(0, 3);
    container.innerHTML = featured.map(model => createModelCard(model)).join('');
}

function renderAllModels() {
    filterModels();
}

function createModelCard(model) {
    const stars = renderStars(model.rating);
    const categoryBadge = `<span class="badge badge-${model.category}">${model.category}</span>`;
    
    return `
        <div class="card" onclick="openModelDetail(${model.id})">
            <div class="card-header">
                <div class="card-icon">${model.icon}</div>
                <div>
                    <div class="card-title">${model.name}</div>
                    <div class="card-provider">${model.provider}</div>
                </div>
            </div>
            <div class="card-body">${model.description.substring(0, 100)}...</div>
            <div class="card-footer">
                <div class="rating">${stars}</div>
                <div class="card-stats">
                    <span class="card-stat">📝 ${model.reviews}</span>
                    <span class="card-stat">✓ ${model.testsTaken.toLocaleString()}</span>
                </div>
            </div>
            <div style="margin-top: 12px;">${categoryBadge}</div>
        </div>
    `;
}

function renderStars(rating, interactive = false, modelId = null) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= Math.floor(rating);
        const half = !filled && i === Math.ceil(rating) && rating % 1 >= 0.5;
        const starClass = filled ? 'star filled' : (half ? 'star half' : 'star');
        
        if (interactive && modelId) {
            html += `<span class="${starClass}" onclick="rateModel(${modelId}, ${i})">★</span>`;
        } else {
            html += `<span class="${starClass}">★</span>`;
        }
    }
    return html;
}

function filterModels() {
    const search = document.getElementById('modelSearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortFilter').value;

    let filtered = [...store.models];

    if (search) {
        filtered = filtered.filter(m => 
            m.name.toLowerCase().includes(search) || 
            m.provider.toLowerCase().includes(search)
        );
    }

    if (category) {
        filtered = filtered.filter(m => m.category === category);
    }

    if (sort === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'popular') {
        filtered.sort((a, b) => b.testsTaken - a.testsTaken);
    } else if (sort === 'newest') {
        filtered.sort((a, b) => b.createdAt - a.createdAt);
    }

    const container = document.getElementById('modelsGrid');
    const emptyState = document.getElementById('modelsEmpty');

    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        container.innerHTML = filtered.map(model => createModelCard(model)).join('');
    }
}

function renderAllTests() {
    const container = document.getElementById('testsGrid');
    const emptyState = document.getElementById('testsEmpty');

    if (store.tests.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        container.innerHTML = store.tests.map(test => createTestCard(test)).join('');
    }
}

function createTestCard(test) {
    const categoryBadge = `<span class="badge badge-${test.category}">${test.category}</span>`;
    const difficultyBadge = `<span class="badge badge-${test.difficulty}">${test.difficulty}</span>`;
    
    return `
        <div class="card test-card">
            <div class="card-header">
                <div class="card-icon">📝</div>
                <div>
                    <div class="card-title">${test.title}</div>
                </div>
            </div>
            <div class="card-body">${test.description}</div>
            <div class="test-meta">
                ${categoryBadge}
                ${difficultyBadge}
                <span class="test-time">⏱️ ${test.questions.length * 2} min</span>
            </div>
            <div class="card-footer">
                <div class="card-stats">
                    <span class="card-stat">👥 ${test.timesTaken} taken</span>
                    <span class="card-stat">❓ ${test.questions.length} questions</span>
                </div>
                <button class="btn-primary btn-sm" onclick="event.stopPropagation(); takeTest(${test.id})">Take Test</button>
            </div>
        </div>
    `;
}

// Model Detail
function openModelDetail(modelId) {
    const model = store.models.find(m => m.id === modelId);
    if (!model) return;

    const reviews = store.reviews.filter(r => r.modelId === modelId);
    const stars = renderStars(model.rating, true, modelId);

    const container = document.getElementById('modelDetailContent');
    container.innerHTML = `
        <button class="modal-close" onclick="closeModal('modelDetail')">×</button>
        <div class="model-detail-header">
            <div class="model-detail-icon">${model.icon}</div>
            <div class="model-detail-info">
                <h2>${model.name}</h2>
                <div class="model-detail-provider">${model.provider}</div>
                <div class="rating">${stars}</div>
            </div>
        </div>
        <div class="model-detail-body">${model.description}</div>
        <div class="model-detail-stats">
            <div>
                <div class="lb-stat-value">${model.rating}</div>
                <div class="lb-stat-label">Rating</div>
            </div>
            <div>
                <div class="lb-stat-value">${model.reviews}</div>
                <div class="lb-stat-label">Reviews</div>
            </div>
            <div>
                <div class="lb-stat-value">${model.testsTaken.toLocaleString()}</div>
                <div class="lb-stat-label">Tests Taken</div>
            </div>
        </div>
        
        <div class="reviews-section">
            <h3>Reviews</h3>
            ${store.currentUser ? `
                <div class="review-form">
                    <div class="rating" id="newReviewRating">
                        ${[1,2,3,4,5].map(i => `<span class="star" onclick="setRating(${i})">★</span>`).join('')}
                    </div>
                    <textarea id="reviewText" placeholder="Write your review..."></textarea>
                    <button class="btn-primary btn-sm" onclick="submitReview(${model.id})">Submit Review</button>
                </div>
            ` : '<p style="color: var(--text-muted); margin-bottom: 16px;">Login to write a review</p>'}
            
            <div id="reviewsList">
                ${reviews.length === 0 ? '<p style="color: var(--text-muted);">No reviews yet</p>' : 
                reviews.map(r => `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="review-author">${r.userName}</span>
                            <div class="rating">${renderStars(r.rating)}</div>
                        </div>
                        <div class="review-text">${r.text}</div>
                        <div class="review-date">${new Date(r.date).toLocaleDateString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    openModal('modelDetail');
}

let selectedRating = 0;

function setRating(rating) {
    selectedRating = rating;
    const stars = document.querySelectorAll('#newReviewRating .star');
    stars.forEach((star, i) => {
        star.classList.toggle('filled', i < rating);
    });
}

function rateModel(modelId, rating) {
    if (!store.currentUser) {
        alert('Please login to rate');
        return;
    }
    setRating(rating);
}

function submitReview(modelId) {
    if (!store.currentUser) return;
    
    const text = document.getElementById('reviewText').value.trim();
    if (!text || selectedRating === 0) {
        alert('Please provide a rating and review text');
        return;
    }

    const review = {
        id: Date.now(),
        modelId,
        userId: store.currentUser.id,
        userName: store.currentUser.name,
        rating: selectedRating,
        text,
        date: Date.now()
    };

    store.reviews.push(review);
    
    // Update model rating
    const model = store.models.find(m => m.id === modelId);
    if (model) {
        const modelReviews = store.reviews.filter(r => r.modelId === modelId);
        model.rating = modelReviews.reduce((sum, r) => sum + r.rating, 0) / modelReviews.length;
        model.reviews = modelReviews.length;
    }

    saveData();
    openModelDetail(modelId);
}

// Take Test
let currentTest = null;
let currentAnswers = [];

function takeTest(testId) {
    currentTest = store.tests.find(t => t.id === testId);
    if (!currentTest) return;

    currentAnswers = new Array(currentTest.questions.length).fill(-1);
    renderTestIntro();
    openModal('test');
}

function renderTestIntro() {
    const container = document.getElementById('testContainer');
    container.innerHTML = `
        <div class="test-intro">
            <h2>${currentTest.title}</h2>
            <p>${currentTest.description}</p>
            <div class="test-meta-display">
                <span class="badge badge-${currentTest.category}">${currentTest.category}</span>
                <span class="badge badge-${currentTest.difficulty}">${currentTest.difficulty}</span>
                <span>${currentTest.questions.length} questions</span>
            </div>
            <button class="btn-primary" onclick="renderTestQuestion(0)">Start Test</button>
        </div>
    `;
}

function renderTestQuestion(index) {
    const container = document.getElementById('testContainer');
    const question = currentTest.questions[index];
    
    container.innerHTML = `
        <div class="test-question">
            <div class="question-number">Question ${index + 1} of ${currentTest.questions.length}</div>
            <div class="question-text">${question.text}</div>
            <div class="options-list">
                ${question.options.map((opt, i) => `
                    <label class="option-label ${currentAnswers[index] === i ? 'selected' : ''}" onclick="selectAnswer(${index}, ${i})">
                        <span class="option-radio"></span>
                        <span>${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
        <div class="test-navigation">
            <button class="btn-ghost" ${index === 0 ? 'disabled style="visibility:hidden"' : ''} onclick="renderTestQuestion(${index - 1})">Previous</button>
            <button class="btn-primary" onclick="${index === currentTest.questions.length - 1 ? 'submitTest()' : `renderTestQuestion(${index + 1})`}">
                ${index === currentTest.questions.length - 1 ? 'Submit' : 'Next'}
            </button>
        </div>
    `;
}

function selectAnswer(questionIndex, answerIndex) {
    currentAnswers[questionIndex] = answerIndex;
    renderTestQuestion(questionIndex);
}

function submitTest() {
    let correct = 0;
    currentTest.questions.forEach((q, i) => {
        if (currentAnswers[i] === q.correct) correct++;
    });

    const score = Math.round((correct / currentTest.questions.length) * 100);
    
    // Save result
    if (store.currentUser) {
        store.results.push({
            id: Date.now(),
            testId: currentTest.id,
            testTitle: currentTest.title,
            userId: store.currentUser.id,
            userName: store.currentUser.name,
            score,
            date: Date.now()
        });
        saveData();
    }

    // Update test timesTaken
    currentTest.timesTaken++;
    saveData();

    showResult(score, correct, currentTest.questions.length);
}

function showResult(score, correct, total) {
    closeModal('test');
    
    const container = document.getElementById('resultContainer');
    container.innerHTML = `
        <div class="result-container">
            <div class="result-score">${score}%</div>
            <div class="result-label">${score >= 70 ? 'Great job!' : 'Keep practicing!'}</div>
            <div class="result-details">
                <div class="result-detail-item">
                    <span class="result-detail-label">Correct Answers</span>
                    <span>${correct} / ${total}</span>
                </div>
                <div class="result-detail-item">
                    <span class="result-detail-label">Test</span>
                    <span>${currentTest.title}</span>
                </div>
                ${store.currentUser ? `
                    <div class="result-detail-item">
                        <span class="result-detail-label">Taken By</span>
                        <span>${store.currentUser.name}</span>
                    </div>
                ` : ''}
            </div>
            <button class="btn-primary" onclick="closeModal('result')">Done</button>
        </div>
    `;
    
    openModal('result');
    updateStats();
}

// Create Test
let questionCount = 0;

function handleCreateTest(e) {
    e.preventDefault();
    
    if (!store.currentUser) {
        alert('Please login to create a test');
        return;
    }

    const title = document.getElementById('testTitle').value;
    const description = document.getElementById('testDescription').value;
    const category = document.getElementById('testCategory').value;
    const difficulty = document.getElementById('testDifficulty').value;

    const questions = [];
    const questionInputs = document.querySelectorAll('.question-builder-item');
    
    for (const qItem of questionInputs) {
        const qText = qItem.querySelector('.question-text-input').value;
        const options = qItem.querySelectorAll('.builder-option input[type="text"]');
        const correctOption = qItem.querySelector('input[name="correctAnswer"]:checked');
        
        if (!qText || Array.from(options).some(o => !o.value) || !correctOption) {
            alert('Please complete all question fields');
            return;
        }

        questions.push({
            text: qText,
            options: Array.from(options).map(o => o.value),
            correct: parseInt(correctOption.value)
        });
    }

    if (questions.length === 0) {
        alert('Please add at least one question');
        return;
    }

    const newTest = {
        id: Date.now(),
        title,
        description,
        category,
        difficulty,
        questions,
        timesTaken: 0,
        createdAt: Date.now()
    };

    store.tests.push(newTest);
    saveData();
    closeModal('createTest');
    renderAllTests();
    updateStats();
    
    // Reset form
    document.getElementById('testTitle').value = '';
    document.getElementById('testDescription').value = '';
    document.getElementById('questionsList').innerHTML = '';
    questionCount = 0;
}

function addQuestion() {
    questionCount++;
    const container = document.getElementById('questionsList');
    const qDiv = document.createElement('div');
    qDiv.className = 'question-builder-item';
    qDiv.innerHTML = `
        <div class="question-builder-header">
            <span>Question ${questionCount}</span>
        </div>
        <input type="text" class="question-text-input" placeholder="Enter question...">
        <div class="builder-options">
            ${[0,1,2,3].map(i => `
                <div class="builder-option">
                    <input type="radio" name="correctAnswer_${questionCount}" value="${i}" ${i === 0 ? 'checked' : ''}>
                    <input type="text" placeholder="Option ${i + 1}">
                </div>
            `).join('')}
        </div>
    `;
    container.appendChild(qDiv);
}

// Leaderboard
function renderLeaderboards() {
    renderTopModels();
    renderTopTesters();
    renderHighScores();
}

function switchLeaderboardTab(tab) {
    document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`leaderboard${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
}

function renderTopModels() {
    const sorted = [...store.models].sort((a, b) => b.rating - a.rating).slice(0, 10);
    const container = document.getElementById('leaderboardModels');
    
    container.innerHTML = sorted.map((model, i) => {
        const rankClass = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : ''));
        const topClass = i < 3 ? 'top-3' : '';
        
        return `
            <div class="leaderboard-item ${topClass}" onclick="openModelDetail(${model.id})">
                <div class="rank ${rankClass}">#${i + 1}</div>
                <div class="lb-info">
                    <div class="lb-avatar">${model.icon}</div>
                    <div>
                        <div class="lb-name">${model.name}</div>
                        <div class="lb-category">${model.provider}</div>
                    </div>
                </div>
                <div class="lb-stats">
                    <div>
                        <div class="lb-stat-value">${model.rating}</div>
                        <div class="lb-stat-label">Rating</div>
                    </div>
                    <div>
                        <div class="lb-stat-value">${model.reviews}</div>
                        <div class="lb-stat-label">Reviews</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTopTesters() {
    const userStats = {};
    store.results.forEach(r => {
        if (!userStats[r.userId]) {
            userStats[r.userId] = { name: r.userName, tests: 0, avgScore: 0, scores: [] };
        }
        userStats[r.userId].tests++;
        userStats[r.userId].scores.push(r.score);
    });

    const sorted = Object.entries(userStats)
        .map(([id, data]) => ({
            id,
            name: data.name,
            tests: data.tests,
            avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        }))
        .sort((a, b) => b.tests - a.tests)
        .slice(0, 10);

    const container = document.getElementById('leaderboardUsers');
    
    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No testers yet</p></div>';
        return;
    }

    container.innerHTML = sorted.map((user, i) => {
        const rankClass = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : ''));
        const topClass = i < 3 ? 'top-3' : '';
        
        return `
            <div class="leaderboard-item ${topClass}">
                <div class="rank ${rankClass}">#${i + 1}</div>
                <div class="lb-info">
                    <div class="lb-avatar">${user.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="lb-name">${user.name}</div>
                        <div class="lb-category">AI Tester</div>
                    </div>
                </div>
                <div class="lb-stats">
                    <div>
                        <div class="lb-stat-value">${user.tests}</div>
                        <div class="lb-stat-label">Tests Taken</div>
                    </div>
                    <div>
                        <div class="lb-stat-value">${user.avgScore}%</div>
                        <div class="lb-stat-label">Avg Score</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderHighScores() {
    const sorted = [...store.results]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    const container = document.getElementById('leaderboardScores');
    
    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No scores yet</p></div>';
        return;
    }

    container.innerHTML = sorted.map((result, i) => {
        const rankClass = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : ''));
        const topClass = i < 3 ? 'top-3' : '';
        
        return `
            <div class="leaderboard-item ${topClass}">
                <div class="rank ${rankClass}">#${i + 1}</div>
                <div class="lb-info">
                    <div class="lb-avatar">${result.userName.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="lb-name">${result.userName}</div>
                        <div class="lb-category">${result.testTitle}</div>
                    </div>
                </div>
                <div class="lb-stats">
                    <div>
                        <div class="lb-stat-value">${result.score}%</div>
                        <div class="lb-stat-label">Score</div>
                    </div>
                    <div>
                        <div class="lb-stat-value">${new Date(result.date).toLocaleDateString()}</div>
                        <div class="lb-stat-label">Date</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Stats
function updateStats() {
    document.getElementById('totalModels').textContent = store.models.length;
    document.getElementById('totalTests').textContent = store.tests.length;
    document.getElementById('totalResults').textContent = store.results.length;
}
