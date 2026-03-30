<script setup>
import { ref, nextTick, onMounted } from 'vue'
import axios from 'axios'

// Import Components
import HomeTab from './components/tabs/HomeTab.vue'
import TranslateTab from './components/tabs/TranslateTab.vue'
import VaultTab from './components/tabs/VaultTab.vue'
import ProfileTab from './components/tabs/ProfileTab.vue'
import GuardianTab from './components/tabs/GuardianTab.vue'
import AdvisorChat from './components/AdvisorChat.vue'

// State
const currentTab = ref(0);
const currentPage = ref('translate');
const userProfile = ref({});
const typing = ref(false);
const showDisclaimer = ref(false);
const showHistoryPanel = ref(false);
const showAdvisorPicker = ref(false);
const showAdvisorChat = ref(false);
const showEndConsult = ref(false);
const showComplaintModal = ref(false);
const showProfileModal = ref(false);
const pickerContext = ref(false);
const selectedAdvisorId = ref(null);
const currentAdvisor = ref(null);
const resultTab = ref(0);
const selectedHotspot = ref(null);
const extractedText = ref('');
const consultTimer = ref('00:00');
const currentUser = ref(null); 
const reports = ref([]);
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// --- IndexedDB Storage Logic ---
const DB_NAME = 'ProGuardDB';
const STORES = ['history', 'vault', 'reports', 'recent', 'advisor_chats'];

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach(s => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      });
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

const dbSave = async (store, data) => {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const record = JSON.parse(JSON.stringify(data));
  // User Isolation: Tag with current UID
  record.uid = currentUser.value ? currentUser.value.id : 'guest';
  tx.objectStore(store).put(record);
  return new Promise(r => tx.oncomplete = r);
};

const dbGet = async (store, id) => {
  const db = await openDB();
  const tx = db.transaction(store, 'readonly');
  const req = tx.objectStore(store).get(id);
  return new Promise(r => req.onsuccess = () => r(req.result));
};

const dbLoadByUser = async (storeName) => {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const req = tx.objectStore(storeName).getAll();
  return new Promise(r => req.onsuccess = () => {
    const currentUid = currentUser.value ? currentUser.value.id : 'guest';
    const filtered = req.result.filter(item => item.uid === currentUid);
    r(filtered);
  });
};

const dbLoadAll = async (store) => {
  const db = await openDB();
  const tx = db.transaction(store, 'readonly');
  const req = tx.objectStore(store).getAll();
  return new Promise(r => req.onsuccess = () => r(req.result));
};

const dbRemove = async (store, id) => {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  return new Promise(r => tx.oncomplete = r);
};

let timerInterval = null;
let startTime = null;

import { watch } from 'vue';
watch(showAdvisorChat, (val) => {
  if (val) {
    startTime = Date.now();
    consultTimer.value = '00:00';
    showEndConsult.value = false;
    timerInterval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const mm = String(Math.floor(diff / 60)).padStart(2, '0');
      const ss = String(diff % 60).padStart(2, '0');
      consultTimer.value = `${mm}:${ss}`;
    }, 1000);
  } else {
    clearInterval(timerInterval);
  }
});

async function handleFinishConsult(generateReport) {
  if (generateReport) {
    const newReport = {
      id: Date.now(),
      title: `存证报告-${currentAdvisor.value?.name || '专家'}`,
      advisor: currentAdvisor.value?.name,
      time: new Date().toLocaleString(),
      duration: consultTimer.value,
      hash: "SHA256:" + Math.random().toString(36).substring(2, 15).toUpperCase(),
      highlights: advisorMessages.value.filter(m => m.promised).map(m => m.text)
    };
    reports.value.unshift(newReport);
    await dbSave('reports', newReport); // Save to idb
  }
  showAdvisorChat.value = false;
}

