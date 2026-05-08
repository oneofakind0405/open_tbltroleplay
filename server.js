// 🔥 1. 가장 먼저 dotenv 로드!
import { config } from 'dotenv';
config();

// 🔥 2. 디버깅
console.log('\n🔍 환경변수 체크:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 
    `✅ ${process.env.GEMINI_API_KEY.substring(0, 8)}...` : 
    '❌ 없음 (브라우저에서 직접 입력 가능)');
console.log('');

// 3. 다른 import들
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import OpenAI from 'openai';
import fs from 'fs';

// 🔥 프롬프트 파일들 import
import * as Step1 from './prompts/step1-overview.js';
import * as Step2 from './prompts/step2-checklist.js';
import * as Step3 from './prompts/step3-materials.js';
import * as Step4 from './prompts/step4-ai-tutor-prompt.js';
import * as AITutor from './prompts/ai-tutor.js';

// 🔥 4. Gemini 초기화 (환경변수는 선택사항 — 교사가 UI에서 키 입력 가능)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
if (!GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY가 설정되지 않았습니다.');
    console.warn('   교사가 teacher.html 상단에서 Gemini API 키를 입력해야 합니다.');
} else {
    console.log('✅ 환경변수 GEMINI_API_KEY 감지됨 (fallback으로 사용)');
}

// Gemini OpenAI 호환 엔드포인트 기본 URL
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

const defaultOpenAI = GEMINI_API_KEY
    ? new OpenAI({ apiKey: GEMINI_API_KEY, baseURL: GEMINI_BASE_URL })
    : null;

// 세션별 API 키 저장소 (교사가 저장 시 학생 채팅에도 활용)
const sessionApiKeys = new Map();

function getOpenAI(req) {
    const clientKey = req?.headers?.['x-api-key'];
    const apiKey = clientKey || GEMINI_API_KEY;
    if (!apiKey) throw new Error('API 키가 없습니다. teacher.html 상단에서 Gemini API 키를 입력하고 저장해주세요.');
    return new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL });
}

async function getGeminiApiKey(req) {
    const headerKey = req?.headers?.['x-api-key'];
    if (headerKey) return headerKey;

    // 학생 페이지: x-session-id 헤더로 저장된 키 조회
    const sid = req?.headers?.['x-session-id'];
    if (sid) {
        const memKey = sessionApiKeys.get(sid);
        if (memKey) return memKey;
        // MongoDB에서 조회
        try {
            const t = isMongoConnected
                ? await Task.findOne({ sessionId: sid }).select('+openaiApiKey').lean()
                : memoryTasks.get(sid);
            if (t?.openaiApiKey) return t.openaiApiKey;
        } catch (_) {}
    }

    return GEMINI_API_KEY || '';
}

// Gemini 네이티브 REST API 헬퍼 (OpenAI SDK 우회)
async function callGemini(apiKey, { model, messages, temperature = 0.7, response_format, max_tokens } = {}) {
    // API 키 공백 제거 (사용자가 복사/붙여넣기 시 공백이 들어갈 수 있음)
    const cleanApiKey = (apiKey || '').trim();
    
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const contents = chatMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
    }));

    const generationConfig = { temperature };
    if (response_format?.type === 'json_object') generationConfig.responseMimeType = 'application/json';
    if (max_tokens) generationConfig.maxOutputTokens = max_tokens;

    const body = { contents, generationConfig };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

    const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!r.ok) {
        const errText = await r.text();
        let errMsg = errText;
        try { errMsg = JSON.parse(errText).error?.message || errText; } catch {}
        const err = new Error(`Gemini HTTP ${r.status}: ${errMsg || '(no body)'}`);
        err.status = r.status;
        throw err;
    }

    const data = await r.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini API가 빈 응답을 반환했습니다.');
    
    // JSON 모드일지라도 Gemini가 종종 ```json ... ``` 형태의 마크다운을 반환하므로 이를 제거합니다.
    text = text.replace(/^```json\n?/gm, '').replace(/^```\n?/gm, '').trim();
    
    return { choices: [{ message: { content: text, role: 'assistant' } }] };
}

console.log('✅ Gemini 설정 완료\n');

