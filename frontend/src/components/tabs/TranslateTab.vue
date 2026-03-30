<script setup>
import { ref, computed } from 'vue';
const props = defineProps(['currentPage', 'recentPolicies', 'hotspots', 'risks', 'selectedHotspot', 'resultTab', 'extractedText']);
const emit = defineEmits(['startOCR', 'selectHotspot', 'toggleResultTab', 'back', 'selectPolicy', 'removeRecent']);

const uploadedImageUrls = ref([]);
const uploadedFileType = ref('');
const pendingFiles = ref([]);
const currentImgIndex = ref(0);
const docDisplayMode = ref('image');

const highlightedText = computed(() => {
  if (!props.extractedText) return '';
  let txt = props.extractedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  if (props.hotspots && props.hotspots.length > 0) {
    props.hotspots.forEach(hs => {
      if (hs.original && hs.original.length > 2) {
        const safeOriginal = hs.original.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapeRegExp(safeOriginal), 'g');
        const colorClass = hs.color === 'green' ? 'hs-green' : 'hs-red';
        txt = txt.replace(regex, `<mark class="inline-hs ${colorClass}" data-id="${hs.id}">$&</mark>`);
      }
    });
  }
  return txt.replace(/\n/g, '<br>');
});

const handleTextClick = (e) => {
  const mark = e.target.closest('mark.inline-hs');
  if (mark) {
    const id = mark.getAttribute('data-id');
    const hs = props.hotspots.find(h => h.id == id);
    if (hs) emit('selectHotspot', hs);
    
    // Smooth scroll list to the card
    const el = document.getElementById('hs-card-' + id) || document.getElementById('fs-hs-card-' + id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background-color 0.3s';
      el.style.backgroundColor = 'rgba(37,99,235,0.1)';
      setTimeout(() => el.style.backgroundColor = '', 800);
    }
  }
};

// 处理真实多文件选择和展示上传区
const handleFileUpload = (event) => {
  const files = event.target.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        f.previewUrl = URL.createObjectURL(f);
        pendingFiles.value.push(f);
    }
  }
  // 重置 input，允许重复选中同一个文件测试
  event.target.value = '';
};

const removePendingFile = (index) => {
  pendingFiles.value.splice(index, 1);
};

const submitForOCR = () => {
    if (pendingFiles.value.length === 0) return;
    
    currentImgIndex.value = 0; // Reset carousel index
    uploadedImageUrls.value = pendingFiles.value.map(f => f.previewUrl);
    
    const file = pendingFiles.value[0]; 
    if (file.type && file.type.startsWith('image/')) {
        uploadedFileType.value = 'image';
    } else if (file.type && file.type === 'application/pdf') {
        uploadedFileType.value = 'pdf';
    } else {
        uploadedFileType.value = 'image'; // Fallback for environments lacking strict MIME arrays (fixing the missing picture bug)
    }
    emit('startOCR', pendingFiles.value);
    
    // 清空缓存
    pendingFiles.value = [];
};
</script>

