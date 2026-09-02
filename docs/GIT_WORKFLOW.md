# Git 워크플로

## 영구 브랜치

- `main`: 배포 브랜치
- `develop`: 개발 통합 브랜치

작업 브랜치는 최신 `develop`에서 생성하고 `feat/*`, `fix/*`, `refactor/*`, `test/*`, `docs/*`, `chore/*` 형식을 사용한다.

## 병합 순서

1. 작업 브랜치에서 구현과 검증을 완료한다.
2. 사용자 승인 후 `develop` 대상 PR을 스쿼시 병합하고 작업 브랜치만 삭제한다.
3. 배포 시 `develop`에서 `main` 대상 PR을 생성하고 검사를 통과한 뒤 병합한다.
4. `develop -> main` 배포 PR에서는 `--delete-branch`를 절대 사용하지 않는다.
5. 병합 직후 원격 `develop` 존재 여부를 확인한다.

실수로 `develop`이 삭제되면 기본 브랜치의 `Permanent branch recovery` 워크플로가 현재 `main`에서 즉시 복원한다.
