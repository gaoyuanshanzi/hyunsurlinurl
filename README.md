# hyunsurlinurl

> **URL-in-URL Embedded Web Browser Service**
> 배포 주소: [https://hyunsurlinurl.vercel.app](https://hyunsurlinurl.vercel.app)

## 개요
`hyunsurlinurl`은 웹 브라우저 내에서 또 다른 독립된 웹 브라우저 환경을 제공하는 서비스입니다. 사용자가 입력한 임의의 웹사이트(예: Dropbox)를 중앙의 "작은 화면" 내부에서 안전하게 실행하며, 화면 내부에서 발생하는 링크 이동, 폼 전송, 로그인 등의 모든 네비게이션이 **새 창이나 팝업으로 빠져나가지 않고 오직 해당 화면 내부에서만 연속적으로 전환**되도록 구현되었습니다.

## 주요 기능
- **White Mode UI**: 세련되고 깔끔한 화이트 테마와 여백을 살린 반응형 브라우저-인-브라우저 디자인
- **스마트 프록시 엔진 (`/api/proxy`)**:
  - `X-Frame-Options` 및 `Content-Security-Policy: frame-ancestors` 보안 헤더 자동 해제
  - `target="_blank"` 및 `window.open` 팝업을 가로채어 동일 내부 화면(`_self`)으로 강제 라우팅
  - Frame-Buster 방어 스크립트 내장
  - 쿠키 및 세션 전달 지원으로 로그인 및 동적 기능 지원
- **주소창 실시간 동기화**: 내부 웹사이트에서 페이지가 이동할 때마다 상단 주소창에 현재 URL이 실시간 반영
- **네비게이션 제어**: 뒤로가기, 앞으로가기, 새로고침, 홈 바로가기, 화면 크기(컴팩트/기본/와이드/전체화면) 조절
- **원클릭 프리셋**: Dropbox, Google, Wikipedia, GitHub, HackerNews 등 빠른 테스트 지원

## 기술 스택
- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Icons: Lucide React
- Deployment: Vercel
