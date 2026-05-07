# 환경변수 설정 가이드

## .env 파일 생성

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here

# Google Cloud TTS (ElevenLabs 대체)
GOOGLE_APPLICATION_CREDENTIALS=./fluted-torus-459609-v5-b12d3cfb4c7a.json

# Session Configuration
SESSION_SECRET=your_session_secret_here
TEACHER_PASSWORD=your_teacher_password_here

# Database
MONGO_URI=mongodb://localhost:27017/speaking_app

# Server Configuration
PORT=3000
NODE_ENV=development

# Security Settings
COOKIE_SECURE=false
TRUST_PROXY=false
```

## 환경변수 설명

- `OPENAI_API_KEY`: OpenAI API 키 (GPT-4 및 Whisper API 사용)
- `GOOGLE_APPLICATION_CREDENTIALS`: Google Cloud 서비스 계정 키 파일 경로 (TTS 서비스)
- `SESSION_SECRET`: 세션 암호화를 위한 시크릿 키
- `TEACHER_PASSWORD`: 교사 페이지 접근을 위한 비밀번호
- `MONGO_URI`: MongoDB 연결 문자열
- `PORT`: 서버 포트 (기본값: 3000)
- `NODE_ENV`: 환경 설정 (development/production)

## 실행 방법

### 개발 환경
```bash
npm run dev
```

### 프로덕션 환경
```bash
npm run prod
```

### 일반 실행
```bash
npm start
```

## 보안 주의사항

1. `.env` 파일을 절대 Git에 커밋하지 마세요
2. 프로덕션 환경에서는 강력한 `SESSION_SECRET`을 사용하세요
3. API 키는 정기적으로 로테이션하세요
4. `NODE_ENV=production`일 때는 HTTPS를 사용하세요

## TBLT 과업 관리 API

### 과업 생성 및 저장
- **POST /api/save-task**: 교사가 설계한 TBLT 과업을 저장
  - Body: `{taskName, taskGoal, situation, studentRole, aiRole, supportingMaterials, taskOutcome, aiScaffoldingPrompt}`
  - Output: `{sessionId}` - 학생이 접근할 수 있는 세션 ID

### 과업 정보 조회
- **GET /api/task-info/:sessionId**: 세션 ID로 과업 정보 조회
  - 학생 페이지에서 과업 정보를 불러올 때 사용
  - Output: 과업의 모든 정보 (목표, 상황, 역할, 보조자료, 결과물 등)

### AI 제안 생성
- **POST /api/generate-suggestions**: 키워드 기반 과업 아이디어 제안
  - Body: `{keyword, step}` (step: 1=기본정보, 2=역할정의)
  - Output: AI가 생성한 과업 아이디어

## AI 스캐폴딩 시스템

### AI 튜터 응답 생성
- **POST /api/chat**: 학생과의 대화에서 AI 튜터 응답 생성
  - Body: `{message, stage, taskConfig, conversationHistory}`
  - Output: `{textResponse, audioResponse, action}`

### 스캐폴딩 규칙
- **의미 협상 촉진**: 학생의 메시지가 불분명할 때 명확화 요청
- **간접적 언어적 스캐폴딩**: 문법 오류를 직접 교정하지 않고 자연스럽게 재구성
- **어휘/표현 스캐폴딩**: 단순한 단어 사용 시 더 구체적이고 고급 대안 제시
- **힌트 제공**: 답을 주지 않고 옵션이나 유도 질문 제공
- **과업 지향성 유지**: 대화가 과업 목표에서 벗어나지 않도록 안내

## 과업 결과물 시스템

### 결과물 유형
- **체크리스트**: 학생이 완수해야 할 항목들의 목록
- **양식 작성**: 특정 형식에 맞춰 정보를 입력하는 양식

### 결과물 데이터 구조
```json
{
  "type": "checklist" | "form",
  "data": ["항목1", "항목2", ...] | "양식 템플릿 문자열"
}
```

## 로그/CSV 내보내기 시스템

### 턴별 로그 구조
- **session_id**: 세션 식별자
- **turn_id**: 턴 순서 번호
- **ts**: 타임스탬프 (ISO 8601)
- **speaker**: 발화자 (user/ai)
- **text**: 발화 내용
- **taskConfig**: 과업 설정 정보
- **latency_ms**: 응답 지연 시간

### CSV 내보내기 API
- **GET /api/logs/export?sessionId=...**: 세션별 로그를 CSV로 내보내기
- **교사 인증 필요**: `requireTeacherAuth` 미들웨어로 보호
- **자동 파일명**: `session_{sessionId}_logs_{date}.csv`
- **CSV 형식**: UTF-8 인코딩, 쉼표 구분, 텍스트 필드 따옴표 처리

## .gitignore 확인

`.gitignore` 파일에 다음이 포함되어 있는지 확인하세요:
```
.env
.env.local
.env.production
```