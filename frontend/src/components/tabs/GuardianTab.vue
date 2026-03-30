<script setup>
import { ref, computed } from 'vue';
const props = defineProps(['advisors', 'vault']);
const emit = defineEmits(['openPicker', 'selectAdvisor']);

const sortedAdvisors = computed(() => {
  if (!props.vault || props.vault.length === 0) return props.advisors;
  const userTypes = props.vault.map(p => p.typeLabel || '');
  const healthUser = userTypes.some(t => t.includes('重疾') || t.includes('医疗') || t.includes('健康'));
  const lifeUser = userTypes.some(t => t.includes('寿'));

  return [...props.advisors].sort((a, b) => {
    let scoreA = 0; let scoreB = 0;
    if (healthUser && (a.specialty.includes('重疾') || a.specialty.includes('医疗'))) scoreA += 10;
    if (healthUser && (b.specialty.includes('重疾') || b.specialty.includes('医疗'))) scoreB += 10;
    if (lifeUser && a.specialty.includes('寿')) scoreA += 10;
    if (lifeUser && b.specialty.includes('寿')) scoreB += 10;
    return scoreB - scoreA;
  });
});

const viewMode = ref('main');

const hotlines = [
  { name: '中国平安', num: '95511', icon: '🏦' },
  { name: '中国人保', num: '95518', icon: '🛡️' },
  { name: '太平洋保险', num: '95500', icon: '🌊' },
  { name: '友邦保险', num: '95503', icon: '🏠' },
  { name: '泰康保险', num: '95522', icon: '🔋' },
];

const verifyNo = ref('');
const verifying = ref(false);
const verifyResult = ref(null);
const handleVerify = () => {
  if (!verifyNo.value) return;
  verifying.value = true;
  setTimeout(() => {
    verifying.value = false;
    verifyResult.value = verifyNo.value.length >= 8 ? 'success' : 'fail';
  }, 2000);
};

const complaintText = ref('');
const complaintSent = ref(false);
const handleComplaint = () => {
  if (!complaintText.value) return;
  complaintSent.value = true;
  setTimeout(() => {
    complaintSent.value = false;
    complaintText.value = '';
    viewMode.value = 'main';
    alert('诉求已备案并发送至保司合规部。');
  }, 2000);
};
</script>