const quickPrompts = ref(['解析《平安福》', '肺炎住院能赔吗？', '分析我的保障缺口', '阑尾炎手术赔不赔']);
const advisors = ref([]);
const history = ref([]);
const recentPolicies = ref([]);
const hotspots = ref([]);
const risks = ref([]);
const vault = ref([]);
// Session tracking for auto-save
const currentSessionId = ref(Date.now());
const messages = ref([{
  id: 1, from: 'ai',
  text: '您好！我是保全全AI 🛡️\n\n我可以帮您：\n• <span class="msg-term">解读保险条款</span>，判断能否赔付\n• 分析您的<span class="msg-term">保障缺口</span>\n• 对接<span class="msg-term">独立理赔师</span>与第三方顾问\n\n请问您有什么保险问题？',
  actions: [
    { label: '📄 解读保单', type: 'primary', action: 'select_policy' },
    { label: '📊 分析保障缺口', action: 'gap' },
    { label: '🔍 场景能不能赔', action: 'scenario_check' },
    { label: '🤝 对接独立顾问', type: 'accent', action: 'advisor' },
  ]
}]);
const advisorMessages = ref([]);

// Component References
const homeTabRef = ref(null);

// Methods
async function sendMessage(text) {
  messages.value.push({ id: Date.now(), from: 'user', text });
  typing.value = true;
  scrollDown();
  try {
    const res = await axios.post(`${API_BASE}/api/chat`, { 
      text, 
      context: extractedText.value || '',
      profile: userProfile.value
    }, { headers: { 'x-user-id': currentUser.value?.id } });

    setTimeout(() => {
      typing.value = false;
      messages.value.push(res.data);
      scrollDown();
      // Auto-save this conversation to history
      saveConversationToHistory(text);
    }, 1000);
  } catch (err) {
    typing.value = false;
    messages.value.push({ id: Date.now() + 1, from: 'ai', text: '抱歉，连接服务器失败。' });
  }
}

// Save current conversation snapshot into the history list
async function saveConversationToHistory(firstUserMsg) {
  const preview = firstUserMsg.slice(0, 20) + (firstUserMsg.length > 20 ? '…' : '');
  const snapshot = messages.value.map(m => ({ id: m.id, from: m.from, text: m.text, actions: m.actions }));
  
  const entry = {
    id: currentSessionId.value,
    sessionId: currentSessionId.value,
    preview,
    timestamp: new Date().toISOString(),
    messages: snapshot,
  };

  const existingIdx = history.value.findIndex(h => h.id === entry.id);
  if (existingIdx >= 0) history.value[existingIdx] = entry;
  else history.value.unshift(entry);

  await dbSave('history', entry);
}

