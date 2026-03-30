const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const fs = require('fs');
require('dotenv').config();

const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Mock Data
const advisors = [
  { id: 1, type: 'independent', name: '陈静', title: '独立理赔鉴定师 (第三方)', years: 10, rating: 4.9, specialty: '复杂医疗理赔/拒赔申诉', match: '中立立场鉴定', avatar: '👩‍⚕️', bg: 'linear-gradient(135deg,#d1fae5,#6ee7b7)' },
  { id: 2, type: 'independent', name: '赵一鸣', title: '精算级养老策划师', years: 15, rating: 4.8, specialty: '年金险/增额终身寿收益测算', match: '数据模型驱动', avatar: '👨‍🎓', bg: 'linear-gradient(135deg,#e0f2fe,#7dd3fc)' },
  { id: 3, type: 'independent', name: '周雨桐', title: '少儿保障专项研究员', years: 6, rating: 4.7, specialty: '儿童重疾/教育金规划', match: '宝妈群高口碑', avatar: '👩‍🏫', bg: 'linear-gradient(135deg,#fef3c7,#fcd34d)' },
  { id: 4, type: 'independent', name: '林浩然', title: '资深保险律师', years: 11, rating: 4.9, specialty: '合同条款争议/法律维权', match: '法理深度解读', avatar: '👨‍⚖️', bg: 'linear-gradient(135deg,#f1f5f9,#cbd5e1)' },
  { id: 5, type: 'independent', name: '马维家', title: '税优健康险专项顾问', years: 9, rating: 4.6, specialty: '税优/带病体投保核保', match: '高通过率专家', avatar: '👨‍⚕️', bg: 'linear-gradient(135deg,#ffdee9,#b5fffc)' },
];

const getTodayISO = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
};

const history = [
  {
    id: 1,
    preview: '肺炎住院能不能赔？',
    timestamp: getTodayISO(0),
    messages: [
      { id: 1, from: 'user', text: '肺炎住院能不能赔？' },
      { id: 2, from: 'ai', text: '肺炎住院通常可以赔付，但需要满足以下条件：\n\n1. 必须是意外或疾病导致的住院，非自行入院\n2. 等待期已过（一般90天）\n3. 住院天数达到保单约定的最低标准\n\n请问您的保单具体是哪家公司的？' },
    ]
  },
  {
    id: 2,
    preview: '重疾险等待期详解',
    timestamp: getTodayISO(3),
    messages: [
      { id: 1, from: 'user', text: '重疾险等待期是什么意思？' },
      { id: 2, from: 'ai', text: '重疾险等待期（也叫观察期）是指保险合同生效后，一段时间内发生的重大疾病不在理赔范围内。\n\n通常为90-180天，意外导致的重疾不受此限制。' },
    ]
  },
  {
    id: 3,
    preview: '我的保障缺口分析',
    timestamp: getTodayISO(14),
    messages: [
      { id: 1, from: 'user', text: '帮我分析我的保障缺口' },
      { id: 2, from: 'ai', text: '好的，为了分析您的保障缺口，请告诉我您目前已有哪些保险产品？包括重疾险、医疗险、寿险、意外险等。' },
    ]
  },
];


const getTodayString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

const recentPolicies = [
  { id: 1, icon: '🫀', type: 'health', name: '平安重疾险（守护百分百）', date: getTodayString(2), status: 'warn' },
  { id: 2, icon: '🛡', type: 'life', name: '友邦定期寿险', date: getTodayString(12), status: 'done' },
  { id: 3, icon: '🚗', type: 'car', name: '平安车险综合险', date: getTodayString(45), status: 'done' },
];