<template>
  <div class="guardian-tab-root">
    <Transition name="fade" mode="out-in">
      <div v-if="viewMode === 'main'" class="main-screen">
        <div class="page-header">
          <div class="header-logo">⚖️</div>
          <div style="flex:1">
            <div class="header-title">权益卫士</div>
            <div class="header-sub">独立第三方保障监督服务</div>
          </div>
        </div>
        
        <div class="scroll-area">
          <div class="guardian-wrap">
            <!-- 头部 4 大模块： Dashboard 布局 -->
            <div class="hub-grid">
              <div class="hub-card" @click="viewMode = 'claim'">
                <div class="hub-icon claim">📝</div>
                <div class="hub-info">
                  <div class="hub-name">理赔引导</div>
                  <div class="hub-desc">全流程预审协助</div>
                </div>
              </div>
              <div class="hub-card" @click="viewMode = 'verify'">
                <div class="hub-icon verify">�️</div>
                <div class="hub-info">
                  <div class="hub-name">保单验真</div>
                  <div class="hub-desc">官方存证双向比对</div>
                </div>
              </div>
              <div class="hub-card" @click="viewMode = 'hotline'">
                <div class="hub-icon hotline">📞</div>
                <div class="hub-info">
                  <div class="hub-name">保司热线</div>
                  <div class="hub-desc">一键直拨各大官方</div>
                </div>
              </div>
              <div class="hub-card" @click="viewMode = 'complaint'">
                <div class="hub-icon complaint">📢</div>
                <div class="hub-info">
                  <div class="hub-name">维权投诉</div>
                  <div class="hub-desc">直通监察合规部</div>
                </div>
              </div>
            </div>

            <!-- 专家列表 -->
            <div class="advisor-list-wrap">
              <div class="section-title">🕵️ 推荐独立专家</div>
              <div v-for="(a, index) in sortedAdvisors" :key="a.id" class="advisor-card" :class="{ 'best-match': index === 0 && vault?.length > 0 }">
                <div v-if="index === 0 && vault?.length > 0" class="match-ribbon">优选匹配</div>
                <div class="advisor-avatar" :style="{ background: a.bg }">{{ a.avatar }}</div>
                <div style="flex:1">
                  <div class="advisor-top">
                    <div class="advisor-name">{{ a.name }}</div>
                  </div>
                  <div class="advisor-meta">{{ a.title }}</div>
                  <div class="advisor-badges">
                    <span class="badge independent">独立专家</span>
                    <span class="badge">{{ a.specialty }}</span>
                  </div>
                </div>
                <button class="consult-btn" @click="emit('selectAdvisor', a)">咨询</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 子页面：验真 -->
      <div v-else-if="viewMode === 'verify'" class="sub-screen">
        <div class="page-header">
          <button class="back-btn" @click="viewMode = 'main'">←</button>
          <div class="header-title">保单官方验真</div>
        </div>
        <div class="scroll-area padding-20">
          <div class="form-container">
            <div class="form-header">🔍 真伪核实</div>
            <p class="form-instructions">请输入保单号发起双向比对请求。</p>
            <div class="input-field">
              <label>保单编号</label>
              <input v-model="verifyNo" type="text" placeholder="请输入保单号">
            </div>
            <button class="action-btn-main" @click="handleVerify" :disabled="verifying">
              {{ verifying ? '比对中...' : '提交验真' }}
            </button>
          </div>
          <Transition name="slide-up">
            <div v-if="verifyResult" class="verify-feedback" :class="verifyResult">
              <div class="fb-icon">{{ verifyResult === 'success' ? '✅' : '❌' }}</div>
              <div class="fb-text">
                <div class="fb-title">{{ verifyResult === 'success' ? '官方核实：真实有效' : '验证失败' }}</div>
                <div class="fb-desc">目前的权益受国家法律保护。</div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- 子页面：热线 -->
      <div v-else-if="viewMode === 'hotline'" class="sub-screen">
        <div class="page-header">
          <button class="back-btn" @click="viewMode = 'main'">←</button>
          <div class="header-title">保司服务大全</div>
        </div>
        <div class="scroll-area padding-15">
          <div class="hotline-grid">
            <div v-for="h in hotlines" :key="h.num" class="h-item">
              <div class="h-icon">{{ h.icon }}</div>
              <div class="h-info">
                <div class="h-name">{{ h.name }}</div>
                <div class="h-num">{{ h.num }}</div>
              </div>
              <a :href="'tel:' + h.num" class="h-call">直拨</a>
            </div>
          </div>
        </div>
      </div>

      <!-- 子页面：投诉 -->
      <div v-else-if="viewMode === 'complaint'" class="sub-screen">
        <div class="page-header">
          <button class="back-btn" @click="viewMode = 'main'">←</button>
          <div class="header-title">维权投诉</div>
        </div>
        <div class="scroll-area padding-20">
          <div class="form-container">
            <div class="form-header">⚖️ 存证申诉</div>
            <p class="form-instructions">您的诉求将作为平台存证函件直达该保司合规部。</p>
            <textarea v-model="complaintText" placeholder="详细说明..." rows="6"></textarea>
            <button class="action-btn-main" @click="handleComplaint" :disabled="complaintSent">
              提交申诉
            </button>
          </div>
        </div>
      </div>

      <!-- 子页面：理赔引导 -->
      <div v-else-if="viewMode === 'claim'" class="sub-screen">
        <div class="page-header">
          <button class="back-btn" @click="viewMode = 'main'">←</button>
          <div class="header-title">理赔向导</div>
        </div>
        <div class="scroll-area padding-25">
          <div class="claim-roadmap">
            <div class="road-item active">
              <div class="road-blob">01</div>
              <div class="road-txt"><b>拨打报案热线</b><br>第一现场立即拨打保司95xxx进行报案。</div>
            </div>
            <div class="road-item">
              <div class="road-blob">02</div>
              <div class="road-txt"><b>上传AI电子影像</b><br>在保单箱中补充诊疗清单。</div>
            </div>
            <div class="road-item">
              <div class="road-blob">03</div>
              <div class="road-txt"><b>获取最终审核</b><br>保司专家最终核实划款。</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.guardian-tab-root {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #f8fafc;
  overflow: hidden;
}

