# Wort

독일어 명사 뜻과 현재형 동사 활용만 다루는 TOML 기반 암기 MVP입니다.

## 실행

```sh
bun install
bun run dev
```

검증 명령:

```sh
bun run check
bun run build
```

## 현재 포함된 기능

- 독일어 명사 -> 한국어 뜻 추론
- 한국어 뜻 -> 독일어 명사 추론
- 동사 원형 + 대명사 -> 현재형 활용 추론
- 현재형 활용 -> 대명사 추론

실시간 TOML 변경 감시는 넣지 않았습니다. 서버는 data/words.toml 을 읽어 정규화한 뒤 퀴즈 문항을 만듭니다.

## TOML 위치

- data/words.toml

## TOML 예시

```toml
noun."der Apfel".means = ["사과"]
noun."der Apfel".example = ["Ich esse einen Apfel."]

verb.gehen.present.ich = "gehe"
verb.gehen.present.du = "gehst"
verb.gehen.present."er/sie/es" = "geht"
verb.gehen.present.wir = "gehen"
verb.gehen.present.ihr = "geht"
verb.gehen.present."sie/Sie" = "gehen"
verb.gehen.means = ["가다"]
verb.gehen.example = ["Ich gehe heute nach Hause."]
```

## 형식 메모

- 동사는 prompt에 적어준 구조 그대로 현재형 표를 읽습니다.
- 명사는 TOML 제약 때문에 noun.{noun} 를 문자열과 테이블로 동시에 둘 수 없습니다.
- 그래서 MVP는 명사 표제어를 key 로 사용하거나, 필요하면 noun.{id}.word 방식도 함께 허용합니다.
- 현재형 tense key 는 present, prasens, präsens, current 중 하나를 우선 탐색합니다. 하나만 있으면 그 값을 현재형으로 간주합니다.
