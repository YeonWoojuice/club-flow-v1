# ClubFlow

동아리 운영진의 반복적인 학기 운영 업무를 체계화하기 위한 
MVP 설계 및 구현 프로젝트

## Why

동아리 운영은 지원서, 합격자 명단, 부원 관리, 회비, 활동 기록이 Google Form, Excel, 카카오톡, 노션 등에 흩어져 관리되는 경우가 많습니다.

ClubFlow는 이 문제를 “학기 중심 운영 워크플로우”로 재구성하여, 운영진이 지원자 모집부터 부원 관리, 회비 관리, 활동 기록까지 하나의 흐름으로 관리할 수 있도록 설계했습니다.

## What I Focused On

- 모호한 동아리 운영 업무를 요구사항으로 구조화
- 사용자 역할과 권한 분리
- 학기 중심 도메인 모델 설계
- MVP 범위 설정
- 향후 회계 자동화, 보고서 출력까지 확장 가능한 구조 설계

## Documentation

### Product Documents

- [Requirements Analysis](./docs/product/requirements.md)
- [Domain Model](./docs/product/domain-model.md)

### Development Rules

- [Backend Rules](./docs/development/backend-rules.md)
- [Frontend Rules](./docs/development/frontend-rules.md)
- [Infra Rules](./docs/development/infra-rules.md)

## Tech Stack

- Backend: Spring Boot
- Database: PostgreSQL
- Frontend: React / Vite
- Infra: Docker, Kubernetes