.main-screen, .sub-screen {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.page-header {
  background: white;
  padding: 25px 25px 15px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0,0,0,0.03);
}

.header-logo {
  width: 45px;
  height: 44px;
  background: #f1f5f9;
  border-radius: 12px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.header-title {
  font-size: 17px;
  font-weight: 800;
  color: #1e293b;
}

.header-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.scroll-area {
  flex: 1;
  overflow-y: auto;
}

.padding-20 { padding: 20px; }
.padding-15 { padding: 15px; }
.padding-25 { padding: 25px; }

/* Dashboard Hub Grid */
.hub-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  padding: 15px;
}

.hub-card {
  background: white;
  padding: 24px 18px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.hub-card:active {
  transform: scale(0.96);
  background: #f8fafc;
}

.hub-icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.hub-icon.claim { background: #f0fdf4; color: #166534; }
.hub-icon.verify { background: #f5f3ff; color: #5b21b6; }
.hub-icon.hotline { background: #eff6ff; color: #1e40af; }
.hub-icon.complaint { background: #fef2f2; color: #991b1b; }

.hub-name {
  font-size: 15px;
  font-weight: 800;
  color: #1e293b;
}

.hub-desc {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

/* Advisor List */
.advisor-list-wrap {
  padding: 0 15px 30px;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: #475569;
  margin: 20px 0 12px;
}

.advisor-card {
  position: relative;
  display: flex;
  padding: 16px;
  background: white;
  border-radius: 16px;
  margin-bottom: 12px;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.01);
}

.advisor-card.best-match {
  border: 1.5px solid #2563eb;
  background: linear-gradient(to right, #ffffff, #f0f7ff);
}

.match-ribbon {
  position: absolute;
  top: 0;
  right: 0;
  background: #2563eb;
  color: white;
  font-size: 9px;
  padding: 2px 8px;
  border-bottom-left-radius: 8px;
  font-weight: 800;
}

.advisor-avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.advisor-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.advisor-meta {
  font-size: 11px;
  color: #64748b;
  margin: 2px 0 4px;
}

.badge {
  font-size: 9px;
  padding: 1px 6px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 4px;
  margin-right: 4px;
  font-weight: 600;
}

.badge.independent {
  background: #fff7ed;
  color: #c2410c;
}

.consult-btn {
  padding: 6px 14px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

/* Form & Helpers */
.back-btn { background: none; border: none; font-size: 22px; margin-right: 12px; cursor: pointer; }
.form-container { background: white; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9; }
.form-header { font-size: 15px; font-weight: 800; margin-bottom: 10px; }
.form-instructions { font-size: 12px; color: #64748b; margin-bottom: 20px; }
.input-field input, textarea { width: 100%; padding: 12px; border: 1.5px solid #f1f5f9; border-radius: 12px; font-size: 14px; margin-bottom: 15px; }
.action-btn-main { width: 100%; padding: 15px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; }

.verify-feedback { margin-top: 20px; padding: 15px; border-radius: 12px; display: flex; gap: 12px; }
.verify-feedback.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.verify-feedback.fail { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }

.hotline-grid { display: flex; flex-direction: column; gap: 10px; }
.h-item { display: flex; align-items: center; background: white; padding: 15px; border-radius: 16px; border: 1px solid #f1f5f9; }
.h-icon { width: 40px; height: 40px; border-radius: 20px; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 12px; }
.h-name { font-weight: 700; font-size: 14px; }
.h-num { color: #2563eb; font-weight: 700; font-size: 15px; }
.h-call { margin-left: auto; padding: 6px 15px; background: #2563eb; color: white; border-radius: 10px; text-decoration: none; font-size: 12px; font-weight: 700; }

.claim-roadmap { position: relative; padding-left: 10px; margin-left: 10px; border-left: 2px dashed #e2e8f0; }
.road-item { position: relative; padding-left: 30px; padding-bottom: 30px; }
.road-blob { position: absolute; left: -19px; width: 18px; height: 18px; background: #1e293b; color: white; border-radius: 9px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.road-txt { font-size: 13px; color: #475569; line-height: 1.5; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active { transition: all 0.3s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(15px); }
</style>
