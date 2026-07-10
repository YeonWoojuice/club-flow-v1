# ClubFlow MVP 요구사항

## 목표

동아리 운영진이 학기별 지원자를 직접 등록하고, 지원서를 검토해 합격자를 부원으로 전환할 수 있어야 한다.

## 사용자

- 회장, 부회장, 운영진만 Google 로그인으로 관리 화면에 접근한다.
- 지원자와 부원은 ClubFlow에 로그인하지 않는다.
- club_staffs.status가 APPROVED인 운영진만 동아리 데이터에 접근한다.

## 구현 범위

### 인증과 동아리

- Google 로그인과 사용자 자동 생성
- 동아리 생성
- 생성자에게 PRESIDENT/APPROVED 권한 부여
- 접근 가능한 동아리 목록

### 학기

- 활성 학기 생성
- 학기 목록 조회
- 학기 정보 수정과 종료
- 동아리별 활성 학기 하나 제한

### 지원자

- 이름, 이메일, 연락처, 학번으로 수동 등록
- CSV/XLSX 파일 또는 Google Form 응답 Sheet에서 지원자 데이터 가져오기
- 이메일 소문자 정규화
- 문항별 지원서 답변 저장
- 같은 학기 중복 지원 방지
- 목록과 상세 조회
- 접수, 검토 중, 합격, 불합격, 취소 상태 처리
- 데이터 가져오기 상세 규칙은 [`docs/features/application-import/import_flow.md`](../features/application-import/import_flow.md)를 따른다.

### 부원

- 지원자 합격 시 학기 부원 자동 생성
- 동일 합격 요청에 대한 중복 부원 방지
- 학기별 부원 기록 조회

## 상태 정책

> 이 절이 지원 상태 전이 정책의 원본이다. 강제는 백엔드 `Application.changeStatus()`가 담당하며,
> 프론트엔드의 상태 분기는 UI 편의용 파생이다.

- SUBMITTED에서 REVIEWING으로 변경할 수 있다.
- SUBMITTED 또는 REVIEWING에서 ACCEPTED, REJECTED, CANCELED로 변경할 수 있다.
- ACCEPTED, REJECTED, CANCELED은 MVP의 최종 상태다.
- 같은 최종 상태 재요청은 허용하지만 다른 상태로 변경하지 않는다.

## 보류

- Google Form/Sheet의 주기적 동기화와 자동 가져오기 배치
- 원본 파일 보관, 가져오기 이력, 저장된 필드 매핑 재사용
- 운영진 초대
- 회비, 행사, 활동 관리
- 부원 자동 이월
