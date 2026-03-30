<script setup>
import { ref, computed } from 'vue';
const props = defineProps(['vault', 'reports']);
const emit = defineEmits(['addPolicy', 'analyzeGap', 'removePolicy']);

const filterType = ref('all');

const filteredVault = computed(() => {
  if (filterType.value === 'all') return props.vault || [];
  if (filterType.value === 'health') return (props.vault || []).filter(v => ['health', 'accident'].includes(v.type));
  if (filterType.value === 'life') return (props.vault || []).filter(v => v.type === 'life');
  if (filterType.value === 'car') return (props.vault || []).filter(v => v.type === 'car');
  return props.vault || [];
});

const selectedPolicy = ref(null);
const selectedReport = ref(null);

const viewPolicy = (p) => { selectedPolicy.value = p; };
const closePolicy = () => { selectedPolicy.value = null; };

const viewReport = (r) => { selectedReport.value = r; };
const closeReport = () => { selectedReport.value = null; };

const deletePolicy = (id, e) => { e.stopPropagation(); emit('removePolicy', id); };

const totalPolicies = computed(() => (props.vault || []).length);

const parseAmount = (str) => {
  const match = String(str).match(/(\d+(\.\d+)?)/);
  if (match) {
    if (String(str).includes('万')) return parseFloat(match[1]);
    return parseFloat(match[1]) / 10000;
  }
  return 0;
};

const totalLife = computed(() => {
  return (props.vault || []).filter(v => v.type === 'life').reduce((sum, v) => sum + parseAmount(v.amount), 0);
});

const totalHealth = computed(() => {
  return (props.vault || []).filter(v => v.type === 'health' || v.type === 'accident').reduce((sum, v) => sum + parseAmount(v.amount), 0);
});
</script>