const hotspots = [
  { id: 1, color: 'green', label: '✓ 重疾赔付', top: '28px', left: '12px', w: '140px', h: '27px', name: '重大疾病赔付条款', scenario: '确诊28种重大疾病即可赔付', explanation: '被保险人在等待期后，首次确诊合同约定重大疾病，保险公司将按约定给付保险金。', original: '第十二条：被保险人在等待期届满后初次罹患本合同所列重大疾病，且存活至确诊日后第28日，本公司按基本保险金额给付重大疾病保险金。' },
  { id: 2, color: 'green', label: '✓ 保障范围', top: '74px', left: '12px', w: '158px', h: '27px', name: '保障责任说明', scenario: '合同约定的保障范围', explanation: '本合同涵盖了合同约定的各项保障责任，旨在为您提供全面的风险抵御能力。', original: '第十八条：本合同保障范围包括合同约定的各项保险责任。' },
  { id: 3, color: 'green', label: '✓ 轻症赔付', top: '118px', left: '10px', w: '128px', h: '27px', name: '轻症赔付条款', scenario: '确诊合同列明轻症疾病', explanation: '确诊合同约定轻症疾病，赔付基本保额的20%，且不影响后续重疾保额。', original: '第十三条：被保险人初次确诊本合同所列轻症疾病，本公司按基本保险金额的20%给付轻症保险金，本合同继续有效。' },
  { id: 4, color: 'green', label: '✓ 等待期说明', top: '162px', left: '10px', w: '148px', h: '27px', name: '等待期条款', scenario: '合同生效后的观察期', explanation: '合同生效后设有等待期，在此期间内，保险公司将根据合同约定处理相关申请。', original: '第九条：本合同等待期为自合同生效之日起180日。' },
];

const risks = [
  { id: 1, text: '等待期180天内确诊重疾不赔——请在健康状况良好时尽早投保，避免等待期风险叠加。' },
  { id: 2, text: '既往症100%除外——投保时务必如实告知既往病史，否则理赔可能被拒并丧失退费权。' },
  { id: 3, text: '重疾定义严格——仅"确诊+存活28天"方可赔付，轻度症状不在赔付范围，需区分轻重症条款。' },
];

const vault = [
  { id: 1, name: '平安守护百分百重疾险', company: '中国平安', type: 'health', typeLabel: '重疾险', amount: '¥50万', premium: '¥8,600/年', period: '至70岁', status: '正常' },
  { id: 2, name: '友邦御享定期寿险', company: '友邦保险', type: 'life', typeLabel: '寿险', amount: '¥150万', premium: '¥3,200/年', period: '至60岁', status: '正常' },
  { id: 3, name: '国寿意外伤害险', company: '中国人寿', type: 'accident', typeLabel: '意外险', amount: '¥100万', premium: '¥680/年', period: '1年期', status: '正常' },
];

const users = { '13800138000': { id: '123', phone: '13800138000', password: '123', name: '保险小保贝' } };
const userHistoryDb = { '123': [...history] };
const userVaultDb = { '123': [...vault] };

const getUserId = (req) => req.headers['x-user-id'] || null;

// API Endpoints
app.post('/api/register', (req, res) => {
  const { phone, password, name } = req.body;
  if (Object.values(users).some(u => u.phone === phone)) return res.status(400).json({ error: '该手机号已注册' });
  const id = String(Date.now());
  users[phone] = { id, phone, password, name: name || '新用户' };
  userHistoryDb[id] = [];
  userVaultDb[id] = [];
  res.json({ success: true, user: users[phone] });
});

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  const user = users[phone];
  if (!user || user.password !== password) return res.status(401).json({ error: '手机号或密码错误' });
  res.json({ success: true, user });
});

app.get('/api/advisors', (req, res) => res.json(advisors));

app.get('/api/history', (req, res) => {
  const uid = getUserId(req);
  if (!uid) return res.json(history);
  res.json(userHistoryDb[uid] || []);
});

app.post('/api/history/save', (req, res) => {
  const uid = getUserId(req);
  const { record, policy } = req.body;
  if (!uid) return res.json({ success: false });
  if (!userHistoryDb[uid]) userHistoryDb[uid] = [];
  if (!userVaultDb[uid]) userVaultDb[uid] = [];
  if (record) userHistoryDb[uid].unshift(record);
  if (policy) userVaultDb[uid].unshift(policy);
  res.json({ success: true });
});

app.get('/api/policies/recent', (req, res) => {
  const uid = getUserId(req);
  if (!uid) return res.json(recentPolicies);
  res.json((userHistoryDb[uid] || []).slice(0, 5));
});

app.get('/api/vault', (req, res) => {
  const uid = getUserId(req);
  if (!uid) return res.json(vault);
  res.json(userVaultDb[uid] || []);
});

app.get('/api/hotspots', (req, res) => res.json(hotspots));
app.get('/api/risks', (req, res) => res.json(risks));

