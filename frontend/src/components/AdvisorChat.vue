<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps(['currentAdvisor', 'advisorMessages', 'consultTimer', 'showEndConsult']);
const emit = defineEmits(['close', 'toggleEndConsult', 'send', 'finish']);

const advisorInput = ref('');
const chatScroll = ref(null);

const scrollDown = () => {
    if (chatScroll.value) {
        chatScroll.value.scrollTop = chatScroll.value.scrollHeight;
    }
};

watch(() => props.advisorMessages?.length, () => {
    nextTick(() => scrollDown());
});

const handleSend = () => {
  if (!advisorInput.value.trim()) return;
  emit('send', advisorInput.value.trim());
  advisorInput.value = '';
};
</script>

<template>
  <div style="position:absolute;inset:0;background:var(--bg);z-index:150;display:flex;flex-direction:column;box-shadow:var(--shadow-lg)">
    <div class="status-bar">
      <span class="status-time">9:41</span>
      <div class="status-icons"><span>●●●</span><span> WiFi </span><span>🔋</span></div>
    </div>
    <div class="page-header">
      <button class="header-action" style="margin-right:8px" @click="emit('close')">←</button>
      <div class="advisor-avatar" :style="{ background: currentAdvisor?.bg, width: '34px', height: '34px', fontSize: '16px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }">{{ currentAdvisor?.avatar }}</div>
      <div style="flex:1;margin-left:8px">
        <div class="header-title" style="font-size:15px">{{ currentAdvisor?.name }}</div>
        <div class="header-sub">独立顾问 · 存证咨询中</div>
      </div>
      <button style="padding:6px 13px;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer" @click="emit('toggleEndConsult', true)">结束</button>
    </div>
    <div class="recording-bar">
      <div class="rec-dot"></div>
      <span class="rec-text">🔴 录音 / 录像存证中</span>
      <span class="rec-timer">{{ consultTimer }}</span>
    </div>
    <div class="chat-messages" style="flex:1;overflow-y:auto" ref="chatScroll">
      <div v-for="msg in advisorMessages" :key="msg.id" class="msg-row" :class="msg.from">
        <div v-if="msg.from === 'ai'" :style="{ background: currentAdvisor?.bg, width: '33px', height: '33px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }">{{ currentAdvisor?.avatar }}</div>
        <div class="msg-bubble" :class="[msg.from, msg.promised ? 'promise-msg' : '', msg.isSupervision ? 'supervision' : '']">
          <div v-if="msg.promised && !msg.isSupervision" class="promise-badge">📌 关键承诺保证</div>
          {{ msg.text }}
        </div>
      </div>
    </div>
    <div class="chat-input-wrap">
      <div style="font-size:11px;color:var(--gray-400);text-align:center;margin-bottom:7px">长按顾问消息可标记为「关键承诺」</div>
      <div class="chat-input-row">
        <textarea class="chat-input" placeholder="向顾问提问…" rows="1" v-model="advisorInput"></textarea>
        <button class="send-btn" @click="handleSend">↑</button>
      </div>
    </div>

    <!-- End Consult Modal inside overlay -->
    <transition name="fade">
      <div v-if="showEndConsult" class="modal-overlay" @click.self="emit('toggleEndConsult', false)">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title">结束本次咨询</div>
          <div class="modal-body">本次咨询时长 <strong>{{ consultTimer }}</strong>，已自动保存录音和对话记录。<br><br>是否生成<strong>存证报告</strong>？报告将包含：<br>• 完整对话文字记录<br>• 加密哈希校验码<br>• 关键承诺标注摘要</div>
          <button class="modal-close" style="background:var(--teal)" @click="emit('finish', true)">✅ 生成存证报告</button>
          <button class="modal-close" style="background:var(--bg2);color:var(--gray-600);margin-top:8px" @click="emit('finish', false)">跳过，直接结束</button>
        </div>
      </div>
    </transition>
  </div>
</template>