// 환경변수 검증 및 설정
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD;
const NODE_ENV = process.env.NODE_ENV || 'development';
if (!SESSION_SECRET) {
  console.warn('⚠️  WARNING: SESSION_SECRET is not set in environment variables');
  console.warn('⚠️  Using default session secret (NOT RECOMMENDED for production)');
}
if (!MONGO_URI) {
  console.warn('⚠️  WARNING: MONGO_URI is not set in environment variables');
}
if (!TEACHER_PASSWORD) {
  console.warn('⚠️  WARNING: TEACHER_PASSWORD is not set in environment variables');
  console.warn('⚠️  Teacher authentication will be disabled');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB 연결 함수
const connectDB = async () => {
  if (!MONGO_URI) {
    console.warn('⚠️ MONGO_URI is not defined in .env file. Using in-memory session storage.');
    return false;
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully!');
    return true;
  } catch (error) {
    console.warn('⚠️ MongoDB connection error:', error.message);
    console.warn('⚠️ Using in-memory session storage instead.');
    return false;
  }
};

// 세션 모델 정의
const SessionSchema = new mongoose.Schema({
  _id: String, // sessionId
  data: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});
export const Session = mongoose.model('Session', SessionSchema);

// 메모리 기반 세션 저장소 (MongoDB 연결 실패 시 사용)
const memorySessions = new Map();
const memoryTasks = new Map();
let isMongoConnected = false;

// Task 모델 정의 - TBLT 과업 설계를 위한 새로운 스키마 (v3.0 - 5단계)
const taskSchema = new mongoose.Schema({
  taskGoal: { type: String, required: true },
  context: { type: String, required: true },
  studentRoleSimple: { type: String, required: true },
  aiRoleSimple: { type: String, required: true },
  checklistItems: [String],
  supportingMaterialsText: String,
  supportingMaterialsImage: String,
  aiGuidelines: {
    selected: [String],
    custom: [String]
  },
  aiTutorSystemPrompt: { type: String, required: true },
  sessionId: { type: String, unique: true, required: true },
  // 🆕 역할 카드 데이터 - 학생에게 전달할 핵심 정보
  roleCard: {
    mission: String,
    youAre: String,
    situation: String,
    importantInfo: [String],
    talkTo: String
  },
  // 🆕 정보 격차 시나리오 데이터 (aiInfo는 학생에게 노출되지 않음)
  taskScenario: {
    studentInfo: [String],
    aiInfo: [String]
  },
  // 교사가 제공한 API 키 (학생 채팅 세션에 활용, 서버리스 환경 대응)
  openaiApiKey: { type: String, select: false }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

// 🆕 역할 카드 생성 함수는 teacher.html로 이동됨
// 이제 서버는 클라이언트에서 생성된 roleCard 데이터를 그대로 저장만 함

// TaskSession 모델 정의 (과업과 세션 연결)
const TaskSessionSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
export const TaskSession = mongoose.model('TaskSession', TaskSessionSchema);

const app = express();

// Multer 설정 - 음성 파일용 (메모리 저장)
const audioUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/') || file.mimetype.includes('webm')) {
            cb(null, true);
        } else {
            cb(new Error('음성 파일만 업로드 가능'), false);
        }
    }
});

// Multer 설정 - 이미지 파일용 (메모리 저장 → base64 반환, Vercel 호환)
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능'), false);
        }
    }
});

// CORS 설정
app.use(cors({
  origin: NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// 보안 헤더 설정
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Vercel이 default-src 'none' 을 기본으로 추가하므로 항상 명시적으로 CSP를 설정
  const csp = [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://generativelanguage.googleapis.com https://vercel.live https://*.vercel.live wss://*.vercel.live" + (NODE_ENV === 'development' ? ' ws: wss:' : ''),
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "font-src 'self' data:"
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});

// JSON 파싱 미들웨어
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 세션별 턴 로그 저장소 (메모리 기반)
const sessionLogs = new Map();

// 로깅 시스템 - 간단한 발화 분석
class SimpleAnalyzer {
  analyzeUtterance(text, context = {}) {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      word_count: words.length,
      sentence_count: sentences.length,
      avg_sentence_length: words.length / sentences.length || 0,
                timestamp: new Date().toISOString()
              };
  }
}

// 교사 인증 미들웨어
const requireTeacherAuth = (req, res, next) => {
  if (!TEACHER_PASSWORD) {
    return next(); // 비밀번호가 설정되지 않은 경우 인증 생략
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: '교사 인증이 필요합니다.' });
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username === 'teacher' && password === TEACHER_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: '잘못된 인증 정보입니다.' });
  }
};

// MongoDB 연결 시도
connectDB().then(connected => {
  isMongoConnected = connected;
});

// 정적 파일 서빙
app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

app.use('/uploads', express.static('uploads'));

// 루트 경로 리다이렉트 (index.html이 삭제되었으므로 teacher.html로 리다이렉트)
app.get('/', (req, res) => {
  res.redirect('/teacher.html');
});

// favicon.ico 요청 처리 (404 오류 방지)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content 응답
});

// 사용 가능한 Gemini 모델 목록 조회 (디버그용)
app.get('/api/list-models', async (req, res) => {
    const apiKey = req.headers['x-api-key'] || GEMINI_API_KEY;
    if (!apiKey) return res.status(401).json({ error: 'x-api-key 헤더가 필요합니다.' });
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await r.json();
    const names = (data.models || []).map(m => m.name);
    res.json({ status: r.status, models: names, raw: data.error || undefined });
});