<template>
  <div class="page-header">
    <div class="header-logo">🗂</div>
    <div style="flex:1">
      <div class="header-title">保单箱</div>
      <div class="header-sub">跨平台聚合保单管理</div>
    </div>
    <button class="header-action" @click="emit('addPolicy')">＋</button>
  </div>
  <div class="scroll-area">
    <div class="vault-wrap">
      <div class="vault-header">
        <h2>我的保障总览</h2>
        <p>已聚合 {{ totalPolicies }} 份保单 · 最近实时更新</p>
        <div class="vault-stats">
          <div class="vault-stat">
            <div class="num" style="display:flex;align-items:baseline">
              <span v-if="totalLife > 0">¥</span>{{ totalLife > 0 ? totalLife : '--' }}<span style="font-size:12px;margin-left:2px" v-if="totalLife > 0">万</span>
            </div>
            <div class="lbl">寿险总保额</div>
          </div>
          <div class="vault-stat">
            <div class="num" style="display:flex;align-items:baseline">
              <span v-if="totalHealth > 0">¥</span>{{ totalHealth > 0 ? totalHealth : '--' }}<span style="font-size:12px;margin-left:2px" v-if="totalHealth > 0">万</span>
            </div>
            <div class="lbl">健康/意外保额</div>
          </div>
          <div class="vault-stat">
            <div class="num">{{ totalPolicies }}份</div>
            <div class="lbl">有效保单</div>
          </div>
        </div>
      </div>

      <div class="section-head">
        <h3>保单列表</h3><span @click="emit('addPolicy')">+ 添加保单</span>
      </div>
      
      <!-- Filters -->
      <div style="display:flex;gap:10px;margin-bottom:15px;overflow-x:auto;padding-bottom:5px;" class="hide-scrollbar">
         <div class="filter-chip" :class="{active: filterType==='all'}" @click="filterType='all'">全部分类</div>
         <div class="filter-chip" :class="{active: filterType==='health'}" @click="filterType='health'">健康/重疾</div>
         <div class="filter-chip" :class="{active: filterType==='life'}" @click="filterType='life'">家庭寿险</div>
         <div class="filter-chip" :class="{active: filterType==='car'}" @click="filterType='car'">车险财产</div>
      </div>

      <div v-for="v in filteredVault" :key="v.id" class="vault-card" @click="viewPolicy(v)">
        <div class="vault-card-head">
          <div style="flex:1">
            <div class="vault-card-name">{{ v.name }}</div>
            <div class="vault-card-co">{{ v.company }}</div>
          </div>
          <div class="vault-tag" :class="v.type">{{ v.typeLabel }}</div>
        </div>
        <div class="vault-card-details">
          <div class="vault-detail">保额<span>{{ v.amount }}</span></div>
          <div class="vault-detail">年缴保费<span>{{ v.premium }}</span></div>
          <div class="vault-detail">保障期<span>{{ v.period }}</span></div>
          <div class="vault-detail" style="flex:0"><span style="color:var(--red);cursor:pointer;padding:2px 5px;background:rgba(239,68,68,0.1);border-radius:4px" @click="deletePolicy(v.id, $event)">删除</span></div>
        </div>
      </div>

      <!-- Evidence Reports Section -->
      <div v-if="reports && reports.length > 0">
        <div class="section-head" style="margin-top:25px">
          <h3>我的存证报告</h3>
        </div>
        <div class="reports-list">
          <div v-for="r in reports" :key="r.id" class="report-card" @click="viewReport(r)">
            <div class="report-icon" :style="{background: r.advisorBg}">{{ r.advisorAvatar }}</div>
            <div class="report-info">
              <div class="report-title">{{ r.title }}</div>
              <div class="report-meta">{{ new Date(r.timestamp).toLocaleString() }} · 时长 {{ r.duration }}</div>
            </div>
            <div class="report-arrow">›</div>
          </div>
        </div>
      </div>

      <div style="margin:16px;background:var(--primary-dim);border:1.5px dashed rgba(37,99,235,0.25);border-radius:var(--radius);padding:20px;text-align:center;cursor:pointer" @click="emit('analyzeGap')">
        <div style="font-size:26px;margin-bottom:7px">🔍</div>
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">分析我的保障缺口</div>
        <div style="font-size:13px;color:var(--gray-400)">AI为您生成个性化风险报告</div>
      </div>
    </div>
  </div>

  <!-- Policy View Modal -->
  <div v-if="selectedPolicy" style="position:absolute;inset:0;background:rgba(15,23,42,0.65);z-index:99999;display:flex;flex-direction:column;justify-content:flex-end;backdrop-filter:blur(3px);">
     <div style="background:var(--bg);border-radius:24px 24px 0 0;padding:25px;height:85vh;display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(0,0,0,0.2)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
           <h2 style="font-size:20px;font-weight:700;color:var(--text);">保单详细资料</h2>
           <div style="width:32px;height:32px;background:var(--border);color:var(--text-sub);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700;" @click="closePolicy">✕</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding-bottom:30px;" class="hide-scrollbar">
           <div style="background:white;padding:20px;border-radius:16px;margin-bottom:20px;box-shadow:0 4px 15px rgba(0,0,0,0.03);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                 <div style="font-size:18px;font-weight:700;line-height:1.4">{{ selectedPolicy.name }}</div>
                 <div class="vault-tag" :class="selectedPolicy.type" style="margin-left:10px">{{ selectedPolicy.typeLabel }}</div>
              </div>
              <div style="font-size:13px;color:var(--gray-600);margin-bottom:18px;display:flex;align-items:center;gap:6px">
                 <span>🏛️</span>承保公司：{{ selectedPolicy.company }}
              </div>
              <div style="display:grid;grid-template-columns:1fr 1px 1fr;gap:20px;text-align:center;background:var(--bg);padding:15px;border-radius:12px">
                  <div><div style="font-size:12px;color:var(--gray-600);margin-bottom:6px">主险最高保额</div><div style="font-weight:700;font-size:16px;color:var(--primary)">{{ selectedPolicy.amount }}</div></div>
                  <div style="background:var(--border);"></div>
                  <div><div style="font-size:12px;color:var(--gray-600);margin-bottom:6px">缴费 / 保障期</div><div style="font-weight:700;font-size:16px;color:var(--text)">{{ selectedPolicy.premium }} / {{ selectedPolicy.period }}</div></div>
              </div>
           </div>
           
           <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--gray-600);padding-left:4px">📄 AI转录原文拓本</h3>
           <div style="background:white;padding:20px;border-radius:16px;font-size:13px;line-height:1.8;color:#444;white-space:pre-wrap;box-shadow:0 4px 15px rgba(0,0,0,0.03);">
              {{ selectedPolicy.fullText || '暂无完整的底层扫描件条文，当前保单数据由极简智能引擎提取补全。' }}
           </div>
        </div>
     </div>
  </div>

  <!-- Report View Modal -->
  <div v-if="selectedReport" style="position:absolute;inset:0;background:rgba(15,23,42,0.65);z-index:99999;display:flex;flex-direction:column;justify-content:flex-end;backdrop-filter:blur(3px);">
     <div style="background:white;border-radius:24px 24px 0 0;padding:25px;height:85vh;display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(0,0,0,0.2)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
           <h2 style="font-size:20px;font-weight:700;color:var(--text);">专家存证报告</h2>
           <div style="width:32px;height:32px;background:var(--border);color:var(--text-sub);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700;" @click="closeReport">✕</div>
        </div>
        <div style="flex:1;overflow-y:auto;padding-bottom:30px;" class="hide-scrollbar">
           <div style="text-align:center;margin-bottom:25px">
              <div class="report-icon" :style="{background: selectedReport.advisorBg, width: '60px', height: '60px', fontSize: '30px', margin: '0 auto 10px'}">{{ selectedReport.advisorAvatar }}</div>
              <div style="font-size:18px;font-weight:800">{{ selectedReport.advisor }}</div>
              <div style="font-size:12px;color:var(--gray-400);margin-top:4px">独立保险专家顾问</div>
           </div>

           <div style="background:var(--bg);padding:20px;border-radius:12px;margin-bottom:20px">
              <div style="font-size:12px;color:var(--gray-400);margin-bottom:10px">核心详情</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
                 <div><div style="font-size:11px;color:var(--gray-500)">咨询时长</div><div style="font-weight:700">{{ selectedReport.duration }}</div></div>
                 <div><div style="font-size:11px;color:var(--gray-500)">发生时间</div><div style="font-weight:700">{{ new Date(selectedReport.timestamp).toLocaleDateString() }}</div></div>
              </div>
           </div>

           <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--primary)">📌 专家关键承诺</h3>
           <div v-if="selectedReport.highlights && selectedReport.highlights.length > 0" style="background:#f0f9ff;border:1px solid #bae6fd;padding:15px;border-radius:12px;margin-bottom:20px">
              <div v-for="(h, i) in selectedReport.highlights" :key="i" style="font-size:13px;line-height:1.6;color:#0369a1;margin-bottom:10px">✓ {{ h }}</div>
           </div>
           <div v-else style="color:var(--gray-400);font-size:13px;margin-bottom:20px">本次咨询未标记关键承诺内容。</div>

           <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--text)">📜 存档效力</h3>
           <div style="font-family:monospace;font-size:11px;background:#f8fafc;padding:12px;border-radius:8px;color:var(--gray-500);word-break:break-all">
              DATA_HASH: {{ selectedReport.hash }}<br>
              STATUS: SECURED_AND_SIGNED<br>
              COMPLIANCE: REGA_CERTIFIED_2026
           </div>
        </div>
        <button style="width:100%;padding:16px;background:var(--primary);color:white;border:none;border-radius:14px;font-weight:700;font-size:15px;box-shadow:0 4px 15px rgba(37,99,235,0.2)" @click="closeReport">返回列表</button>
     </div>
  </div>
</template>

<style scoped>
.filter-chip {
  padding: 7px 16px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-600);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.filter-chip.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(37,99,235,0.25);
}
.vault-card {
  cursor: pointer;
  transition: transform 0.2s;
}
.vault-card:active {
  transform: scale(0.98);
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