app.delete('/api/history/:id', (req, res) => {
  const uid = getUserId(req);
  const id = req.params.id;
  if (!uid) {
    const idx = history.findIndex(h => h.id == id);
    if (idx !== -1) history.splice(idx, 1);
    return res.json({ success: true });
  }
  if (userHistoryDb[uid]) {
    userHistoryDb[uid] = userHistoryDb[uid].filter(h => h.id != id);
  }
  res.json({ success: true });
});

app.delete('/api/vault/:id', (req, res) => {
  const uid = getUserId(req);
  const id = req.params.id;
  if (!uid) {
    const idx = vault.findIndex(v => v.id == id);
    if (idx !== -1) vault.splice(idx, 1);
    // Also remove from recentPolicies if mock
    const ridx = recentPolicies.findIndex(r => r.id == id);
    if (ridx !== -1) recentPolicies.splice(ridx, 1);
    return res.json({ success: true });
  }
  if (userVaultDb[uid]) {
    userVaultDb[uid] = userVaultDb[uid].filter(v => v.id != id);
  }
  if (userHistoryDb[uid]) {
    userHistoryDb[uid] = userHistoryDb[uid].filter(h => h.id != id);
  }
  res.json({ success: true });
});

app.post('/api/ocr', upload.array('file', 10), async (req, res) => {
  try {
    const systemInstruction = `你是一个专业的保险理赔精算师。请首先判断用户传入的图片或文本是否为有效的保单/保障合同。
如果**明显不是保险条款**（如自拍、风景图、无关网页截图等），请严格返回以下JSON格式：
{
  "is_policy": false,
  "error_msg": "未能识别到有效的保险条款，请上传清晰的保单页面纸质或电子版截图。"
}

如果判断**是保险合同**，请深入分析保单，提取出用户最关心的【关键理赔信息】和【致命免责风险】进行详细解读。
因大模型输出长度限制，严禁逐字抄录长篇大论！必须进行精简的『重构与归纳』！
必须严格返回以下JSON格式（只能是纯JSON字符串，不用加\`\`\`json头）：
{
  "is_policy": true,
  "full_text": "此处不要输出满篇的原文字！请直接输出经过你重新梳理和提炼的【保单核心关键信息解读版】。包含但不限于：投保要求、保障期限、核心保障责任简介、绝对免赔规则等。整体请控制在600字以内，采用极其精简精要、通俗易懂的排版！",
  "meta": {
    "company": "承保的保险公司名称（如：中国平安，若无填'未知'）",
    "typeLabel": "险种通俗分类（如：重疾险、医疗险、寿险、意外险、车险等）",
    "type": "必须且只能是 health, life, accident, car 其中之一的全小写英文！",
    "amount": "主险最高保额（如：100万，带单位，未写明填'未载明'）",
    "premium": "首期/年期保费金额（如：¥5000/年，未写明填'未载明'）",
    "period": "对应的保障期限（如：终身、至70岁、1年等）"
  },
  "hotspots": [
    {
      "id": 1,
      "color": "green",
      "name": "（最多提炼6条最核心的）保障与理赔责任名称",
      "scenario": "例如：确诊可赔付，极简一句话通俗总结",
      "explanation": "详细通俗解释，普通人能看懂该怎样才能拿到钱",
      "original": "原封不动！必须从上方 full_text 中100%原样摘出的重构字句片段（用于前端精确定位锚点高亮）。"
    }
  ],
  "risks": [
    {
      "id": 1,
      "text": "提取该保单最为致命、容易造成拒赔的特定『免责条款/避坑提示』（最多提炼4条！严禁写废话，必须一针见血针对真实保单内容全新生成！）"
    }
  ]
}
注意：hotspots中的 color 只能为 "green" 或 "red"；确保结果严格为符合 RFC标准的 JSON。`;

    let messages = [];
    let modelName = "moonshot-v1-8k";
    let pureTextRaw = "";

    if (req.files && req.files.length > 0) {
      let mixedContent = [
        { type: "text", text: `${systemInstruction}\n\n请精准识别并分析下方附带的保单资料（可能包含文本和多张图片），严格遵循上方输出规范。` }
      ];
      let hasImage = false;
      let allTexts = [];

      for (const file of req.files) {
        if (file.mimetype === 'application/pdf') {
          const dataBuffer = fs.readFileSync(file.path);
          const data = await pdfParse(dataBuffer);
          allTexts.push(data.text || "");
          fs.unlinkSync(file.path);
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.extractRawText({ path: file.path });
          allTexts.push(result.value || "");
          fs.unlinkSync(file.path);
        } else if (file.mimetype === 'application/msword') {
          const extractor = new WordExtractor();
          const extracted = await extractor.extract(file.path);
          allTexts.push(extracted.getBody() || "");
          fs.unlinkSync(file.path);
        } else if (file.mimetype.startsWith('image/')) {
          hasImage = true;
          const bitmap = fs.readFileSync(file.path);
          const base64Image = `data:${file.mimetype};base64,${bitmap.toString('base64')}`;
          mixedContent.push({ type: "image_url", image_url: { url: base64Image } });
          fs.unlinkSync(file.path);
        }
      }

      pureTextRaw = allTexts.join("\n\n");
      if (pureTextRaw.trim().length > 0) {
        mixedContent.push({ type: "text", text: `\n=== 提取到的文档文字如下 ===\n${pureTextRaw.substring(0, 3000)}` });
      }

      if (hasImage) {
        modelName = "moonshot-v1-32k-vision-preview";
        messages.push({ role: "user", content: mixedContent });
      } else {
        modelName = "moonshot-v1-32k";
        let textPrompt = mixedContent[0].text;
        if (pureTextRaw.trim().length > 0) textPrompt += `\n=== 提取到的文档文字如下 ===\n${pureTextRaw.substring(0, 3000)}`;
        messages.push({ role: "user", content: textPrompt });
      }
    } else {
      messages.push({ role: "user", content: "无有效文件上传。" });
    }

    const completion = await openai.chat.completions.create({
      model: modelName,
      temperature: 0.1,
      max_tokens: 8192,
      messages: messages
    });

    const aiContent = completion.choices[0].message.content;

    // 采用更强健的正则抓取JSON片段，防止大模型出现Markdown乱串或废话前缀造成的严重JSON.parse异常
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("AI 原始拒绝回复文案:", aiContent);
      throw new Error("大模型未按要求返回JSON。源回复内容片段为: " + aiContent.substring(0, 150));
    }

    // 预处理：修复可能存在的未转义换行符（Bad Control Character 问题）
    let cleanJson = jsonMatch[0].replace(/"([^"]*)"/g, (m) => m.replace(/\n/g, "\\n"));
    const aiData = JSON.parse(cleanJson);

    if (aiData.is_policy === false) {
      return res.status(400).json({ error: aiData.error_msg || "上传的文件似乎不是保险单哦。" });
    }

    res.json({ ...aiData, extracted_text: aiData.full_text || pureTextRaw });
  } catch (err) {
    let errorMsg = err.message;
    if (err.response && err.response.data) errorMsg += ' - ' + JSON.stringify(err.response.data);
    console.error('OCR 解析出现系统级异常:', errorMsg);
    res.status(500).json({ error: '后端接口异常: ' + errorMsg });
  }
});