// 🆕 1단계: 과업 개요 생성 API
app.post('/api/generate-overview', async (req, res) => {
    const { keyword } = req.body;
    
    if (!keyword) {
        return res.status(400).json({ error: '키워드가 필요합니다.' });
    }

    try {
        const apiKey = req?.headers?.['x-api-key'] || GEMINI_API_KEY;
        if (!apiKey) throw Object.assign(new Error('API 키가 없습니다.'), { status: 401 });
        console.log(`[generate-overview] 시작: keyword="${keyword}", key=${apiKey.substring(0, 8)}...`);

        const response = await callGemini(apiKey, {
            model: Step1.config.model,
            messages: [
                { role: "system", content: Step1.systemPrompt },
                { role: "user", content: Step1.generatePrompt(keyword) }
            ],
            response_format: Step1.config.response_format,
            temperature: Step1.config.temperature
        });

        console.log(`[generate-overview] OpenAI 응답 수신 완료`);
        
        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
            throw new Error('OpenAI 응답 형식이 올바르지 않습니다.');
        }

        const content = response.choices[0].message.content;
        console.log(`[generate-overview] 응답 내용 길이: ${content?.length || 0}자`);
        
        let overview;
        try {
            overview = JSON.parse(content);
        } catch (parseError) {
            console.error('[generate-overview] JSON 파싱 오류:', parseError);
            console.error('[generate-overview] 응답 내용:', content?.substring(0, 500));
            throw new Error('OpenAI 응답을 JSON으로 파싱할 수 없습니다.');
        }

        console.log(`[generate-overview] 성공: taskGoal="${overview.taskGoal}"`);
        res.json(overview);

    } catch (error) {
        console.error('[generate-overview] 오류 발생:');
        console.error('  - 에러 타입:', error.constructor.name);
        console.error('  - 에러 메시지:', error.message);
        console.error('  - 스택:', error.stack);
        
        if (error.status) {
            console.error('  - HTTP 상태:', error.status);
            console.error('  - 오류 코드:', error.code);
            console.error('  - 오류 바디:', JSON.stringify(error.error || error.body || '(없음)'));
        }
        
        const statusCode = error.status || 500;
        const geminiMsg = error.error?.error?.message || error.error?.message || error.message || '알 수 없는 오류';
        res.status(statusCode).json({
            error: `Gemini API 오류 (HTTP ${statusCode})`,
            details: geminiMsg,
            type: error.constructor.name
        });
    }
});

// 🆕 2단계: 체크리스트 생성 API
app.post('/api/generate-checklist', async (req, res) => {
    const { taskOverview } = req.body;

    if (!taskOverview) {
        return res.status(400).json({ error: '과업 개요 데이터가 필요합니다.' });
    }

    try {
        const apiKey = req?.headers?.['x-api-key'] || GEMINI_API_KEY;
        if (!apiKey) throw Object.assign(new Error('API 키가 없습니다.'), { status: 401 });
        const response = await callGemini(apiKey, {
            model: Step2.config.model,
            messages: [
                { role: "system", content: Step2.systemPrompt },
                { role: "user", content: Step2.generatePrompt(taskOverview) }
            ],
            response_format: Step2.config.response_format,
            temperature: Step2.config.temperature
        });

        const checklist = JSON.parse(response.choices[0].message.content);
        res.json(checklist);

    } catch (error) {
        console.error('Checklist generation error:', error);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: '체크리스트 생성 중 오류가 발생했습니다.', details: error.message });
    }
});

// 🆕 3단계: 보조 자료 생성 API (복원)
app.post('/api/generate-materials', async (req, res) => {
    const { taskOverview, materialType, studentInfoHints } = req.body;

    if (!taskOverview || !materialType) {
        return res.status(400).json({ error: '과업 개요와 자료 유형이 필요합니다.' });
    }

    try {
        const apiKey = req?.headers?.['x-api-key'] || GEMINI_API_KEY;
        if (!apiKey) throw Object.assign(new Error('API 키가 없습니다.'), { status: 401 });
        const response = await callGemini(apiKey, {
            model: Step3.config.model,
            messages: [
                { role: "system", content: Step3.systemPrompt },
                { role: "user", content: Step3.generatePrompt(taskOverview, materialType, studentInfoHints) }
            ],
            response_format: Step3.config.response_format,
            temperature: Step3.config.temperature
        });

        const materials = JSON.parse(response.choices[0].message.content);
        res.json(materials);

    } catch (error) {
        console.error('Materials generation error:', error);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: '보조 자료 생성 중 오류가 발생했습니다.', details: error.message });
    }
});