<template>
  <div class="page-header">
    <div class="header-logo">📄</div>
    <div style="flex:1">
      <div class="header-title">条款译</div>
      <div class="header-sub">拍照/上传，AI即时解读</div>
    </div>
  </div>
  <div class="scroll-area">
    <template v-if="currentPage === 'translate'">
      <div class="translate-wrap">
        <div class="upload-hero">
          <div style="font-size:44px">📋</div>
          <h2>上传保险条款</h2>
          <p>AI自动识别关键条款<br>逐条解读，明确告知赔付结论</p>
          <div class="upload-btns" v-if="pendingFiles.length === 0">
            <!-- 增加真实的系统文件上传和摄像头调用 -->
            <label class="upload-btn">
              <input type="file" accept="image/*" capture="camera" style="display: none" @change="handleFileUpload">
              <span class="icon">📷</span><span>拍照上传保单</span>
            </label>
            <label class="upload-btn">
              <input type="file" accept=".pdf,.doc,.docx,image/*" multiple style="display: none" @change="handleFileUpload">
              <span class="icon">📁</span><span>相册多图/文档上传</span>
            </label>
          </div>
          <div v-else class="staging-area">
            <div class="staging-header">已选择 {{ pendingFiles.length }} 份文件</div>
            <div class="staging-grid">
               <div v-for="(f, index) in pendingFiles" :key="index" class="staging-item">
                 <img v-if="f.type.startsWith('image/')" :src="f.previewUrl" class="staging-thumb"/>
                 <div v-else class="staging-doc">📄</div>
                 <div class="staging-del" @click.prevent="removePendingFile(index)">✕</div>
               </div>
               <label class="staging-item add-more">
                 <input type="file" accept=".pdf,.doc,.docx,image/*" multiple style="display: none" @change="handleFileUpload">
                 <span style="font-size:24px;margin-bottom:2px">➕</span>
                 <span style="font-size:10px">继续</span>
               </label>
            </div>
            <button class="staging-submit" @click="submitForOCR">🚀 开始AI联合分析</button>
          </div>
        </div>
        <div class="recent-section">
          <h3>最近解读</h3>
          <div v-for="p in recentPolicies" :key="p.id" class="policy-card" @click="emit('selectPolicy', p)">
            <div class="policy-icon" :class="p.type">{{ p.icon }}</div>
            <div style="flex:1">
              <div class="policy-name">{{ p.name }}</div>
              <div class="policy-date">解读于 {{ p.date }}</div>
            </div>
            <div class="policy-badge" :class="p.status">{{ p.status === 'done' ? '已解读' : '有风险' }}</div>
            <div style="padding-left:10px;display:flex;align-items:center;">
              <span style="color:var(--red);cursor:pointer;padding:4px 8px;background:rgba(239,68,68,0.1);border-radius:6px;font-size:12px;" @click.stop="emit('removeRecent', p.id)">删除</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="currentPage === 'ocr'">
      <div class="ocr-screen">
        <div class="ocr-anim">
          <template v-if="uploadedImageUrls.length > 0">
            <div v-if="uploadedFileType === 'image'" :style="{ backgroundImage: `url(${uploadedImageUrls[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%', borderRadius: '8px', border: '2px solid rgba(37, 99, 235, 0.4)' }">
              <div v-if="uploadedImageUrls.length > 1" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);color:white;padding:2px 8px;border-radius:12px;font-size:11px;">+{{uploadedImageUrls.length - 1}} 张图片</div>
            </div>
            <iframe v-else-if="uploadedFileType === 'pdf'" :src="uploadedImageUrls[0] + '#toolbar=0&navpanes=0&scrollbar=0'" style="width:100%;height:100%;border-radius:8px;border:2px solid rgba(37, 99, 235, 0.4);pointer-events:none;"></iframe>
          </template>
          <div v-else class="ocr-doc"></div>
          <div class="ocr-scan" style="z-index: 10;"></div>
        </div>
        <div class="ocr-title">正在识别保单条款…</div>
        <div class="ocr-sub">AI正在分析关键条款<br>提取理赔相关内容</div>
        <div class="ocr-progress">
          <div class="ocr-progress-bar"></div>
        </div>
      </div>
    </template>
    <template v-else-if="currentPage === 'result'">
      <div>
        <div class="result-doc" style="background:white;border-bottom:1px solid #f1f5f9;padding:0;">
          <!-- 极简文本阅读区 (彻底去除了原图混淆) -->
          <div style="padding:20px;position:relative;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
              <span style="color:var(--text);font-size:15px;font-weight:800;">📝 保单核心条款重构版</span>
            </div>
            
            <div class="doc-text-view" style="max-height:280px;overflow-y:auto;background:#f8fafc;border-radius:12px;padding:15px;font-size:13px;line-height:1.7;color:#334155;border:1px solid #e2e8f0;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);" v-html="highlightedText" @click="handleTextClick"></div>
            
            <!-- 小提示 -->
            <div style="margin-top:10px;font-size:11px;color:var(--gray-400);text-align:right;">*点击上方高亮文字可快速定位到底部解读 ↓</div>
          </div>
        </div>
        <div class="result-panel">
          <div class="result-tabs">
            <div class="result-tab" :class="{ active: resultTab === 0 }" @click="emit('toggleResultTab', 0)">📋 条款解读</div>
            <div class="result-tab" :class="{ active: resultTab === 1 }" @click="emit('toggleResultTab', 1)">⚠️ 避坑报告</div>
          </div>
          <template v-if="resultTab === 0">
            <div style="margin-top:4px;display:flex;flex-direction:column;gap:14px;padding-bottom:20px;">
              <h4 style="font-size:12px;font-weight:700;color:var(--gray-400);margin-bottom:0px;text-transform:uppercase;letter-spacing:.5px">AI 极速拆解 ({{ hotspots ? hotspots.length : 0 }}核心条款)</h4>
              <div class="clause-detail" v-for="hs in hotspots" :key="hs.id" :id="'hs-card-' + hs.id" style="margin:0; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
                <div class="clause-title">{{ hs.name }}</div>
                <div class="clause-verdict-big" :class="hs.color">
                  <span class="verdict-icon">{{ hs.color === 'green' ? '✅' : '❌' }}</span>
                  <div>
                    <div class="verdict-text" :class="hs.color">{{ hs.color === 'green' ? '满足条件可赔付' : '不符合赔付条件' }}</div>
                    <div style="font-size:12px;color:var(--text-sub);margin-top:2px">{{ hs.scenario }}</div>
                  </div>
                </div>
                <div class="clause-body">{{ hs.explanation }}</div>
                <div class="clause-quote">📄 条款原文：{{ hs.original }}</div>
              </div>
            </div>
          </template>
          <template v-if="resultTab === 1">
            <div style="margin-top:4px">
              <h4 style="font-size:12px;font-weight:700;color:var(--gray-400);margin-bottom:9px;text-transform:uppercase;letter-spacing:.5px">核心避坑 TOP 3</h4>
              <div class="risk-item" v-for="r in risks" :key="r.id">
                <div class="risk-num">{{ r.id }}</div>
                <div class="risk-txt">{{ r.text }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
  <div v-if="currentPage !== 'translate'" style="padding:10px 14px;background:white;border-top:1px solid var(--border)">
    <button style="width:100%;padding:11px;background:var(--bg2);border:none;border-radius:10px;font-size:14px;color:var(--primary);cursor:pointer;font-family:inherit;font-weight:500" @click="emit('back')">← 返回上传页</button>
  </div>
</template>

<style scoped>
.staging-area {
  margin-top: 20px;
  background: white;
  padding: 18px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  text-align: left;
}
.staging-header {
  font-size: 14px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 15px;
}
.staging-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.staging-item {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg);
  border-radius: 10px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible;
}
.staging-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}
.staging-doc {
  font-size: 24px;
}
.staging-del {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--red);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 10px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
}
.staging-item.add-more {
  border: 1.5px dashed var(--gray-400);
  cursor: pointer;
  color: var(--gray-600);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}
.staging-submit {
  width: 100%;
  padding: 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(37,99,235,0.2);
}
</style>
