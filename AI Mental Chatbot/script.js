// ========================================
// WELLNESS CHATBOT LOGIC (FIXED)
// ========================================

// ⚠️ REPLACE THIS WITH A NEW KEY. The one you posted is compromised.
const GEMINI_API_KEY = 'AIzaSyBJ286fF-evVSFdhXdsjgxOCc_Gp2E3e6I';

// Using v1beta endpoint with gemini-2.5-pro (using header for API key, not query param)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

const FALLBACK_RESPONSES = {
    en: {
        anxious: "I hear that you're feeling anxious. Let's try 4-7-8 breathing: Inhale for 4 seconds, hold for 7, and exhale slowly for 8. Shall we try that together?",
        sleep: "Racing thoughts can make sleep hard. Try doing a 'brain dump'—write down everything worrying you on paper to get it out of your head. Would you like a relaxation technique?",
        burnout: "It sounds like you are running on empty. Remember that rest is not a reward; it's a requirement. Can you take 5 minutes right now to just step away from your work?",
        crisis: "I am very concerned about your safety. Please call 999 (Malaysia Emergency) or the Befrienders KL at 03-7627 2929 immediately. I am an AI and cannot provide medical help.",
        default: "I'm here to listen. It seems I'm having trouble connecting to my brain, but I'm still here with you. Can you tell me more about what's going on?"
    },
    ms: {
        anxious: "Saya faham awak berasa cemas. Mari kita cuba teknik pernafasan 4-7-8: Tarik nafas selama 4 saat, tahan selama 7 saat, dan hembus perlahan-lahan selama 8 saat. Nak kita cuba bersama?",
        sleep: "Fikiran yang bercelaru boleh membuatkan tidur sukar. Cuba lakukan 'brain dump'—tulis semua yang membimbangkan awak di atas kertas untuk keluarkannya dari fikiran. Awak nak tahu teknik relaksasi?",
        burnout: "Bunyi macam awak sudah kehabisan tenaga. Ingat, rehat bukanlah ganjaran; ia adalah keperluan. Boleh tak awak ambil 5 minit sekarang untuk berhenti seketika dari kerja?",
        crisis: "Saya sangat bimbang tentang keselamatan awak. Sila hubungi 999 (Kecemasan Malaysia) atau Befrienders KL di 03-7627 2929 dengan segera. Saya adalah AI dan tidak boleh memberikan bantuan perubatan.",
        default: "Saya di sini untuk mendengar. Nampaknya saya ada masalah untuk berhubung, tapi saya masih di sini bersama awak. Boleh awak ceritakan lebih lanjut tentang apa yang berlaku?"
    }
};

function getFallbackResponse(key) {
    const lang = currentLanguage === 'ms' ? 'ms' : 'en';
    return FALLBACK_RESPONSES[lang][key] || FALLBACK_RESPONSES[lang].default;
}

// Contextual quick action suggestions based on conversation topics
const QUICK_ACTION_POOL = {
    general: [
        "How are you feeling today?",
        "I need help managing stress",
        "Can you teach me a breathing exercise?",
        "I want to practice mindfulness",
        "How can I improve my sleep?",
        "I'm feeling overwhelmed",
        "What are some self-care tips?",
        "I need help with anxiety"
    ],
    anxious: [
        "I'm feeling very anxious right now",
        "Can you guide me through a breathing exercise?",
        "What are some grounding techniques?",
        "How do I calm a panic attack?",
        "I need help with social anxiety",
        "What can I do when I feel overwhelmed?",
        "How do I stop overthinking?",
        "I feel anxious about the future"
    ],
    sleep: [
        "I'm having trouble sleeping",
        "How can I fall asleep faster?",
        "I wake up feeling tired",
        "What's a good bedtime routine?",
        "I have racing thoughts at night",
        "How do I improve my sleep quality?",
        "I feel restless before bed",
        "Can you help me with insomnia?"
    ],
    burnout: [
        "I feel completely burnt out",
        "I'm exhausted and unmotivated",
        "How do I recover from burnout?",
        "I can't find work-life balance",
        "I feel like I'm running on empty",
        "How do I set better boundaries?",
        "I'm losing interest in everything",
        "I need help managing my workload"
    ],
    stress: [
        "I'm under a lot of stress",
        "How do I manage work stress?",
        "I feel stressed about deadlines",
        "What are some stress relief techniques?",
        "I'm stressed about my relationships",
        "How do I handle exam stress?",
        "I feel constant pressure",
        "What helps with chronic stress?"
    ],
    sadness: [
        "I've been feeling really down",
        "I'm struggling with sadness",
        "How do I cope with feeling low?",
        "I don't feel like myself lately",
        "I'm having trouble finding joy",
        "What helps with persistent sadness?",
        "I feel empty inside",
        "How do I lift my mood?"
    ],
    relationships: [
        "I'm having relationship problems",
        "I feel lonely",
        "How do I communicate better?",
        "I'm struggling with conflict",
        "I need help setting boundaries",
        "I feel disconnected from others",
        "How do I build better relationships?",
        "I'm having family issues"
    ],
    self_esteem: [
        "I struggle with self-confidence",
        "I'm very hard on myself",
        "How do I build self-esteem?",
        "I don't feel good enough",
        "I compare myself to others",
        "How do I practice self-compassion?",
        "I'm my own worst critic",
        "I need help with body image"
    ]
};