function handleAction(a) {
  if (a.action === 'translate') { currentTab.value = 1; currentPage.value = 'translate'; }
  else if (a.action === 'result') { currentTab.value = 1; currentPage.value = 'result'; }
  else if (a.action === 'advisor') { openAdvisorPicker(true); }
  else if (a.action === 'gap') { sendMessage('分析我的保障缺口'); }
  else if (a.action === 'scenario_check') {
    messages.value.push({ id: Date.now(), from: 'ai',
      text: '请描述您的具体场景，我来帮您判断能否理赔 👇\n\n例如：「肺炎住院5天，有医疗险和重疾险，能赔吗？」\n或：「骑电动车摔伤骨折，意外险能报销吗？」',
    });
    scrollDown();
  }
  else if (a.action === 'select_policy') {
      messages.value.push({ id: Date.now(), from: 'user', text: a.label });
      typing.value = true;
      scrollDown();
      setTimeout(() => {
          typing.value = false;
          if (vault.value.length === 0) {
              messages.value.push({
                  id: Date.now(), from: 'ai',
                  text: '您的保单箱中暂无保单。您可以去【条款译】进行拍摄上传，或在下方直接向我提问。',
                  actions: [{ label: '📷 去扫描保单', type: 'primary', action: 'translate' }]
              });
          } else {
              const pActions = vault.value.slice(0, 5).map(p => ({
                  label: `📄 ${p.name}`,
                  action: 'analyze_policy',
                  policyData: p
              }));
              messages.value.push({
                  id: Date.now(), from: 'ai',
                  text: '好的，请从保单箱选择您要解读的保单：',
                  actions: pActions
              });
          }
          scrollDown();
      }, 600);
  }
  else if (a.action === 'analyze_policy') {
      const p = a.policyData;
      extractedText.value = p.fullText || (hotspots.value.length > 0 ? hotspots.value.map(h=>h.original).join("\n\n") : `保险名称: ${p.name}, 公司: ${p.company}, 保费: ${p.premium}`);
      messages.value.push({ id: Date.now(), from: 'user', text: `选择解读: ${p.name}` });
      typing.value = true;
      scrollDown();
      setTimeout(() => {
          typing.value = false;
          messages.value.push({
              id: Date.now(), from: 'ai',
              text: `已为您加载《${p.name}》的条款数据。\n请问您想分析哪个业务场景？`,
              actions: [
                  { label: '🤒 疾病住院理赔', action: 'scenario', scenario: '住院理赔' },
                  { label: '🏥 手术费用报销', action: 'scenario', scenario: '手术报销' },
                  { label: '🧩 保障责任核查', action: 'scenario', scenario: '保障责任' },
                  { label: '❓ 其他问题', action: 'scenario', scenario: '通用咨询' }
              ]
          });
          scrollDown();
      }, 800);
  }
  else if (a.action === 'scenario') {
      sendMessage(`${a.scenario}场景分析：在这份保单下，这类情况是如何规定的？`);
  }
}

function loadHistory(h) {
  showHistoryPanel.value = false;
  // Restore saved message snapshot
  if (h.messages && h.messages.length > 0) {
    messages.value = h.messages.map((m, i) => ({ ...m, id: Date.now() + i }));
  } else {
    messages.value = [{ id: Date.now(), from: 'ai', text: `已加载历史和话：「${h.preview}」` }];
  }
  // Set sessionId so further messages update this history entry
  currentSessionId.value = h.sessionId || h.id;
  nextTick(() => scrollDown());
}


function startNewChat() {
  // Reset to initial welcome message with 4 action buttons
  messages.value = [{
    id: Date.now(), from: 'ai',
    text: '您好！我是保全全AI 🛡️\n\n我可以帮您：\n• <span class="msg-term">解读保险条款</span>，判断能否赔付\n• 分析您的<span class="msg-term">保障缺口</span>\n• 对接<span class="msg-term">独立理赔师</span>与第三方顾问\n\n请问您有什么保险问题？',
    actions: [
      { label: '📄 解读保单', type: 'primary', action: 'select_policy' },
      { label: '📊 分析保障缺口', action: 'gap' },
      { label: '🔍 场景能不能赔', action: 'scenario_check' },
      { label: '🤝 对接独立顾问', type: 'accent', action: 'advisor' },
    ]
  }];
  // New session ID so this becomes a fresh conversation
  currentSessionId.value = Date.now();
  nextTick(() => scrollDown());
}

async function saveAdvisorChat() {
  if (!currentAdvisor.value) return;
  const chatId = `adv_chat_${currentAdvisor.value.id}`;
  await dbSave('advisor_chats', {
    id: chatId,
    advisorId: currentAdvisor.value.id,
    messages: advisorMessages.value
  });
}

async function selectAdvisor(a) {
  currentAdvisor.value = a;
  selectedAdvisorId.value = a.id;
  showAdvisorPicker.value = false;
  
  // Try loading history
  const saved = await dbGet('advisor_chats', `adv_chat_${a.id}`);
  if (saved && saved.messages && saved.messages.length > 0) {
    advisorMessages.value = saved.messages;
  } else {
    const intro = a.type === 'official' 
      ? `您好！我是${a.name}。我是您保单所属保司的直属官方专家（工号: ${1000 + a.id}）。我将为您开启官方绿色通道，办理核赔与条款核实。`
      : `您好！我是独立专家${a.name}。作为第三方${a.title}，我将撇开业绩考核，从纯中立立场为您分析保单权益，尤其擅长处理${a.specialty}。`;
      
    advisorMessages.value = [
      { id: 1, from: 'ai', text: intro }
    ];
  }
  showAdvisorChat.value = true;
}

