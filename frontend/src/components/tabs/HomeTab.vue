<script setup>
import { ref, computed } from 'vue'

const props = defineProps(['messages', 'history', 'quickPrompts', 'typing', 'showHistoryPanel']);
const emit = defineEmits(['send', 'sendQuick', 'handleAction', 'loadHistory', 'toggleHistory', 'removeHistory', 'openDisclaimer', 'openTranslate', 'translate', 'newChat']);

const inputText = ref('');
const chatBox = ref(null);
const expandedClauses = ref({});

const formatMsg = (t) => t.replace(/\n/g, '<br>');

// DeepSeek-style time grouping using ISO timestamps
const groupedHistory = computed(() => {
    const now = Date.now();
    const DAY = 86400000;
    const groups = { '今天': [], '昨天': [], '最近7天': [], '更久之前': [] };

    (props.history || []).forEach(item => {
        // Skip entries without a valid ISO timestamp (stale old-format data)
        if (!item.timestamp) return;

        const ts = new Date(item.timestamp).getTime();
        if (isNaN(ts)) return;

        const diffDays = (now - ts) / DAY;

        // Compute a readable display label
        if (!item.dateLabel) {
            if (diffDays < 1) item.dateLabel = '今天';
            else if (diffDays < 2) item.dateLabel = '昨天';
            else if (diffDays < 7) item.dateLabel = `${Math.floor(diffDays)}天前`;
            else if (diffDays < 30) item.dateLabel = `${Math.floor(diffDays / 7)}周前`;
            else item.dateLabel = `${Math.floor(diffDays / 30)}个月前`;
        }

        if (diffDays < 1) groups['今天'].push(item);
        else if (diffDays < 2) groups['昨天'].push(item);
        else if (diffDays < 7) groups['最近7天'].push(item);
        else groups['更久之前'].push(item);
    });

    return Object.fromEntries(Object.entries(groups).filter(([, items]) => items.length > 0));
});

const handleSend = () => {
    if (!inputText.value.trim()) return;
    emit('send', inputText.value.trim());
    inputText.value = '';
};

const isListening = ref(false);
let recognition = null;
if (window.webkitSpeechRecognition || window.SpeechRecognition) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.onstart = () => { isListening.value = true; };
    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) inputText.value += event.results[i][0].transcript;
        }
    };
    recognition.onerror = () => { isListening.value = false; };
    recognition.onend = () => { isListening.value = false; };
}

const toggleVoice = () => {
    if (!recognition) { alert('您的浏览器暂不支持语音识别功能，请使用 Chrome。'); return; }
    if (isListening.value) { recognition.stop(); } else { recognition.start(); }
};

// Touch swipe to open
const touchStartX = ref(0);
const handleTouchStart = (e) => { touchStartX.value = e.touches[0].clientX; };
const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.value;
    if (deltaX > 70 && !props.showHistoryPanel) emit('toggleHistory');
    if (deltaX < -70 && props.showHistoryPanel) emit('toggleHistory');
};

const expose = {
    scrollDown: () => {
        if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
    }
};
defineExpose(expose);
</script>