// 🆕 4단계: AI 튜터 프롬프트 생성 API (UI shows 4 steps, but this endpoint is kept for backward compatibility)
app.post('/api/generate-ai-tutor-prompt', async (req, res) => {
    try {
        const { taskData } = req.body;
        
        if (!taskData || !taskData.taskGoal) {
            return res.status(400).json({ error: '필수 데이터 누락' });
        }
        
        // AI 호출 없이 템플릿 함수만 호출
        const fullPromptString = Step4.generatePrompt(taskData);
        
        // 기존 형식과 호환되도록 응답
        res.json({ 
            fullPrompt: fullPromptString,
            aiTutorSystemPrompt: fullPromptString // 기존 코드 호환성
        });

  } catch (error) {
        console.error('AI tutor prompt generation error:', error);
        res.status(500).json({ error: 'AI 튜터 프롬프트 생성 중 오류가 발생했습니다.' });
  }
});

// 시나리오 분리 API - 제거됨 (taskScenarioText 요소가 주석 처리되어 호출되지 않음)

// Helper function for fallback scenario generation
function buildFallbackScenario(taskOverview) {
    const { taskGoal, context, studentRoleSimple, aiRoleSimple } = taskOverview;
    return `You are ${studentRoleSimple}. ${context} Your goal is to ${taskGoal}. You need to talk to ${aiRoleSimple} to complete this task.`;
}

// 시나리오 원문 생성 + 분리 API
app.post('/api/generate-scenario-draft', async (req, res) => {
    const { taskOverview, hintText } = req.body;
    
    if (!taskOverview) {
        return res.status(400).json({ error: '과업 개요 데이터가 필요합니다.' });
    }

    try {
        const apiKey = req?.headers?.['x-api-key'] || GEMINI_API_KEY;
        if (!apiKey) throw Object.assign(new Error('API 키가 없습니다.'), { status: 401 });
        const sys = `You compose INFORMATION-GAP role-play scenarios for secondary EFL.
Return ONLY a strict JSON object with keys: scenarioText, studentInfo, aiInfo.
Keep sentences short, classroom-safe, no special symbols.`;

        const user = `
TASK OVERVIEW:
${JSON.stringify(taskOverview)}

HINT TEXT (optional, teacher free text):
${hintText || '(none)'}

WRITE:
1) "scenarioText": 2–5 short sentences describing a concrete situation that naturally requires speaking. Include the student's goal & constraints.
2) "studentInfo": 3–6 bullet strings listing what ONLY the student knows/wants/limits.
3) "aiInfo": 2–4 bullet strings listing secret facts that ONLY the AI role knows (do NOT reveal them proactively during chat).

Constraints:
- Use specific numbers/names when present (e.g., "$15", "14:40", "Gate C").
- Avoid meta-pedagogy; stay in-world.
- English only, plain text.`;

        const response = await callGemini(apiKey, {
            model: Step2.config.model,
            messages: [
                { role: "system", content: sys },
                { role: "user", content: user }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // 안전한 기본값 보장
        const safeResult = {
            scenarioText: result.scenarioText || buildFallbackScenario(taskOverview),
            studentInfo: result.studentInfo || [],
            aiInfo: result.aiInfo || []
        };
        
        res.json(safeResult);

    } catch (error) {
        console.error('Scenario draft generation error:', error);
        // 오류 시 안전한 기본값 반환
        const fallbackScenario = buildFallbackScenario(taskOverview);
        res.status(200).json({ 
            scenarioText: fallbackScenario,
            studentInfo: [],
            aiInfo: []
        });
    }
});

// AI 비밀 정보 생성 API
app.post('/api/generate-ai-info', async (req, res) => {
    const { taskOverview } = req.body;
    if (!taskOverview) {
        return res.status(400).json({ error: '과업 개요 데이터가 필요합니다.' });
    }

    // Validator rules
    const banned = /(offers a variety|is known for|quick service|generally has|prepared quickly)/i;
    const mustHave = /(today|tonight|now|until|by\s*\d|left|slot|waitlist|restock|%|promo|discount|sold out|opens at|closes at|next at|cancellation)/i;

    const isDynamic = (line) => typeof line === 'string' && !banned.test(line) && mustHave.test(line);
    const validateAiInfo = (arr) =>
      Array.isArray(arr) && arr.length >= 2 && arr.length <= 4 && arr.every(isDynamic);

    // Micro system + user prompts (focus on dynamic, situational, staff-only facts)
    const sys = `Return ONLY a strict JSON object.
Focus on dynamic, situational, staff-only facts that create an information gap.
Each line must be short (<=18 words), realistic, and include a number or time/deadline token.`;

    const user = `
Given:
- context: ${JSON.stringify(taskOverview.context)}
- aiRole: ${JSON.stringify(taskOverview.aiRoleSimple)}
- studentInfo: ${JSON.stringify(taskOverview?.taskScenario?.studentInfo || [])}

Produce 2–4 staff-only facts ("aiInfo") that:
- are situational/transactional (NOT catalog/schedule listing),
- each includes a number/time/%/deadline word,
- align to at least one studentInfo item.

Constraints:
- Max 18 words per line.
- At least two lines must include one of:
  today, until, left, slot, waitlist, restock, %, promo, discount, sold out, next at, opens at, closes at, cancellation.
- Forbidden phrases:
  "offers a variety", "is known for", "quick service", "generally has", "prepared quickly".

Return JSON ONLY:
{ "aiInfo": ["...", "..."] }`;

    try {
        const apiKey = req?.headers?.['x-api-key'] || GEMINI_API_KEY;
        if (!apiKey) throw Object.assign(new Error('API 키가 없습니다.'), { status: 401 });
        const response = await callGemini(apiKey, {
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: user }
            ]
        });

        let parsed = {};
        try { parsed = JSON.parse(response.choices?.[0]?.message?.content || '{}'); } catch {}
        let aiInfo = Array.isArray(parsed.aiInfo) ? parsed.aiInfo : [];

        // Validate; if fail → one-shot repair
        if (!validateAiInfo(aiInfo)) {
            const repairUser = `
Rewrite each line in the following aiInfo so that:
- each line is a staff-only, time-bound fact with a number/time/deadline,
- <=18 words,
- avoid: "offers a variety", "is known for", "quick service", "generally has", "prepared quickly".
Keep the original context and studentInfo alignment.
Return JSON ONLY: { "aiInfo": ["..."] }

context: ${JSON.stringify(taskOverview.context)}
aiRole: ${JSON.stringify(taskOverview.aiRoleSimple)}
studentInfo: ${JSON.stringify(taskOverview?.taskScenario?.studentInfo || [])}
current_aiInfo: ${JSON.stringify(aiInfo)}
`;
            const repaired = await callGemini(apiKey, {
                model: 'gemini-2.5-flash',
                temperature: 0.3,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'Return ONLY a valid JSON object with aiInfo array.' },
                    { role: 'user', content: repairUser }
                ]
            });

            try {
                const fixed = JSON.parse(repaired.choices?.[0]?.message?.content || '{}');
                if (validateAiInfo(fixed.aiInfo)) {
                    aiInfo = fixed.aiInfo;
                }
            } catch {}
        }

        // Always return a consistent shape
        return res.json({ aiInfo });

    } catch (error) {
        console.error('AI info generation error:', error);
        // Graceful fallback
        return res.status(200).json({ aiInfo: [] });
    }
});