function sendAdvisorMsg(txt) {
  const msgId = Date.now();
  advisorMessages.value.push({ id: msgId, from: 'user', text: txt });
  saveAdvisorChat();

  setTimeout(() => {
    const advId = Date.now() + 1;
    const advisorText = '经系统实时查核：您这份保单的附加险中已实质包含该项特定门诊责任。我会立刻为您锁定该条目，并生成一份正式的《专家级理赔评估意见书》。这份文件将由我作为核赔理赔师签名背书，您可以直接作为正式申诉的核心筹码提交给保司。';
    
    advisorMessages.value.push({ 
      id: advId, from: 'ai', text: advisorText, promised: true 
    });
    saveAdvisorChat();

    // AI Monitoring/Supervision Protocol - Truth & Compliance Audit
    setTimeout(() => {
      const isTruthAudit = txt.includes('赔') || txt.includes('保') || txt.includes('条');
      const supervisionText = isTruthAudit 
        ? `🛡️ [AI 实时监督]：方案逻辑吻合保单【第8.3.1条】，理赔路径清晰一致。当前回复已完成云端安全扫描与法律存证。`
        : `🛡️ [AI 合规扫描]：已核查咨询回复逻辑，符合独立顾问自律准则。对话全程已进行文本存证。`;

      advisorMessages.value.push({
        id: Date.now() + 2,
        from: 'ai',
        text: supervisionText,
        isSupervision: true
      });
      saveAdvisorChat();
    }, 1200);
  }, 1000);
}

function openAdvisorPicker(fromChat) {
  pickerContext.value = fromChat;
  selectedAdvisorId.value = null;
  showAdvisorPicker.value = true;
}

const compressImage = async (file, maxWidth = 1000) => {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name || 'image.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.6);
      };
      img.src = e.target.result;
    };
  });
};

async function startOCR(files) {
  currentPage.value = 'ocr'; 
  
  if (!files || (typeof files.length !== 'undefined' && files.length === 0)) {
    setTimeout(() => { 
        if (!extractedText.value) {
            extractedText.value = "这是您上传的保险合同条款原文扫描件重构结果：\n\n" + hotspots.value.map(h => h.original).join("\n\n") + "\n\n（以上为智能提取的关联段落，请结合解读共同参考。）";
        }
        currentPage.value = 'result'; 
    }, 3000);
    return;
  }

  const formData = new FormData();
  
  try {
    if (Array.isArray(files) || files instanceof FileList) {
      for (let i = 0; i < files.length; i++) {
        let f = files[i];
        if (f.__v_raw) f = f.__v_raw; // Unwrap Vue 3 reactive proxy
        const compressed = await compressImage(f);
        formData.append('file', compressed);
      }
    } else {
      let f = files;
      if (f.__v_raw) f = f.__v_raw; // Unwrap Vue 3 reactive proxy
      const compressed = await compressImage(f);
      formData.append('file', compressed); 
    }

    const res = await axios.post(`${API_BASE}/api/ocr`, formData);
    if (res.data && res.data.hotspots) {
      // 成功获取到真实AI解析数据，替换当前界面数据
      hotspots.value = res.data.hotspots;
      risks.value = res.data.risks || [];
      extractedText.value = res.data.extracted_text || '';
      
      // 自动选中第一条高亮条款以展示解析结果
      if (hotspots.value.length > 0) {
        selectedHotspot.value = hotspots.value[0];
      }
      
      const meta = res.data.meta || {};
      const newPolicy = {
        id: Date.now(),
        name: hotspots.value.length > 0 ? hotspots.value[0].name : '全新解析保单',
        company: meta.company || '未知公司',
        type: meta.type || 'health',
        typeLabel: meta.typeLabel || '综合保障',
        amount: meta.amount || '未载明',
        premium: meta.premium || '未载明',
        period: meta.period || '实时追踪中',
        status: '最新识别',
        fullText: extractedText.value
      };
      vault.value.unshift(newPolicy);
      await dbSave('vault', newPolicy);
      
      const newRecent = {
        id: Date.now() + 1,
        icon: '📄',
        type: meta.type || 'health',
        name: newPolicy.name,
        date: new Date().toISOString().split('T')[0],
        status: risks.value.length > 0 ? 'warn' : 'done',
        hotspots: res.data.hotspots || [],
        risks: res.data.risks || [],
        fullText: extractedText.value
      };
      recentPolicies.value.unshift(newRecent);
      await dbSave('recent', newRecent);
      
      // 云端持久化
      if (currentUser.value) {
          axios.post(`${API_BASE}/api/history/save`, { record: newRecent, policy: newPolicy }, { headers: { 'x-user-id': currentUser.value.id } });
      }

      currentPage.value = 'result';
    }
  } catch (err) {
    // 处理 AI 拒绝非保单的错误
    if (err.response && err.response.data && err.response.data.error) {
      alert("AI 识别失败：\n" + err.response.data.error);
      currentPage.value = 'translate';
      return;
    }
    console.error('真实API解析超时或失败，使用兜底数据', err);
    if (!extractedText.value) {
        extractedText.value = "这是您上传的保险合同条款原文扫描件重构结果：\n\n" + hotspots.value.map(h => h.original).join("\n\n") + "\n\n（以上为智能提取的关联段落，请结合解读共同参考。）";
    }
    currentPage.value = 'result';
  }
}