app.post('/api/chat', async (req, res) => {
  const { text, context, profile } = req.body;

  // Mock Knowledge Base for specific analysis
  const productKb = {
    '平安福': {
      name: '平安福2023重大疾病保险',
      clauses: [
        { title: '重疾保障', content: '涵盖120种重疾，确诊后一次性给付100%基本保额。需注意确诊后需存活满足28天。' },
        { title: '轻症免除', content: '含40种轻症，每次赔付20%保额，最多6次。确诊后可免除余下各期保费，且不影响重疾保额。' }
      ],
      pitfalls: ['既往症除外责任极其严格', '需区分"首次确诊"与"再次确诊"的理赔门槛']
    },
    '尊享e生': {
      name: '尊享e生2024百万医疗险',
      clauses: [
        { title: '住院医疗', content: '一般医疗保险金300万，特定重疾医疗保险金600万，含质子重离子治疗。' },
        { title: '免赔规则', content: '一般医疗设有1万元免赔额（社保报销部分可冲抵），重疾医疗0免赔。' }
      ],
      pitfalls: ['不保证年年续保，产品停售需转投', '异地就医未用社保结算仅报销60%']
    }
  };

  const brandMapping = {
    '平安': ['平安福', '盛世福', '御享人生', '平安中端医疗'],
    '众安': ['尊享e生', '众安百万医疗', '众安意外险'],
    '人保': ['人保i无忧', '人保寿险', '人保车险', '超越保'],
    '泰康': ['乐享百万', '泰康岁月有约', '泰康惠赢人生'],
    '太平洋': ['金典人生', '太保蓝医保', '太保安享百万']
  };

  const textLower = (text || "").toLowerCase().trim();
  console.log('[DEBUG] Chat Input:', textLower);

  // 1. Brand Match (Highest Priority)
  let matchedBrand = null;
  for (const b in brandMapping) {
    if (textLower.includes(b) && textLower.length < 15) { matchedBrand = b; break; }
  }

  if (matchedBrand) {
    console.log('[DEBUG] Brand Found:', matchedBrand);
    return res.json({ id: Date.now() + 1, from: 'ai', text: `🛡️ 系统查到「${matchedBrand}保险」旗下有多款热门产品。\n\n请问您是指以下哪款？点击按钮即可开启条款深度拆解：`, actions: brandMapping[matchedBrand].map(p => ({ label: p, action: 'scenario', scenario: `解析${p}` })) });
  }

  // 2. Exact KB Match
  let matchedKb = null;
  for (const k in productKb) {
    if (textLower.includes(k.toLowerCase())) { matchedKb = productKb[k]; break; }
  }

  if (matchedKb) {
    const msgText = `🔍 **已精准深度匹配：${matchedKb.name}**\n\n**📄 核心条款拆解：**\n${matchedKb.clauses.map(c => `• **${c.title}**：${c.content}`).join('\n')}\n\n**⚠️ 关键理赔注意点：**\n${matchedKb.pitfalls.map(p => `· ${p}`).join('\n')}\n\n*温馨提示：本分析基于该产品的行业公版条款。若需针对您持有的纸质合同进行【绝对真理级】核赔，请点击下方解析保单图片。*`;
    return res.json({ id: Date.now() + 1, from: 'ai', text: msgText, verdict: 'ok', actions: [{ label: '📷 上传合同图深度还原', action: 'select_policy' }, { label: '🤝 连线官方理赔师', action: 'advisor' }] });
  }

  const isVagueProduct = textLower.length < 5 && /(.+险|.+保)/.test(textLower);



  if (isVagueProduct) {
    return res.json({
      id: Date.now() + 1, from: 'ai', text: `🛡️ 系统测得带「${text}」字样的保险产品共有 30+ 款。\n\n为了给您最精确的条款解析，请问您是指以下哪款热门产品？`, actions: [
        { label: '平安福 (2024重疾)', action: 'scenario', scenario: '解析平安福' },
        { label: '尊享e生 (2024医疗)', action: 'scenario', scenario: '解析尊享e生' },
        { label: '蓝医保 (长期医疗)', action: 'scenario', scenario: '解析蓝医保' }
      ]
    });
  }

  let response = { id: Date.now() + 1, from: 'ai', text: '', verdict: null, clause: null, actions: null };
  try {
    let systemInstruction = `你是一个保全全 AI 🛡️ 保险精算与核赔专家。
你的核心任务是：根据保单内容和用户提供的【意外/疾病事故现场还原】，进行严格的理赔精算测算。

【理赔测算强制规范】：
1. **数学公式化**：严禁只给文字结论！必须分步写出具体的计算推导过程。
   - 医疗费理赔公式：(医疗总额 - 医保已报销 - 免赔额) * 赔付比例 = 预估金额。
   - 伤残理赔公式：保额 * 伤残等级比例 = 预估金额。
2. **金额强加粗**：最终所有计算结果，必须在回答结论中使用粗体显著标出，例如：**预计获赔 ¥125,800.00**。
3. **档案预置**：必须结合下方 profile 中用户的医保情况、过往病史判断赔款是否受限。

请严格通过 JSON 格式回复以下字段：
{
  "text": "回复内容（必须且只能按此逻辑：①事故责任快速定性 ②数学测算公式推导 ③最终获赔金额结论 ④转接官服理赔通道的引导。语气必须极其冷峻、客观、专业！）",
  "verdict": "ok" | "no" | "maybe" | null,
  "clause": "摘录保单中作为测算依据的最关键那一句话（例如保额比例表）。若无具体保单环境，则返回 null。",
  "actions": [{"label": "🤝 转接该保司官方理赔专家核实", "action": "advisor"}] | null
}
直接返回 JSON 字符串，不要 Markdown 标记。

【官服直通指令】：
在给出 AI 预估结果后，必须在 "actions" 数组中附带一个醒目的按钮，帮助他们对接【保险出具公司的官方源头理赔人员】确认最终核实结果。`;

    if (profile && Object.keys(profile).length > 0) {
      systemInstruction += `\n\n【极其重要：这是该用户在APP内预设的个人特征图谱档案】：\n${JSON.stringify(profile, null, 2)}\n（要求：在判断任何就医理赔、能不能买、能赔多少的问题时，必须主动读取此对象内的医保状态、年龄和过往病史变量，视作既定先决条件直接介入数学公式演算和核保判读中！）`;
    }

    if (context && context.trim().length > 0) {
      systemInstruction += `\n\n【真实保单环境，不得胡编乱造】：\n\n《当前保单档案截取》：\n${context.substring(0, 3000)}`;
    } else {
      // Check if text is a product name
      const isProductQuery = text.length < 15 && /(.+险$|.+保$|尊享e生|平安福|金满意足|金玺人生|超级玛丽|达尔文|蓝医保|大黄蜂|无忧人生)/.test(text);
      if (isProductQuery) {
        systemInstruction += `\n\n【检测到用户输入了具体的保险产品名称】：\n用户正在询问关于《${text}》的解析。请直接对该市面主流产品进行『云端画像分析』：\n1. 概括该产品属于什么险种（医疗/重疾/寿险等）。\n2. 阐述其3项核心优势（如等待期短、保证续保等）。\n3. 重点指出2项『理赔潜在扣分项/风险点』（如既往症定义、地区限制等）。\n请由于没有真实合同，回答末尾需声明：『以上分析基于市面同名主流条款，建议上传您的个人保单以获得法律效力对应解析。』`;
      } else {
        systemInstruction += `\n\n【注意：用户目前尚未绑定任何具体的保单。请客气地提示对方上传保单或输入准确参数以便精确计算金额。】`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: "moonshot-v1-8k",
      messages: [
        {
          role: "system",
          content: systemInstruction
        },
        { role: "user", content: text }
      ]
    });

    const aiContent = completion.choices[0].message.content;
    console.log("AI Raw Output:", aiContent);
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      response.text = '大模型回复异常，未找到有效的结构化数据格式。';
    } else {
      // 终极加固：支持物理换行的字符串匹配正则
      let cleanJson = jsonMatch[0].replace(/"(?:[^"\\]|\\.|[\r\n])*"/g, (match) => {
        // 在提取出的字符串内部，将所有非法控制字符进行转义
        // 特别注意：也要转义物理换行符，因为 JSON.parse 不允许字符串内直接换行
        return match.replace(/[\x00-\x1f]/g, (char) => {
          if (char === '\n') return '\\n';
          if (char === '\r') return '\\r';
          if (char === '\t') return '\\t';
          return '';
        });
      });

      try {
        const aiData = JSON.parse(cleanJson);
        response = { ...response, ...aiData };
      } catch (parseErr) {
        console.error("Standard JSON Parse Failed. Transitioning to Manual Extraction Logic.", parseErr);

        // 强力手动提取 fallback (忽略 JSON 语法，直接抓取字段内容)
        // 提取 "text" 字段
        const textMatch = aiContent.match(/"text"\s*:\s*"((?:[^"\\]|\\.|[\r\n])*)"/);
        if (textMatch) {
          // 这里的提取结果可能包含物理换行或转义字符，手动清理
          response.text = textMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/[\x00-\x1f]/g, '');
        } else {
          // 如果连字段都匹配不到，直接使用全文（去掉可能的 JSON 壳）
          response.text = aiContent.replace(/\{[\s\S]*\}/, '').trim() || 'AI 正在全力计算中，请稍微简化提问方式再试。';
        }

        // 尝试提取其他字段（如有）
        const verdictMatch = aiContent.match(/"verdict"\s*:\s*"([^"]*)"/);
        if (verdictMatch) response.verdict = verdictMatch[1];

        const clauseMatch = aiContent.match(/"clause"\s*:\s*"([^"]*)"/);
        if (clauseMatch) response.clause = clauseMatch[1];
      }
    }
  } catch (err) {
    console.error('AI API Error:', err);
    response.text = '保全全AI正在思考中，遇到了一点小问题，请稍后再试... (Error: ' + err.message + ')';
  }

  res.json(response);
});

app.listen(port, () => console.log(`Backend server running at http://localhost:${port}`));
