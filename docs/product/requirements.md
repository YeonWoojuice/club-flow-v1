# CrewCat MVP 요구사항

## 목표

동아리 운영진이 학기별 지원자를 직접 등록하고, 지원서를 검토해 합격자를 부원으로 전환할 수 있어야 한다.

## 사용자

- 회장, 부회장, 운영진만 Google 로그인으로 관리 화면에 접근한다.
- 지원자와 부원은 CrewCat에 로그인하지 않는다.
- club_staffs.status가 APPROVED인 운영진만 동아리 데이터에 접근한다.

## 구현 범위

### 인증과 동아리

- Google 로그인과 사용자 자동 생성
- 동아리 생성
- 생성자에게 PRESIDENT/APPROVED 권한 부여
- 접근 가능한 동아리 목록
- 회장이 Google 이메일로 부회장·운영진 초대
- 초대받은 사용자의 초대 수락·거절
- 회장의 운영진 역할 변경·접근 권한 해제
- 같은 동아리·이메일의 대기 초대 중복 방지
- 운영진 관리 상세 규칙은 [`docs/features/staff-management/staff_flow.md`](../features/staff-management/staff_flow.md)를 따른다.

### 학기

- 활성 학기 생성
- 학기 목록 조회
- 학기 정보 수정과 종료
- 종료 학기 재활성화와 기존 활성 학기의 안전한 자동 종료
- 동아리별 활성 학기 하나 제한

### 지원자

- 이름, 이메일, 연락처, 학번과 선택 디스코드 이름으로 수동 등록
- Google Form 응답 Sheet 또는 일반 Google Sheet에서 지원자 데이터 가져오기
- 이메일 소문자 정규화
- 문항별 지원서 답변 저장
- 같은 학기 중복 지원 방지
- 목록과 상세 조회
- 접수, 검토 중, 합격, 불합격, 취소 상태 처리
- 선택한 학기의 합격자와 불합격자에게 각각 결과 메일 일괄 전송
- 동아리 이름, 지원자 이름, 디스코드 이름, 카카오톡 링크를 메일 템플릿 변수로 사용
- 전송 완료·전송 중·실패·결과 확인 필요 상태를 지원 결과와 분리해 기록
- 이미 전송했거나 전송 결과를 확인할 수 없는 지원자는 중복 전송 대상에서 제외
- 이전 전송 실패 건은 운영진이 같은 화면에서 다시 시도
- 데이터 가져오기 상세 규칙은 [`docs/features/application-import/import_flow.md`](../features/application-import/import_flow.md)를 따른다.
- 결과 메일 상세 규칙은 [`docs/features/application-result-email/email_flow.md`](../features/application-result-email/email_flow.md)를 따른다.

### 부원

- 지원자 합격 시 학기 부원 자동 생성
- 동일 합격 요청에 대한 중복 부원 방지
- 학기별 부원 기록 조회
- 선택한 학기의 부원만 조회
- 회계 담당 운영진이 부원별 회비 상태를 확인 필요·미납·납부·면제로 기록
- 회비 상태의 마지막 변경자와 변경 시간 확인
- 부원 상태를 활동 중·비활동·탈퇴로 변경
- 부원 상태 변경 사유·변경자·변경 시간 이력 조회
- 종료된 이전 학기의 잔류 부원을 활성 새 학기로 이월
- 표 파일(CSV·엑셀), Google Form 응답 Sheet, 일반 Google Sheet에서 이월 대상 확인
- 이메일을 기준으로 원본 안의 중복과 새 학기에 이미 존재하는 부원 방지
- 이월 확정 전에 행별 판정과 제외 사유 미리보기
- 잔류 부원 이월 상세 규칙은 [`docs/features/member-retention/retention_flow.md`](../features/member-retention/retention_flow.md)를 따른다.
- 부원 상태 변경 상세 규칙은 [`docs/features/member-status/status_flow.md`](../features/member-status/status_flow.md)를 따른다.

## 상태 정책

> 이 절이 지원 상태 전이 정책의 원본이다. 강제는 백엔드 `Application.changeStatus()`가 담당하며,
> 프론트엔드의 상태 분기는 UI 편의용 파생이다.

- SUBMITTED에서 REVIEWING으로 변경할 수 있다.
- SUBMITTED 또는 REVIEWING에서 ACCEPTED, REJECTED, CANCELED로 변경할 수 있다.
- ACCEPTED, REJECTED, CANCELED은 MVP의 최종 상태다.
- 같은 최종 상태 재요청은 허용하지만 다른 상태로 변경하지 않는다.

## 보류

- Google Form/Sheet의 주기적 동기화와 자동 가져오기 배치
- 표 파일(CSV·엑셀)을 이용한 지원자 가져오기
- 원본 파일 보관과 가져오기 실행 이력
- 회비 금액·분할 납부·환불, 행사, 활동 관리
- Google Sheet 주기 동기화와 자동 이월
- 메일 열람·반송·수신함 도착 여부를 받는 제공자 웹훅
- 예약 발송과 백그라운드 작업 큐