// Store conversation context
let conversationContext = {
    topics: [],
    lastUserMessage: '',
    lastBotResponse: ''
};

// Store full conversation history for context
let conversationHistory = [];

// Store detected language for current conversation
let currentLanguage = 'en'; // Default to English

async function sendMessage() {
    const input = document.getElementById('userInput');
    const sendBtn = document.querySelector('.send-btn');
    const text = input.value.trim();
    
    if (text === '') return;
    
    // Update conversation context
    conversationContext.lastUserMessage = text;
    updateConversationTopics(text);
    
    // Add user message to conversation history
    conversationHistory.push({
        role: 'user',
        text: text
    });
    
    // UI State: Loading
    input.disabled = true;
    sendBtn.disabled = true;
    input.value = '';
    addMessage(text, 'user');
    
    // Show animated typing indicator
    const typingId = showTypingIndicator();
    
    try {
        const response = await generateBotResponse(text, conversationHistory);
        // Remove typing indicator before adding response
        removeTypingIndicator(typingId);
        // Add message with typing animation
        addMessageWithTyping(response, 'bot');
        
        // Add bot response to conversation history
        conversationHistory.push({
            role: 'model',
            text: response
        });
        
        // Update conversation context with bot response
        conversationContext.lastBotResponse = response;
        
        // Update quick action buttons based on context
        updateQuickActions();
    } catch (error) {
        console.error('=== CHATBOT ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', error);
        console.error('====================');
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Detect language for fallback response
        const detectedLang = detectLanguage(text);
        currentLanguage = detectedLang;
        
        // Intelligent Fallback Logic
        const lowerText = text.toLowerCase();
        let fallbackKey = 'default';
        
        if (lowerText.includes('suicid') || lowerText.includes('kill') || lowerText.includes('die') || lowerText.includes('hurt') || 
            lowerText.includes('bunuh') || lowerText.includes('mati') || lowerText.includes('cedera')) {
            fallbackKey = 'crisis';
        } else if (lowerText.includes('anxi') || lowerText.includes('cemas')) {
            fallbackKey = 'anxious';
        } else if (lowerText.includes('sleep') || lowerText.includes('insomnia') || lowerText.includes('tidur')) {
            fallbackKey = 'sleep';
        } else if (lowerText.includes('tired') || lowerText.includes('burnout') || lowerText.includes('penat') || lowerText.includes('letih')) {
            fallbackKey = 'burnout';
        }
        
        const fallback = getFallbackResponse(fallbackKey);
        
        addMessageWithTyping(fallback, 'bot');
        
        // Add fallback response to conversation history
        conversationHistory.push({
            role: 'model',
            text: fallback
        });
        
        conversationContext.lastBotResponse = fallback;
        
        // Update quick action buttons
        updateQuickActions();
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

function quickQuestion(question) {
    document.getElementById('userInput').value = question;
    sendMessage();
}

function addMessage(text, sender) {
    const chatbox = document.getElementById('chatbox');
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    msg.id = 'msg-' + Date.now();
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = text;
    
    // Add timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = getTimeString();
    
    // Add copy button for bot messages (no timestamp for bot messages)
    if (sender === 'bot') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copy message';
        copyBtn.onclick = () => copyToClipboard(text);
        
        const messageActions = document.createElement('div');
        messageActions.className = 'message-actions';
        messageActions.appendChild(copyBtn);
        
        msg.appendChild(content);
        msg.appendChild(messageActions);
    } else {
        // Only show timestamp for user messages
        msg.appendChild(content);
        msg.appendChild(timestamp);
    }
    
    chatbox.appendChild(msg);
    chatbox.scrollTop = chatbox.scrollHeight;
    return msg.id;
}

function addMessageWithTyping(text, sender) {
    const chatbox = document.getElementById('chatbox');
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    msg.id = 'msg-' + Date.now();
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    // Add copy button for bot messages (no timestamp for bot messages)
    if (sender === 'bot') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copy message';
        copyBtn.onclick = () => copyToClipboard(text);
        copyBtn.style.display = 'none'; // Hide until typing is complete
        
        const messageActions = document.createElement('div');
        messageActions.className = 'message-actions';
        messageActions.appendChild(copyBtn);
        
        msg.appendChild(content);
        msg.appendChild(messageActions);
    } else {
        // Only show timestamp for user messages
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = getTimeString();
        msg.appendChild(content);
        msg.appendChild(timestamp);
    }
    
    chatbox.appendChild(msg);
    chatbox.scrollTop = chatbox.scrollHeight;
    
    // Animate typing effect
    if (sender === 'bot') {
        typeMessage(content, text, () => {
            // Show copy button after typing is complete
            if (msg.querySelector('.copy-btn')) {
                msg.querySelector('.copy-btn').style.display = 'block';
            }
        });
    } else {
        content.innerHTML = text;
    }
    
    return msg.id;
}

