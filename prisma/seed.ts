import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PROFILE = {
  name: "Backend Engineer",
  role: "Backend Engineer · Distributed Systems",
  bio: "결제·정산·트래픽 폭주 시나리오를 다루는 백엔드 엔지니어. 안정성·관측 가능성·점진적 마이그레이션에 관심.",
  email: "you@example.com",
  github: "github.com/you",
  location: "Seoul, KR",
};

// 본문은 Tiptap이 다루는 HTML 로 저장. 빈 줄은 단락 분리.
const toHTML = (text: string): string =>
  text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

type Seed = {
  title: string;
  year: number;
  desc: string;
  body: string;
  image?: string;
  tags: string[];
  links: { label: string; url: string }[];
};

const SEED_PROJECTS: Seed[] = [
  {
    title: "API Gateway 마이그레이션",
    year: 2025,
    desc: "레거시 모놀리스를 gRPC 기반 마이크로서비스로 점진 전환. 트래픽 미러링으로 무중단.",
    body: toHTML(
      "기존 단일 Rails 모놀리스가 P99 1.4s 이상으로 치솟던 상황에서, 트래픽이 가장 많은 결제·검색 도메인부터 떼어내 gRPC 서비스로 옮겼습니다.\n\nEnvoy를 Edge Gateway로 두고 % 단위 트래픽 시프트와 섀도 트래픽을 동시에 운영해, 응답 비교 기반 회귀를 잡으며 단계적으로 컷오버. 마지막 도메인까지 1년 동안 사용자 영향 0회.\n\n핵심 결정: ① 분산 트레이싱을 마이그레이션의 전제조건으로 둔 것, ② 신/구 양쪽이 같은 컨트랙트(.proto)를 공유하도록 강제한 것.",
    ),
    tags: ["Java", "Spring Boot", "gRPC", "Envoy", "Kubernetes", "Postgres"],
    links: [
      { label: "Case study", url: "#" },
      { label: "GitHub", url: "#" },
    ],
  },
  {
    title: "이벤트 소싱 결제 파이프라인",
    year: 2024,
    desc: "Kafka + Postgres CDC 기반 멱등성 결제 처리. 일 800만 건, 중복 0건.",
    body: toHTML(
      "PG사 응답 누락·재시도 폭주로 인한 중복 결제가 누적되던 상황. 결제 의도(intent)와 결제 결과(receipt)를 별도 이벤트로 분리하고, 각 이벤트에 클라이언트 키 기반의 멱등키를 강제했습니다.\n\nPostgres 트랜잭션 로그를 Debezium으로 꺼내 Kafka로 흘려보내고, 컨슈머는 정확히-한-번 시맨틱으로 다운스트림(정산·알림·세금)을 트리거. 운영 6개월 동안 중복 결제 0건, 평균 결제 처리 시간 320ms → 110ms.",
    ),
    tags: ["Kafka", "Debezium", "Postgres", "Spring Boot"],
    links: [{ label: "Architecture", url: "#" }],
  },
  {
    title: "분산 트레이싱 플랫폼",
    year: 2024,
    desc: "OpenTelemetry 컬렉터 자체 구축. 일 50억 span 처리, 스토리지 비용 64% 절감.",
    body: toHTML(
      "벤더 APM의 비용이 ARR 대비 비대해진 시점, OTel 컬렉터 + Clickhouse 기반 자체 트레이싱 플랫폼을 구축했습니다.\n\nTail-based sampling을 컬렉터 레벨에서 구현해 에러·고지연 트레이스는 100% 보존하고, 정상 트레이스는 1% 다운샘플링. UI는 Grafana Tempo와 자체 검색 인덱스(span name + duration + service 기반 inverted index)를 조합.\n\n결과: 일 50억 span을 안정적으로 인덱싱하면서 월 비용을 기존 벤더 대비 36% 수준으로.",
    ),
    tags: ["OpenTelemetry", "Clickhouse", "Python", "Grafana"],
    links: [{ label: "Talk", url: "#" }],
  },
  {
    title: "실시간 추천 피처 스토어",
    year: 2023,
    desc: "Redis + Flink 기반 sub-100ms 피처 서빙. 학습/서빙 스큐 제로.",
    body: toHTML(
      "추천 모델 학습 시점 피처와 서빙 시점 피처가 어긋나면서 오프라인 메트릭과 라이브 CTR이 4%p 벌어진 상황. 동일한 transform 그래프를 학습 파이프라인(Spark)과 온라인 컨슈머(Flink) 양쪽에서 재사용하도록 피처 정의를 단일 소스(YAML)로 통합했습니다.\n\n온라인 피처는 Redis 클러스터에 압축 저장, 콜드 피처는 S3 Parquet으로 빠짐없이 백필. 서빙 P99 78ms, 학습/서빙 스큐는 reconciliation 잡 기준 0.3% 이하.",
    ),
    tags: ["Flink", "Redis", "Spark", "Python", "Scala"],
    links: [],
  },
  {
    title: "멀티 테넌트 쿼리 엔진",
    year: 2023,
    desc: "행 단위 격리 + 결과 캐시. 대용량 테넌트 응답 P99 200ms.",
    body: toHTML(
      "B2B SaaS의 대시보드 쿼리가 테넌트 데이터 크기에 따라 P99가 6초까지 튀던 문제. Postgres RLS로 행 단위 격리를 강제하고, 쿼리 플랜 캐시 + 결과 캐시 두 단계 캐시 레이어를 자체 구현했습니다.\n\n캐시 키는 SQL AST 정규화 후 hash. 무효화는 테이블 단위 invalidation token으로 처리해 over-invalidation 회피. 톱 1% 대용량 테넌트 기준 P99 6.2s → 0.21s.",
    ),
    tags: ["Postgres", "Java", "Redis"],
    links: [],
  },
  {
    title: "CI/CD 리아키텍처",
    year: 2022,
    desc: "빌드 시간 47분 → 6분. 모노레포 영향 그래프 기반 선택적 빌드.",
    body: toHTML(
      "60+ 서비스 모노레포에서 PR마다 전체 테스트가 도는 구조였고, 그 결과 머지 큐가 평균 3시간 적체. Bazel 기반 빌드 그래프를 분석해 변경된 타깃의 의존성 closure만 빌드/테스트하도록 파이프라인을 다시 짰습니다.\n\n원격 캐시(BuildBuddy) + 빌드 메트릭 대시보드까지 같이 깔아, 회귀 시 어느 PR이 원인이었는지 즉시 추적 가능. PR 사이클 타임 3시간 → 22분.",
    ),
    tags: ["Bazel", "GitHub Actions", "Docker"],
    links: [{ label: "Engineering blog", url: "#" }],
  },
];

async function main() {
  await prisma.profile.upsert({
    where: { id: 1 },
    update: SEED_PROFILE,
    create: { id: 1, ...SEED_PROFILE },
  });

  await prisma.project.deleteMany();
  for (let i = 0; i < SEED_PROJECTS.length; i++) {
    const p = SEED_PROJECTS[i];
    await prisma.project.create({
      data: {
        title: p.title,
        year: p.year,
        desc: p.desc,
        body: p.body,
        image: p.image ?? "",
        tags: p.tags,
        links: p.links,
        position: i,
      },
    });
  }

  console.log(`Seeded profile + ${SEED_PROJECTS.length} projects`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