// 정보 격차 생성 API - 제거됨 (사용되지 않음)

// 과업 저장 API (v3.0 - 5단계)
app.post('/api/save-task', async (req, res) => {
  try {
    const { taskGoal, context, studentRoleSimple, aiRoleSimple, checklistItems, supportingMaterialsText, supportingMaterialsImage, aiGuidelines, aiTutorSystemPrompt, roleCard, taskScenario } = req.body;
    
    if (!taskGoal || !context || !studentRoleSimple || !aiRoleSimple || !aiTutorSystemPrompt) {
      return res.status(400).json({ error: '모든 필수 필드를 입력해주세요.' });
    }
    
    // 고유한 sessionId 생성
    const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // 교사가 제공한 API 키를 세션에 연결 (학생 채팅에 활용)
    const apiKeyFromHeader = req.headers['x-api-key'];
    if (apiKeyFromHeader) {
        sessionApiKeys.set(sessionId, apiKeyFromHeader);
    }
    
    // 🆕 새로운 5단계 데이터 구조로 저장
    const taskData = {
        openaiApiKey: apiKeyFromHeader || undefined,
        taskGoal,
      context,
      studentRoleSimple,
      aiRoleSimple,
      checklistItems: checklistItems || [],
      supportingMaterialsText: supportingMaterialsText || '',
      supportingMaterialsImage: supportingMaterialsImage || '',
      aiGuidelines: aiGuidelines || { selected: [], custom: [] },
      aiTutorSystemPrompt,
      sessionId,
      roleCard: roleCard || {}, // 🆕 클라이언트에서 받은 역할 카드 데이터
      taskScenario: taskScenario || { studentInfo: [], aiInfo: [] } // 🆕 정보 격차 시나리오 (aiInfo는 학생 페이지에 노출 안됨)
    };
    
    let savedTask;
    if (isMongoConnected) {
      const task = new Task(taskData);
      savedTask = await task.save();
    } else {
      // 메모리 저장
      memoryTasks.set(sessionId, taskData);
      savedTask = { ...taskData, _id: sessionId };
    }
    
    res.json({
      message: '과업이 성공적으로 저장되었습니다.',
      sessionId: sessionId,
      taskId: savedTask._id
    });
  } catch (error) {
    console.error('Error saving task:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      isMongoConnected: isMongoConnected,
      taskData: req.body
    });
    res.status(500).json({ 
      error: '과업 저장 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// 과업 정보 조회 API
app.get('/api/task-info/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }
    
    let task;
    if (isMongoConnected) {
      task = await Task.findOne({ sessionId });
    } else {
      task = memoryTasks.get(sessionId);
    }
    
    if (!task) {
      return res.status(404).json({ error: '과업을 찾을 수 없습니다.' });
    }
    
    // 🆕 새로운 5단계 데이터 구조를 학생 페이지가 기대하는 형태로 변환
    // ⚠️ 중요: taskScenario.aiInfo는 절대 학생에게 노출되지 않음 (정보 격차 유지)
    const studentPageData = {
      // 기존 필드들 (역할 카드용)
      taskName: task.taskGoal,
      taskGoal: task.taskGoal,
      situation: task.context,
      studentRole: task.studentRoleSimple,
      aiRole: task.aiRoleSimple,
      
      // 보조 자료
      supportingMaterials: {
        text: task.supportingMaterialsText || '',
        fileUrl: task.supportingMaterialsImage || ''
      },
      
      // 🆕 체크리스트를 taskOutcome 형태로 변환
      taskOutcome: {
        type: 'checklist',
        data: task.checklistItems || []
      },
      
      // AI 튜터 프롬프트
      aiScaffoldingPrompt: task.aiTutorSystemPrompt,
      
      // 역할 카드 데이터
      roleCard: task.roleCard || {}
      // ⚠️ taskScenario는 의도적으로 제외됨 (aiInfo 보호)
    };
    
    res.json(studentPageData);
  } catch (error) {
    console.error('Error fetching task info:', error);
    res.status(500).json({ error: '과업 정보를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 채팅 API
app.post('/api/chat', async (req, res) => {
    const { messages, sessionId } = req.body;

    if (!messages) {
        return res.status(400).json({ error: 'Messages are required.' });
    }

    try {
        // API 키 우선순위: 요청 헤더 → 메모리 Map → MongoDB 태스크 → 환경변수
        const headerKey = req.headers['x-api-key'];
        const sessionKey = sessionId ? sessionApiKeys.get(sessionId) : null;
        let dbKey = null;
        if (!headerKey && !sessionKey && sessionId) {
            try {
                const t = isMongoConnected
                    ? await Task.findOne({ sessionId }).select('+openaiApiKey').lean()
                    : memoryTasks.get(sessionId);
                dbKey = t?.openaiApiKey || null;
            } catch (_) {}
        }
        const apiKey = headerKey || sessionKey || dbKey || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(401).json({ error: 'API 키가 없습니다. 교사가 과업을 다시 저장해주세요.' });
        }

        const response = await callGemini(apiKey, {
            model: AITutor.config.model,
            messages: messages,
            temperature: AITutor.config.temperature
        });

        const aiResponse = response.choices[0].message.content;
        res.json({ message: aiResponse });

    } catch (error) {
        console.error('Error in chat API:', error);
        res.status(500).json({ error: '채팅 처리 중 오류가 발생했습니다.' });
    }
});

// ===============================================
// 🤖 AI 튜터 (개발자 테스트용)
// ===============================================
app.post('/api/dev-chat', async (req, res) => {
    try {
        const { systemPrompt, conversationHistory, message } = req.body;

        // 1. (가장 큰 차이) DB에서 프롬프트를 가져오는 대신,
        // 클라이언트가 보낸 systemPrompt를 그대로 사용합니다.
        if (!systemPrompt) {
            return res.status(400).json({ error: 'System prompt is required.' });
        }

        // 2. 대화 기록 구성
        let messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        // 3. Gemini 네이티브 API 호출
        const apiKey = req?.headers?.['x-api-key'] || GEMINI_API_KEY;
        if (!apiKey) return res.status(401).json({ error: 'API 키가 없습니다.' });
        const completion = await callGemini(apiKey, {
            model: AITutor.config.model,
            temperature: AITutor.config.temperature,
            max_tokens: AITutor.config.max_tokens,
            messages: messages
        });

        const aiResponseText = completion.choices[0].message.content;
        res.json({ message: aiResponseText }); // 기존 /api/chat과 동일한 응답 형식

    } catch (error) {
        console.error('AI 튜터 (Dev Chat) 오류:', error);
        res.status(500).json({ error: 'AI 튜터 응답 생성에 실패했습니다.' });
    }
});

// 로그 내보내기 API
app.get('/api/logs/export', requireTeacherAuth, (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }
  
  const logs = sessionLogs.get(sessionId) || [];
  
  if (logs.length === 0) {
    return res.status(404).json({ error: 'No logs found for this session.' });
  }
  
  // CSV 형식으로 변환
  const csvHeader = 'timestamp,user,ai,stage\n';
  const csvRows = logs.map(log => 
    `"${log.timestamp}","${log.user}","${log.ai}","${log.stage}"`
  ).join('\n');
  
  const csvContent = csvHeader + csvRows;
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="session_${sessionId}_logs_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csvContent);
});

// PCM → WAV 변환 헬퍼 (Gemini TTS는 raw PCM을 반환하므로 브라우저 재생을 위해 WAV로 변환)
function pcmToWav(pcmBuffer, sampleRate = 24000) {
    const dataLength = pcmBuffer.length;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);  // PCM
    header.writeUInt16LE(1, 22);  // mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    return Buffer.concat([header, pcmBuffer]);
}

// Gemini TTS API 엔드포인트 (음성 재생)
app.post('/api/proxy-elevenlabs', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required.' });

    const apiKey = await getGeminiApiKey(req);
    if (!apiKey) return res.status(401).json({ error: 'API 키가 없습니다.' });

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: 'Aoede' }
                            }
                        }
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `Gemini TTS error: ${response.status}`);
        }

        const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!part?.data) throw new Error('Gemini TTS: 오디오 데이터 없음');

        let audioBuffer = Buffer.from(part.data, 'base64');
        let mimeType = part.mimeType || 'audio/wav';

        // Gemini TTS는 raw PCM(audio/pcm)을 반환 → WAV로 변환해야 브라우저 재생 가능
        if (mimeType.startsWith('audio/pcm') || mimeType.startsWith('audio/L16')) {
            const rateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
            audioBuffer = pcmToWav(audioBuffer, sampleRate);
            mimeType = 'audio/wav';
        }

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'no-cache');
        res.send(audioBuffer);

    } catch (error) {
        console.error('Gemini TTS error:', error);
        res.status(500).json({ error: 'TTS 생성 중 오류가 발생했습니다.', details: error.message });
    }
});