function typeMessage(element, fullText, onComplete) {
    // For simplicity, show full text immediately for messages with HTML
    // or very long messages. For short plain text, animate it.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Skip animation for HTML-rich or very long messages
    if (fullText.includes('<') || plainText.length > 150) {
        element.innerHTML = fullText;
        if (onComplete) onComplete();
        return;
    }
    
    // Animate plain text messages
    let index = 0;
    const typingSpeed = 15; // milliseconds per character
    
    function type() {
        if (index < plainText.length) {
            element.textContent = plainText.substring(0, index + 1);
            index++;
            setTimeout(type, typingSpeed);
        } else {
            // Restore full HTML if needed
            element.innerHTML = fullText;
            if (onComplete) onComplete();
        }
    }
    
    type();
}

function showTypingIndicator() {
    const chatbox = document.getElementById('chatbox');
    const typingMsg = document.createElement('div');
    typingMsg.classList.add('message', 'bot', 'typing-indicator');
    typingMsg.id = 'typing-' + Date.now();
    
    const typingContent = document.createElement('div');
    typingContent.className = 'typing-dots';
    typingContent.innerHTML = '<span></span><span></span><span></span>';
    
    typingMsg.appendChild(typingContent);
    chatbox.appendChild(typingMsg);
    chatbox.scrollTop = chatbox.scrollHeight;
    
    return typingMsg.id;
}

function removeTypingIndicator(id) {
    const typingElement = document.getElementById(id);
    if (typingElement) {
        typingElement.remove();
    }
}

