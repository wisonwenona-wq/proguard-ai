<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
const props = defineProps(['user', 'asModal']);
const emit = defineEmits(['updateProfile', 'login', 'logout', 'close']);

const authMode = ref('login'); // login, register
const authPhone = ref('');
const authPassword = ref('');
const authName = ref('');
const authError = ref('');

const toastMessage = ref('');
const toastVisible = ref(false);

const profile = ref({
  age: 30,
  gender: 'male',
  jobClass: '1类职业（内勤/办公室）',
  socialSecurity: true,
  city: '北京',
  medicalHistory: '无特殊既往病史'
});

const tempProfile = ref({});
const isEditing = ref(false);
const showAuthModal = ref(false);

const showToast = (msg) => {
  toastMessage.value = msg;
  toastVisible.value = true;
  setTimeout(() => { toastVisible.value = false; }, 2000);
};

onMounted(() => {
  const saved = localStorage.getItem('__proguard_profile');
  if (saved) {
    profile.value = JSON.parse(saved);
  }
  emit('updateProfile', profile.value);
});

const startEdit = () => {
  tempProfile.value = JSON.parse(JSON.stringify(profile.value));
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
};

const saveEdit = () => {
  profile.value = JSON.parse(JSON.stringify(tempProfile.value));
  localStorage.setItem('__proguard_profile', JSON.stringify(profile.value));
  emit('updateProfile', profile.value);
  isEditing.value = false;
  showToast('个人档案已更新');
};

const logout = () => {
    if (confirm('确定要退出登录吗？')) {
        emit('logout');
    }
};

const handleAuth = async () => {
    authError.value = '';
    try {
        const url = authMode.value === 'login' ? '/api/login' : '/api/register';
        const payload = { 
            phone: authPhone.value, 
            password: authPassword.value,
            name: authName.value
        };
        const res = await axios.post(url, payload);
        if (res.data.success) {
            emit('login', res.data.user);
            showAuthModal.value = false;
            showToast(authMode.value === 'login' ? '欢迎回来' : '注册成功');
        }
    } catch (err) {
        authError.value = err.response?.data?.error || '认证失败，请检查网络';
    }
};
</script>