// Gemini STT 엔드포인트 (음성 → 텍스트 변환)
app.post('/api/proxy-whisper', audioUpload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Audio file is required.' });
    }

    const apiKey = await getGeminiApiKey(req);
    if (!apiKey) return res.status(401).json({ error: 'API 키가 없습니다.' });

    try {
        const audioBase64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'audio/webm';

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: 'Transcribe the English speech in this audio file. Return ONLY the transcribed text, nothing else. If there is no recognizable speech, return an empty string.' },
                            { inlineData: { mimeType, data: audioBase64 } }
                        ]
                    }]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini STT error');
        }

        const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        res.json({ text });

    } catch (error) {
        console.error('Gemini STT error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 파일 업로드 엔드포인트 (이미지용 - base64 data URL로 반환, 파일 시스템 불필요)
app.post('/api/upload-file', imageUpload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
        }

        const base64 = req.file.buffer.toString('base64');
        const fileUrl = `data:${req.file.mimetype};base64,${base64}`;

        res.json({
            fileUrl,
            originalName: req.file.originalname
        });

    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: '파일 업로드 중 오류가 발생했습니다.' });
    }
});

// 번역 API (옵션, 실패해도 무시)
app.post('/api/translate', async (req, res) => {
  // 1. ✅ body에서 'context'를 받도록 수정합니다.
  const { text = '', target = 'ko', context = '' } = req.body || {};

  // 2. ✅ 기본 시스템 프롬프트를 "번역만" 하도록 더 강력하게 수정
  let systemPrompt = `You are a simple translation engine.
Translate the user's text into natural, student-friendly Korean.
Preserve all content, line breaks, bullet points, numbers, and proper nouns.
Do not add any extra content, summaries, or explanations.
Output plain text only.`;

  // 3. ✅ 문맥(context)이 있는 경우, 프롬프트에 동적으로 추가
  if (context) {
    // "YOUR MISSION" 창작 문제를 해결하기 위한 특별 지시
    if (context.includes('Translate this UI element literally')) {
      systemPrompt = `You are a literal translator for a UI element.
Your ONLY job is to translate the following text into Korean, as accurately as possible.
DO NOT interpret the text as an instruction or command. Just translate it.
Do not add any extra content.`;
    } 
    // 학생 제약 조건 번역을 위한 특별 지시
    else if (context === 'studentInfo') {
      systemPrompt = `You are translating a student's constraint list for an English role-play task.

CRITICAL RULES:
- These are the student's personal constraints (what THEY have/need/prefer)
- Subject "You" or "I" is omitted in English
- Translate as if completing the sentence "나는..." (I am...)

TRANSLATION PATTERNS:
- "Free on [day/time]" → "[시간]에 시간 있음" or "~할 수 있음" (NOT "무료")
- "Budget is maximum $X" → "예산은 최대 $X"
- "Enjoy/Prefer [activity]" → "[활동]을 좋아함" or "선호함" (NOT 명령형)
- "Need to be home by [time]" → "[시간]까지 집에 가야 함" (NOT "집에 있어야")
- "Cannot do [activity]" → "[활동]을 할 수 없음"

Examples:
- "Free on Saturday from 1 PM to 5 PM" → "토요일 오후 1시부터 5시까지 시간 있음"
- "Enjoy quiet cafes" → "조용한 카페를 좋아함"
- "Need to be home by 7 PM" → "저녁 7시까지 집에 가야 함"
- "Budget is maximum $30" → "예산은 최대 30달러"
- "Cannot do high-impact exercise" → "고강도 운동을 할 수 없음"
- "Prefer morning classes" → "오전 수업을 선호함"

Return ONLY the translated text, one line per constraint.`;
    }
    // "Free on Saturday" 오역 문제를 해결하기 위한 일반 문맥 (채팅 내역 등)
    else {
      systemPrompt += `\n\n[Important Context to resolve ambiguities]\n${context}`;
    }
  }

  try {
    const apiKey = await getGeminiApiKey(req);
    if (!apiKey) return res.json({ translated: text, translation: text });
    const response = await callGemini(apiKey, {
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Translate this text (Target=${target}):\n\n${text}` }
      ]
    });
    const out = response.choices?.[0]?.message?.content?.trim() || text;
    res.json({ translated: out, translation: out });
  } catch (err) {
    console.error('translate error', err);
    res.json({ translated: text, translation: text });
  }
});

// 과업 결과 저장 API
app.post('/api/save-result', async (req, res) => {
    try {
        const resultData = req.body;
        
        const filename = `result_${resultData.sessionId}_${Date.now()}.docx`;

        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // 제목
                    new Paragraph({
                        text: `Task Result – ${resultData.sessionId || 'Unknown Session'}`,
                        heading: HeadingLevel.TITLE,
                    }),
                    
                    // Task Overview 섹션
                    new Paragraph({
                        text: "Task Overview",
                        heading: HeadingLevel.HEADING_1,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Task Goal: ", bold: true }),
                            new TextRun({ text: resultData.roleCard?.taskGoal || 'Not specified' })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Context: ", bold: true }),
                            new TextRun({ text: resultData.roleCard?.context || 'Not specified' })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Student Role: ", bold: true }),
                            new TextRun({ text: resultData.roleCard?.studentRole || 'Not specified' })
                        ]
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "AI Role: ", bold: true }),
                            new TextRun({ text: resultData.roleCard?.aiRole || 'Not specified' })
                        ]
                    }),
                    
                    // Checklist 섹션
                    new Paragraph({
                        text: "Checklist",
                        heading: HeadingLevel.HEADING_1,
                    }),
                    ...(resultData.checklist || []).map(item => 
                        new Paragraph({
                            children: [
                                new TextRun({ text: item.completed ? "☑ " : "☐ " }),
                                new TextRun({ text: item.item || 'Unknown item' })
                            ]
                        })
                    ),
                    
                    // Conversation Log 섹션
                    new Paragraph({
                        text: "Conversation Log",
                        heading: HeadingLevel.HEADING_1,
                    }),
                    ...(resultData.conversation || []).map(msg => 
                        new Paragraph({
                            children: [
                                new TextRun({ 
                                    text: `[${new Date(msg.timestamp).toLocaleString()}] ${msg.sender}: `, 
                                    bold: true 
                                }),
                                new TextRun({ text: msg.message || 'No message' })
                            ]
                        })
                    ),
                    
                    // Materials Summary 섹션
                    new Paragraph({
                        text: "Materials Summary",
                        heading: HeadingLevel.HEADING_1,
                    }),
                    new Paragraph({
                        text: resultData.roleCard?.supportingMaterials || 'No supporting materials used'
                    }),
                    
                    // Completion Rate 섹션
                    new Paragraph({
                        text: "Completion Rate",
                        heading: HeadingLevel.HEADING_1,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Completion Rate: ", bold: true }),
                            new TextRun({ text: `${resultData.completionRate || 0}%` })
                        ]
                    }),
                    
                    // 저장 시간
                    new Paragraph({
                        text: `\nSaved at: ${new Date(resultData.savedAt).toLocaleString()}`,
                        heading: HeadingLevel.HEADING_2,
                    })
                ]
            }]
        });
        
        // Word 문서를 버퍼로 변환해 직접 다운로드 (파일 시스템 불필요)
        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
        
    } catch (error) {
        console.error('결과 저장 오류:', error);
        res.status(500).json({ error: '결과 저장에 실패했습니다.' });
    }
});

// 서버 시작 (Vercel 서버리스 환경에서는 listen 불필요)
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 TBLT Speaking Web App v3.0`);
    console.log(`🌐 Access the app at: http://localhost:${PORT}`);
  });
}

export default app; 