function getTimeString() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function copyToClipboard(text) {
    // Remove HTML tags for plain text copy
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(plainText).then(() => {
        // Show brief feedback
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = 'Copied!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
        return;
    }
    
    const chatbox = document.getElementById('chatbox');
    const initialMessage = chatbox.querySelector('.message.bot:first-child');
    const typingIndicators = chatbox.querySelectorAll('.typing-indicator');
    
    // Remove all messages except the initial greeting
    const allMessages = chatbox.querySelectorAll('.message');
    allMessages.forEach(msg => {
        if (msg !== initialMessage && !msg.classList.contains('typing-indicator')) {
            msg.remove();
        }
    });
    
    // Remove any typing indicators
    typingIndicators.forEach(indicator => indicator.remove());
    
    // Reset conversation context
    conversationContext = {
        topics: [],
        lastUserMessage: '',
        lastBotResponse: ''
    };
    
    // Reset conversation history
    conversationHistory = [];
    
    // Reset quick actions to general suggestions
    updateQuickActions();
    
    chatbox.scrollTop = chatbox.scrollHeight;
}

// ========================================
// LANGUAGE DETECTION
// ========================================

function detectLanguage(text) {
    const lowerText = text.toLowerCase();
    
    // Common Malay words and patterns
    const malayIndicators = [
        'saya', 'awak', 'kamu', 'dia', 'mereka', 'kita', 'kami',
        'adalah', 'atau', 'dan', 'tetapi', 'juga', 'sangat', 'sangat',
        'tidak', 'bukan', 'sudah', 'belum', 'akan', 'pernah',
        'bagaimana', 'mengapa', 'apa', 'siapa', 'bila', 'mana',
        'ini', 'itu', 'sini', 'sana', 'mana', 'mana-mana',
        'rasa', 'perasaan', 'emosi', 'stres', 'tekanan', 'cemas',
        'tidur', 'letih', 'penat', 'bosan', 'sedih', 'gembira',
        'tolong', 'bantu', 'mahu', 'nak', 'perlu', 'mesti',
        'macam', 'kenapa', 'boleh', 'tak', 'dah', 'belum',
        'dengan', 'untuk', 'kepada', 'daripada', 'dari', 'ke'
    ];
    
    // Count Malay indicators
    let malayCount = 0;
    malayIndicators.forEach(word => {
        // Count occurrences more accurately
        const regex = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
            malayCount += matches.length;
        }
    });
    
    // If any Malay content detected (even in mixed language), prioritize Malay
    // User requested: if mixed language, use the non-English language
    if (malayCount >= 1) {
        return 'ms';
    }
    
    // Check for other non-English patterns (Chinese, Tamil, etc.)
    // For now, default to English if no clear non-English detected
    return 'en';
}