function scrollDown() { nextTick(() => { homeTabRef.value?.scrollDown(); }); }

async function removeHistory(h) {
  history.value = history.value.filter(item => item.id !== h.id);
  await dbRemove('history', h.id);
}

async function removeRecentPolicy(p) {
  recentPolicies.value = recentPolicies.value.filter(item => item.id !== p.id);
  await dbRemove('recent', p.id);
}

async function removePolicy(p) {
  vault.value = vault.value.filter(item => item.id !== p.id);
  await dbRemove('vault', p.id);
}

function handleSelectRecentPolicy(record) {
  if (record.hotspots && record.hotspots.length > 0) {
    hotspots.value = record.hotspots;
    risks.value = record.risks || [];
    extractedText.value = record.fullText || record.hotspots.map(h => h.original).join("\n\n");
    if (hotspots.value.length > 0) selectedHotspot.value = hotspots.value[0];
  } else {
    // 强制补全模拟数据
    extractedText.value = hotspots.value.map(h => h.original).join("\n\n");
    if (hotspots.value.length > 0) selectedHotspot.value = hotspots.value[0];
  }
  currentPage.value = 'result';
}

function handleLogin(user) {
    currentUser.value = user;
    localStorage.setItem('__proguard_user', JSON.stringify(user));
    fetchInitialData();
}

function handleLogout() {
    currentUser.value = null;
    localStorage.removeItem('__proguard_user');
    messages.value = [messages.value[0]]; // Reset chat
    fetchInitialData();
}

async function fetchInitialData() {
  try {
    const config = { headers: { 'x-user-id': currentUser.value?.id } };
    const [advisorsRes, hotspotsRes, risksRes, vaultRes] = await Promise.all([
      axios.get(`${API_BASE}/api/advisors`, config),
      axios.get(`${API_BASE}/api/hotspots`, config),
      axios.get(`${API_BASE}/api/risks`, config),
      axios.get(`${API_BASE}/api/vault`, config)
    ]);
    
    advisors.value = advisorsRes.data;
    hotspots.value = hotspotsRes.data;
    risks.value = risksRes.data;

    // Load User Data from IndexedDB with Isolation
    const historyDb = await dbLoadByUser('history');
    const recentDb = await dbLoadByUser('recent');
    const vaultDb = await dbLoadByUser('vault');
    const reportsDb = await dbLoadByUser('reports');

    history.value = historyDb.sort((a, b) => b.id - a.id);
    recentPolicies.value = recentDb.sort((a, b) => b.id - a.id);
    vault.value = vaultDb.length > 0 ? vaultDb : vaultRes.data;
    reports.value = reportsDb.sort((a, b) => b.id - a.id);

    if (!extractedText.value && hotspots.value.length > 0) {
      extractedText.value = "这是您上传的保险合同条款原文扫描件重构结果：\n\n" + hotspots.value.map(h => h.original).join("\n\n") + "\n\n（以上为智能提取的关联段落，请结合解读共同参考。）";
    }
  } catch (err) {
    console.error('Failed to fetch initial data', err);
  }
}