<template>
  <div class="profile-container-root" :class="{ 'as-modal': asModal }">
    <div v-if="asModal" class="modal-backdrop" @click.self="emit('close')"></div>
    
    <div class="screen hub-screen" :class="{ 'modal-sheet': asModal }">
      <button v-if="asModal" class="close-profile-btn" @click="emit('close')">✕</button>
      
      <!-- 顶部个人信息头部 -->
      <div 
        class="profile-hero"
        :class="{ 'visitor': !user }"
        @click="!user && (showAuthModal = true)"
      >
        <div class="user-info-row" style="display:flex; align-items:center; gap:16px;">
          <div class="main-avatar" style="width:64px; height:64px; background:rgba(255,255,255,0.2); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:32px;">
            {{ user ? '👶' : '👤' }}
          </div>
          <div class="user-text-meta">
            <div class="name-status">
              <span class="user-display-name" style="font-size:20px; font-weight:800; color:white;">{{ user ? (user.name || '保险小保贝') : '访客 (点击登录)' }}</span>
            </div>
            <div class="sub-id-line" style="font-size:12px; opacity:0.8; color:white; margin-top:4px;">
              {{ user ? `UID: ${user.id.slice(-6)} · 档案已就位` : '登录后解锁 AI 核赔服务' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 核心计算参数档案 -->
      <div class="overlay-content" style="padding: 20px;">
        <div v-if="!isEditing" class="info-present">
          <div class="info-section">
            <div class="section-top" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
              <h3 style="font-size: 16px; font-weight: 800; color: var(--text);">核心计算参数档案</h3>
              <button v-if="user" class="edit-btn" @click="startEdit" style="background: var(--primary-dim); color: var(--primary); border: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">修改参数</button>
            </div>
            <div class="info-card" style="background: white; border-radius: 20px; padding: 10px 20px; border: 1.5px solid #f1f5f9;">
              <div class="info-li" style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #f8fafc;">
                <span style="font-size:14px; color:var(--gray-600);">实足年龄</span>
                <b style="font-size:14px;">{{ profile.age }} 岁</b>
              </div>
              <div class="info-li" style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #f8fafc;">
                <span style="font-size:14px; color:var(--gray-600);">生理性别</span>
                <b style="font-size:14px;">{{ profile.gender==='male'?'男':'女' }}</b>
              </div>
              <div class="info-li" style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #f8fafc;">
                <span style="font-size:14px; color:var(--gray-600);">常驻城市</span>
                <b style="font-size:14px;">{{ profile.city }}</b>
              </div>
              <div class="info-li" style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #f8fafc;">
                <span style="font-size:14px; color:var(--gray-600);">职业风险</span>
                <b style="font-size:14px;">{{ profile.jobClass }}</b>
              </div>
              <div class="info-li" style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #f8fafc;">
                <span style="font-size:14px; color:var(--gray-600);">当地医保</span>
                <b style="font-size:14px;" :class="{ active: profile.socialSecurity }">{{ profile.socialSecurity?'有医保':'无医保' }}</b>
              </div>
              <div class="info-li column" style="display:flex; flex-direction:column; gap:8px; padding:15px 0;">
                <span style="font-size:14px; color:var(--gray-600);">既往病史说明</span>
                <p style="font-size:13px; color:var(--text); line-height:1.6; margin:0;">{{ profile.medicalHistory }}</p>
              </div>
            </div>
          </div>
          <div class="algo-note" style="margin-top: 20px; background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; padding: 15px; border-radius: 12px; font-size: 12px; line-height: 1.6;">
            💡 AI 会在核赔演算中自动调取此档案作为先决条件。所有个人数据仅存储于本地，受隐私政策保护。
          </div>
        </div>

        <!-- 编辑模式 -->
        <div v-else class="info-form">
          <div class="form-card" style="background: white; padding: 20px; border-radius: 20px; border: 1.5px solid #f1f5f9;">
            <div class="f-group" style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">年龄</label>
              <input type="number" v-model="tempProfile.age" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px;" />
            </div>
            <div class="f-group" style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">性别</label>
              <select v-model="tempProfile.gender" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px;">
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div class="f-group" style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">城市</label>
              <input type="text" v-model="tempProfile.city" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px;" />
            </div>
            <div class="f-group" style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">职业</label>
              <select v-model="tempProfile.jobClass" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px;">
                <option value="1类职业（内勤/办公室）">1类 (办公室)</option>
                <option value="2类职业（外勤/轻微体力）">2类 (外勤)</option>
                <option value="3类职业（一般体力劳动）">3类 (工人)</option>
                <option value="4类及以上（高危职业）">4类 (高危)</option>
              </select>
            </div>
            <div class="f-group" style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">医保</label>
              <select v-model="tempProfile.socialSecurity" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px;">
                <option :value="true">有医保</option>
                <option :value="false">无医保</option>
              </select>
            </div>
            <div class="f-group" style="margin-bottom: 20px;">
              <label style="display:block; font-size:12px; font-weight:700; margin-bottom:6px;">既往史</label>
              <textarea v-model="tempProfile.medicalHistory" rows="3" style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; resize:none;"></textarea>
            </div>
            <div class="f-btns" style="display:flex; gap:12px;">
              <button class="c-btn" @click="cancelEdit" style="flex:1; padding:14px; border-radius:12px; border:1.5px solid #fee2e2; background:white; color:#ef4444; font-weight:700; cursor:pointer;">取消</button>
              <button class="s-btn" @click="saveEdit" style="flex:1; padding:14px; border-radius:12px; background:var(--primary); color:white; border:none; font-weight:700; cursor:pointer;">保存档案</button>
            </div>
          </div>
        </div>

        <!-- 退出/登录按钮 -->
        <button v-if="user" class="quit-btn" @click="logout" style="width:100%; margin-top:20px; padding:16px; border-radius:16px; background:#f8fafc; border:1.5px solid #fee2e2; color:#ef4444; font-weight:800; cursor:pointer;">退出当前登录</button>
        <button v-else class="join-btn" @click="showAuthModal = true" style="width:100%; margin-top:20px; padding:18px; border-radius:16px; background:#2563eb; color:white; border:none; font-weight:800; cursor:pointer; box-shadow:0 8px 25px rgba(37,99,235,0.2);">开启实人认证</button>
      </div>
    </div>

    <!-- 登录注册弹窗 -->
    <transition name="auth-slide">
      <div v-if="showAuthModal && !user" class="auth-mask" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); display:flex; align-items:flex-end; z-index:2000;">
        <div class="auth-sheet" style="width:100%; background:white; border-radius:32px 32px 0 0; padding:40px 25px 50px; position:relative;">
          <button class="close-sheet" @click="showAuthModal = false" style="position:absolute; top:20px; right:20px; width:32px; height:32px; background:#f1f5f9; border:none; border-radius:50%; font-size:20px; color:#94a3b8; cursor:pointer;">×</button>
          <div class="auth-header" style="text-align:center; margin-bottom:30px;">
            <div class="auth-logo" style="font-size:48px; margin-bottom:10px;">🛡️</div>
            <h2 style="font-size:22px; font-weight:900; color:#1e293b;">保全全 AI</h2>
          </div>
          <div class="auth-tabs" style="display:flex; background:#f1f5f9; padding:4px; border-radius:12px; margin-bottom:25px;">
            <button :class="{ active: authMode === 'login' }" @click="authMode = 'login'" style="flex:1; padding:10px; border:none; border-radius:8px; font-weight:700; cursor:pointer; background:transparent; color:#64748b;">登录</button>
            <button :class="{ active: authMode === 'register' }" @click="authMode = 'register'" style="flex:1; padding:10px; border:none; border-radius:8px; font-weight:700; cursor:pointer; background:transparent; color:#64748b;">注册</button>
          </div>
          <div class="auth-form" style="display:flex; flex-direction:column; gap:15px;">
            <div v-if="authMode === 'register'"><input type="text" v-model="authName" placeholder="怎么称呼您？" style="width:100%; padding:15px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:15px;" /></div>
            <div><input type="tel" v-model="authPhone" placeholder="手机号" style="width:100%; padding:15px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:15px;" /></div>
            <div><input type="password" v-model="authPassword" placeholder="密码" style="width:100%; padding:15px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:15px;" /></div>
            <div v-if="authError" style="color:#ef4444; font-size:12px; text-align:center;">{{ authError }}</div>
            <button @click="handleAuth" style="width:100%; padding:16px; border-radius:14px; background:#2563eb; color:white; border:none; font-weight:800; font-size:16px; cursor:pointer; margin-top:10px;">{{ authMode === 'login' ? '登 录' : '注 册' }}</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="toast">
      <div v-if="toastVisible" class="global-toast" style="position:absolute; bottom:50px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.9); color:white; padding:10px 24px; border-radius:50px; font-size:13px; font-weight:700; z-index:99999;">{{ toastMessage }}</div>
    </transition>
  </div>
</template>

<style scoped>
.profile-container-root.as-modal {
  position: absolute;
  inset: 0;
  z-index: 99999;
}
.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
}
.modal-sheet {
  position: absolute;
  bottom: 0;
  width: 100%;
  max-height: 90vh;
  background: #f8fafc;
  border-radius: 30px 30px 0 0;
  overflow-y: auto;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.1);
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.profile-hero {
  padding: 40px 25px 30px;
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  border-radius: 0 0 35px 35px;
}
.profile-hero.visitor {
  background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
}
.auth-tabs button.active {
  background: white !important;
  color: #2563eb !important;
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
}
.active { color: #10b981; }
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