async function generateBotResponse(userMessage, history = []) {
    // Detect language from current user message
    const detectedLang = detectLanguage(userMessage);
    currentLanguage = detectedLang;
    
    // Build language-specific instruction
    const languageInstruction = detectedLang === 'ms' 
        ? "CRITICAL LANGUAGE RULE: The user is communicating in Bahasa Malaysia (Malay). You MUST respond entirely in Malay. Do not mix English and Malay. Use proper Malay throughout your entire response. Do not add any English text after your response."
        : "CRITICAL LANGUAGE RULE: Respond in the exact same language the user is using. If the user writes in English, respond in English. If the user writes in another language, respond in that same language. Match the language exactly - do not mix languages. Do not add any additional text in a different language after your response.";
    
    const systemPrompt = `You are Lumi, a supportive and empathetic AI Mental Health Companion. Your name means "light" and you bring warmth and clarity to conversations.
    
    ${languageInstruction}
    
    CRITICAL RULES:
    1. DO NOT introduce yourself or mention your name "Lumi" in your responses. The user already knows who you are from the initial greeting. Only mention your name if the user specifically asks "What's your name?" or "Who are you?"
    2. Acknowledge the user's feelings naturally and empathetically, but DO NOT always start with phrases like "It makes sense" or "I understand". Vary your response openings - sometimes ask a question, sometimes offer support directly, sometimes share a perspective. Be authentic and varied in how you respond.
    3. Be concise (max 3 sentences unless asked for a list).
    4. CRISIS PROTOCOL: If user implies self-harm, suicide, or severe danger, you MUST politely refuse to provide clinical advice and provide the Malaysia Befrienders number: 03-7627 2929. Use the appropriate language.
    5. Use HTML tags (<b>, <ul>, <br>) for readability.
    6. Bring a warm, light, and hopeful tone to your responses.
    7. Respond directly to what the user says without unnecessary introductions or greetings.
    8. Remember and refer to previous conversation context when relevant. If the user mentions something from earlier in the conversation, acknowledge it.
    9. DO NOT add any additional text, explanations, or translations after your response. Your response should be complete and in the user's language only - nothing else.
    10. Only provide responses for mental health related topics. If asked about something unrelated to mental health, politely decline and suggest seeking help from a professional.
    11. When the user asked something about your creator, respond with "I was created by an undergraduate Computer Science student from Universiti Teknologi PETRONAS."
    `;

    // Build conversation history for API
    // Limit history to last 20 messages to avoid token limits (keep recent context)
    const recentHistory = history.slice(-20);
    const contents = [];
    
    // Always include system prompt in the first message to maintain behavior
    if (recentHistory.length === 0) {
        // First message - include system prompt
        contents.push({
            role: 'user',
            parts: [{ text: systemPrompt + "\n\nUser: " + userMessage }]
        });
    } else {
        // For subsequent messages, include system prompt as context, then history, then current message
        contents.push({
            role: 'user',
            parts: [{ text: systemPrompt }]
        });
        
        // Add conversation history in alternating user/model format
        recentHistory.forEach(msg => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        });
        
        // Add current user message
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
    }

    const requestBody = {
        contents: contents,
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ],
        generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 500,
        }
    };

    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errData = await response.text();
        console.error('API HTTP Error:', response.status, errData);
        throw new Error(`API Error: ${response.status} | ${errData}`);
    }

    const data = await response.json();
    
    // Debug: Log the full response structure
    console.log('API Response:', JSON.stringify(data, null, 2));

    // Check for prompt feedback/blocking
    if (data.promptFeedback && data.promptFeedback.blockReason) {
        console.warn('Prompt blocked:', data.promptFeedback.blockReason);
        const safetyMessage = currentLanguage === 'ms' 
            ? "Saya prihatin dengan apa yang awak katakan, tapi saya tidak dilengkapi untuk menangani topik ini dengan selamat. Sila hubungi profesional manusia."
            : "I care about what you're saying, but I'm not equipped to handle this specific topic safely. Please reach out to a human professional.";
        return safetyMessage;
    }

    // Parse response - try multiple possible structures
    if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        
        // Check if response was blocked by safety filters
        if (candidate.finishReason === 'SAFETY') {
            console.warn('Response blocked by safety filters');
            const safetyMessage = currentLanguage === 'ms' 
                ? "Saya prihatin dengan apa yang awak katakan, tapi saya tidak dilengkapi untuk menangani topik ini dengan selamat. Sila hubungi profesional manusia."
                : "I care about what you're saying, but I'm not equipped to handle this specific topic safely. Please reach out to a human professional.";
            return safetyMessage;
        }
        
        // Try different response paths
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            const text = candidate.content.parts[0].text;
            if (text) {
                return text;
            }
        }
        
        // Alternative path: direct text property
        if (candidate.text) {
            return candidate.text;
        }
        
        // Check for error in finish reason
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn('Unexpected finish reason:', candidate.finishReason);
            throw new Error(`Response finished with reason: ${candidate.finishReason}`);
        }
    }
    
    // If we get here, log the structure for debugging
    console.error('Unexpected response structure:', data);
    throw new Error("No response content generated. Check console for response structure.");
}

// ========================================
// CONTEXTUAL QUICK ACTIONS
// ========================================

function updateConversationTopics(message) {
    const lowerMessage = message.toLowerCase();
    const detectedTopics = [];
    
    // Detect topics based on keywords
    if (lowerMessage.includes('anxious') || lowerMessage.includes('anxiety') || lowerMessage.includes('panic') || lowerMessage.includes('worried')) {
        detectedTopics.push('anxious');
    }
    if (lowerMessage.includes('sleep') || lowerMessage.includes('insomnia') || lowerMessage.includes('tired') || lowerMessage.includes('rest')) {
        detectedTopics.push('sleep');
    }
    if (lowerMessage.includes('burnout') || lowerMessage.includes('exhausted') || lowerMessage.includes('unmotivated') || lowerMessage.includes('drained')) {
        detectedTopics.push('burnout');
    }
    if (lowerMessage.includes('stress') || lowerMessage.includes('stressed') || lowerMessage.includes('pressure') || lowerMessage.includes('overwhelmed')) {
        detectedTopics.push('stress');
    }
    if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down') || lowerMessage.includes('low')) {
        detectedTopics.push('sadness');
    }
    if (lowerMessage.includes('relationship') || lowerMessage.includes('friend') || lowerMessage.includes('family') || lowerMessage.includes('lonely')) {
        detectedTopics.push('relationships');
    }
    if (lowerMessage.includes('confidence') || lowerMessage.includes('self-esteem') || lowerMessage.includes('worth') || lowerMessage.includes('insecure')) {
        detectedTopics.push('self_esteem');
    }
    
    // Update conversation context
    detectedTopics.forEach(topic => {
        if (!conversationContext.topics.includes(topic)) {
            conversationContext.topics.push(topic);
        }
    });
    
    // Keep only last 5 topics to avoid clutter
    if (conversationContext.topics.length > 5) {
        conversationContext.topics = conversationContext.topics.slice(-5);
    }
}