<template>
    <div class="home-tab-container" @touchstart="handleTouchStart" @touchend="handleTouchEnd">

        <!-- DeepSeek-style Left Sliding Drawer (scoped inside phone frame) -->
        <Transition name="sidebar-slide">
            <div v-show="showHistoryPanel" class="history-sidebar-overlay" @click.self="emit('toggleHistory')">
                <div class="history-sidebar-main">
                    <div class="sidebar-header">
                        <span class="sidebar-title">全部历史</span>
                        <button class="new-conversation-btn" @click="emit('newChat'); emit('toggleHistory')">
                            + 新对话
                        </button>
                    </div>
                    <div class="sidebar-list-area">
                        <template v-if="history && history.length > 0">
                            <div v-for="(items, label) in groupedHistory" :key="label" class="history-category">
                                <div class="category-label">{{ label }}</div>
                                <div v-for="h in items" :key="h.id" class="history-card"
                                    @click="emit('loadHistory', h); emit('toggleHistory')">
                                    <div class="h-card-body">
                                        <div class="h-card-content">{{ h.preview }}</div>
                                        <div class="h-card-date">{{ h.dateLabel || h.date || '' }}</div>
                                    </div>
                                    <span class="h-card-del" @click.stop="emit('removeHistory', h.id)">✕</span>
                                </div>
                            </div>
                        </template>
                        <div v-else class="empty-state">暂无历史对话</div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Header -->
        <div class="page-header">
            <button class="header-action secondary-btn" @click="emit('toggleHistory')">⋯</button>
            <div style="flex:1">
                <div class="header-title">保全全 AI</div>
                <div class="header-sub">中立 · 无推销 · 专业解读</div>
            </div>
            <div class="header-logo">🛡</div>
        </div>

        <!-- Notice -->
        <div class="notice-bar" @click="emit('openDisclaimer')">
            <div class="notice-dot"></div>
            <span class="notice-text">保全全AI不推荐具体产品，仅提供风险分析和条款解读</span>
            <span class="notice-arrow">›</span>
        </div>

        <!-- Chat Area -->
        <div class="chat-wrap" style="flex:1;min-height:0">
            <!-- Voice Waveform Overlay -->
            <Transition name="fade">
                <div v-if="isListening" class="voice-waveform-overlay">
                    <div class="waveform-container">
                        <div v-for="i in 5" :key="i" class="wave-bar"></div>
                    </div>
                </div>
            </Transition>
            
            <div class="chat-messages" ref="chatBox">
                <div v-for="msg in messages" :key="msg.id" class="msg-row" :class="msg.from">
                    <div v-if="msg.from === 'ai'" class="msg-avatar ai">🛡</div>
                    <div class="msg-bubble" :class="msg.from">
                        <div v-if="msg.verdict" class="verdict" :class="msg.verdict">
                            {{ msg.verdict === 'ok' ? '✓ 可赔付' : msg.verdict === 'no' ? '✗ 不可赔付' : '⚠ 需核实' }}
                        </div>
                        <div v-html="formatMsg(msg.text)"></div>
                        <div v-if="msg.clause" class="clause-ref" @click="expandedClauses[msg.id] = !expandedClauses[msg.id]">
                            <div style="font-weight:600;display:flex;justify-content:space-between;align-items:center">
                                <span>📄 {{ expandedClauses[msg.id] ? '底单原文段落依据' : '点击展开底单原文依据' }}</span>
                                <span style="font-size:10px">{{ expandedClauses[msg.id] ? '▲' : '▼' }}</span>
                            </div>
                            <div v-show="expandedClauses[msg.id]" style="margin-top:8px;color:var(--gray-600);line-height:1.6;font-size:13px;font-family:serif;background:white;padding:10px;border-radius:6px;border:1px solid var(--border)">
                                {{ msg.clause }}
                                <div style="margin-top:10px;text-align:right">
                                    <span style="color:var(--primary);text-decoration:underline;font-weight:600" @click.stop="emit('translate')">跳转至原文长卷追踪 &rarr;</span>
                                </div>
                            </div>
                        </div>
                        <div v-if="msg.actions" class="msg-actions">
                            <button v-for="a in msg.actions" :key="a.label" class="msg-btn" :class="a.type || ''" @click="emit('handleAction', a)">{{ a.label }}</button>
                        </div>
                    </div>
                </div>
                <div v-if="typing" class="msg-row ai">
                    <div class="msg-avatar ai">🛡</div>
                    <div class="msg-bubble ai">
                        <div class="msg-typing">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                </div>
            </div><!-- end .chat-messages -->
        </div><!-- end .chat-wrap -->

        <!-- Input -->
        <div class="chat-input-wrap">
            <div class="quick-prompts">
                <div class="quick-chip" v-for="q in quickPrompts" :key="q" @click="emit('sendQuick', q)">{{ q }}</div>
            </div>
            <div class="chat-input-row">
                <button class="input-icon-btn" @click="emit('openTranslate')">📷</button>
                <button class="input-icon-btn" :class="{ 'recording': isListening }" @click="toggleVoice" :title="isListening ? '停止录音' : '开始语音输入'">
                    {{ isListening ? '⏹️' : '🎤' }}
                </button>
                <textarea class="chat-input" :class="{ 'listening': isListening }" v-model="inputText" :placeholder="isListening ? '正在聆听，请说话...' : '问我任何保险问题…'" rows="1" @keydown.enter.exact.prevent="handleSend"></textarea>
                <button class="send-btn" @click="handleSend" :disabled="!inputText.trim()">↑</button>
            </div>
        </div>

    </div>
</template>