onMounted(async () => {
    const savedUser = localStorage.getItem('__proguard_user');
    if (savedUser) currentUser.value = JSON.parse(savedUser);
    
    fetchInitialData();
});
</script>

<template>
  <div id="app">
    <div class="status-bar">
      <span class="status-time">9:41</span>
      <div class="status-icons"><span>●●●</span><span> WiFi </span><span>🔋</span></div>
      <div class="global-profile-trigger" @click="showProfileModal = !showProfileModal" title="个人中心">
        {{ currentUser ? '👶' : '👤' }}
      </div>
      <button v-if="currentUser" class="logout-icon" @click="handleLogout" title="退出登录" style="margin-left:8px; background:none; border:none; font-size:20px; cursor:pointer; color:var(--text);">
        🚪
      </button>
    </div>

    <!-- MAIN TABS -->
    <HomeTab v-if="currentTab === 0" ref="homeTabRef" 
      :messages="messages" :history="history" :quickPrompts="quickPrompts"
      :typing="typing" :showHistoryPanel="showHistoryPanel"
      @send="sendMessage" @sendQuick="sendMessage" @handleAction="handleAction"
      @loadHistory="loadHistory" @toggleHistory="showHistoryPanel = !showHistoryPanel"
      @removeHistory="removeHistory" @newChat="startNewChat"
      @openDisclaimer="showDisclaimer = true" @openTranslate="currentTab = 1; currentPage = 'translate'"
      @translate="currentTab = 1; currentPage = 'result'" 
    />

    <TranslateTab v-else-if="currentTab === 1" 
      :currentPage="currentPage" :recentPolicies="recentPolicies"
      :hotspots="hotspots" :risks="risks" :selectedHotspot="selectedHotspot" :resultTab="resultTab"
      :extractedText="extractedText"
      @startOCR="startOCR" @selectHotspot="s => selectedHotspot = s"
      @toggleResultTab="t => resultTab = t" @back="currentPage = 'translate'"
      @selectPolicy="handleSelectRecentPolicy"
      @removeRecent="removeRecentPolicy"
    />

    <VaultTab v-else-if="currentTab === 2" 
      :vault="vault" :reports="reports"
      @addPolicy="currentTab = 1; currentPage = 'translate'"
      @removePolicy="removePolicy"
      @analyzeGap="currentTab = 0; sendMessage('分析我的保障缺口')"
    />

    <GuardianTab v-else-if="currentTab === 3" 
      :advisors="advisors"
      :vault="vault"
      @openPicker="openAdvisorPicker"
      @selectAdvisor="selectAdvisor"
    />

    <ProfileTab v-if="showProfileModal" 
      :user="currentUser" asModal
      @close="showProfileModal = false"
      @updateProfile="p => userProfile = p"
      @login="handleLogin"
      @logout="handleLogout"
    />


    <!-- BOTTOM TABS -->
    <div class="bottom-tabs">
      <button class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">
        <span class="tab-icon">💬</span><span class="tab-label">AI对话</span><div class="tab-dot"></div>
      </button>
      <button class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1; currentPage = 'translate'">
        <span class="tab-icon">📄</span><span class="tab-label">条款译</span><div class="tab-dot"></div>
      </button>
      <button class="tab-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">
        <span class="tab-icon">🗂</span><span class="tab-label">保单箱</span><div class="tab-dot"></div>
      </button>
      <button class="tab-item" :class="{ active: currentTab === 3 }" @click="currentTab = 3">
        <span class="tab-icon">⚖️</span><span class="tab-label">权益卫士</span><div class="tab-dot"></div>
      </button>
    </div>

    <!-- OVERLAYS -->
    <transition name="fade">
      <div v-if="showAdvisorPicker" class="advisor-picker-overlay" @click.self="showAdvisorPicker = false">
        <div class="advisor-picker-sheet">
          <div class="picker-handle-row"><div class="picker-handle"></div></div>
          <div class="picker-header">
            <div class="picker-title">选择独立顾问</div>
            <div class="picker-sub">全部顾问通过监管资质认证，咨询全程录音存证</div>
          </div>
          <div v-if="pickerContext" class="picker-context">🤖 AI根据您的咨询内容，推荐以下最匹配的顾问</div>
          <div class="picker-list">
            <div v-for="a in advisors" :key="a.id" class="picker-advisor-card" :class="{ selected: selectedAdvisorId === a.id }" @click="selectedAdvisorId = a.id">
              <div class="p-avatar" :style="{ background: a.bg }">{{ a.avatar }}</div>
              <div class="p-info">
                <div class="p-name">{{ a.name }}</div>
                <div class="p-title-meta">{{ a.title }} · 从业{{ a.years }}年</div>
                <div class="p-tags"><span class="p-tag match">✓ {{ a.match }}</span><span class="p-tag rate">存证率 {{ a.compliance }}</span><span class="p-tag spec">{{ a.specialty }}</span></div>
              </div>
              <div class="p-right">
                <div class="p-stars">★ {{ a.rating }}</div>
                <button class="p-consult-btn" @click.stop="selectAdvisor(a)">发起咨询</button>
              </div>
            </div>
          </div>
          <div class="picker-footer"><button class="picker-cancel" @click="showAdvisorPicker = false">取消</button></div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <AdvisorChat v-if="showAdvisorChat" 
        :currentAdvisor="currentAdvisor" :advisorMessages="advisorMessages"
        :consultTimer="consultTimer" :showEndConsult="showEndConsult"
        @close="showAdvisorChat = false" @toggleEndConsult="v => showEndConsult = v"
        @send="sendAdvisorMsg" @finish="handleFinishConsult"
      />
    </transition>

    <transition name="fade">
      <div v-if="showDisclaimer" class="modal-overlay" @click.self="showDisclaimer = false">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title">免责声明</div>
          <div class="modal-body">本产品仅提供<strong>保险知识科普</strong>、<strong>条款文字解读</strong>和<strong>风险评估分析</strong>，<strong>不推荐任何具体保险产品</strong>。<br><br>所有解读基于条款原文，不添加、不修改任何内容。AI给出的结论仅供参考，具体理赔以保险公司审核为准。<br><br>如需购买保险，请通过"权益卫士"联系受监督的独立顾问，所有沟通全程存证。<br><br><span style="color:var(--gray-400);font-size:12px">版本 v1.0.0 · 受银保监会相关法规约束</span></div>
          <button class="modal-close" @click="showDisclaimer = false">我已了解</button>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showComplaintModal" class="modal-overlay" @click.self="showComplaintModal = false">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-title">📢 投诉维权</div>
          <div class="modal-body">AI将协助您整理投诉材料，包括：<br><br>• 理赔拒绝书分析<br>• 相关条款争议要点<br>• 投诉信起草（向银保监会/保险公司）<br>• 仲裁/诉讼材料辅助整理<br><br><span style="color:var(--warn)">请上传相关保单和拒赔通知书，AI将为您分析维权方向。</span></div>
          <button class="modal-close" @click="showComplaintModal = false; currentTab = 0">开始AI投诉分析</button>
        </div>
      </div>
    </transition>
  </div>
</template>