function getContextualSuggestions() {
    const suggestions = [];
    const usedSuggestions = new Set();
    
    // If we have detected topics, prioritize those
    if (conversationContext.topics.length > 0) {
        // Get 2-3 suggestions from detected topics
        const topicSuggestions = [];
        conversationContext.topics.forEach(topic => {
            if (QUICK_ACTION_POOL[topic]) {
                const pool = QUICK_ACTION_POOL[topic];
                // Pick 1-2 random suggestions from each relevant topic
                const shuffled = [...pool].sort(() => 0.5 - Math.random());
                shuffled.slice(0, 2).forEach(suggestion => {
                    if (!usedSuggestions.has(suggestion) && topicSuggestions.length < 3) {
                        topicSuggestions.push(suggestion);
                        usedSuggestions.add(suggestion);
                    }
                });
            }
        });
        suggestions.push(...topicSuggestions);
    }
    
    // Fill remaining slots with general suggestions
    const generalPool = [...QUICK_ACTION_POOL.general].sort(() => 0.5 - Math.random());
    while (suggestions.length < 4) {
        const suggestion = generalPool.find(s => !usedSuggestions.has(s));
        if (suggestion) {
            suggestions.push(suggestion);
            usedSuggestions.add(suggestion);
        } else {
            // If we run out, break
            break;
        }
    }
    
    // Ensure we have exactly 4 suggestions
    while (suggestions.length < 4) {
        const allSuggestions = Object.values(QUICK_ACTION_POOL).flat();
        const randomSuggestion = allSuggestions[Math.floor(Math.random() * allSuggestions.length)];
        if (!usedSuggestions.has(randomSuggestion)) {
            suggestions.push(randomSuggestion);
            usedSuggestions.add(randomSuggestion);
        }
    }
    
    return suggestions.slice(0, 4);
}

function updateQuickActions() {
    const quickActionsContainer = document.querySelector('.quick-actions');
    if (!quickActionsContainer) return;
    
    // Get contextual suggestions
    const suggestions = getContextualSuggestions();
    
    // Clear existing buttons
    quickActionsContainer.innerHTML = '';
    
    // Create new buttons
    suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.className = 'quick-btn';
        button.textContent = suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion;
        button.title = suggestion; // Full text on hover
        button.onclick = () => quickQuestion(suggestion);
        quickActionsContainer.appendChild(button);
    });
}

// Initialize quick actions on page load
document.addEventListener('DOMContentLoaded', () => {
    updateQuickActions();
    initMobileOptimizations();
});

// ========================================
// MOBILE OPTIMIZATIONS
// ========================================

function initMobileOptimizations() {
    const input = document.getElementById('userInput');
    const chatbox = document.getElementById('chatbox');
    
    // Prevent zoom on input focus (iOS)
    if (input) {
        // Set font size to 16px to prevent iOS zoom
        const style = window.getComputedStyle(input);
        if (parseInt(style.fontSize) < 16) {
            input.style.fontSize = '16px';
        }
        
        // Scroll chatbox to bottom when input is focused (mobile)
        input.addEventListener('focus', () => {
            setTimeout(() => {
                if (chatbox) {
                    chatbox.scrollTop = chatbox.scrollHeight;
                }
                // Scroll input into view
                input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 300);
        });
    }
    
    // Handle viewport height on mobile browsers
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });
    
    // Improve touch scrolling
    if (chatbox) {
        let isScrolling = false;
        chatbox.addEventListener('touchstart', () => {
            isScrolling = true;
        });
        chatbox.addEventListener('touchend', () => {
            setTimeout(() => {
                isScrolling = false;
            }, 150);
        });
    }
    
    // Prevent double-tap zoom on buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        let lastTap = 0;
        button.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault();
            }
            lastTap = currentTime;
        });
    });
}