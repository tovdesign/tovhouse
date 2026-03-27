// Airtable 포트폴리오 description 업데이트 스크립트
const https = require("https");

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

function airtableRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.airtable.com",
      path: `/v0/${BASE_ID}/${path}`,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// title에서 정보 파싱
function parseTitle(title) {
  // 평수 추출
  let pyeong = null;
  const pyMatch = title.match(/(\d+)\s*평/);
  if (pyMatch) pyeong = parseInt(pyMatch[1]);

  // 건물유형 추출
  let buildingType = "공간";
  const types = [
    "단독주택",
    "다세대주택",
    "주택",
    "아파트",
    "빌라",
    "상가",
    "공장",
    "오피스텔",
  ];
  for (const t of types) {
    if (title.includes(t)) {
      buildingType = t;
      break;
    }
  }

  // 지역 추출 - 시/구/동 까지
  let region = "";
  // 패턴1: "서울 XX구 XX동" 또는 "서울시 XX구"
  const regionPatterns = [
    /^(서울특별시\s+\S+구\s+\S+동)/,
    /^(서울시\s+\S+구)/,
    /^(서울\s+\S+구\s+\S+동)/,
    /^(서울\s+\S+구)/,
    /^(인천\s+\S+구\s+\S+동)/,
    /^(인천\s+\S+구)/,
    /^(경기도\s+\S+시\s+\S+구\s+\S+[동면읍리])/,
    /^(경기도\s+\S+시\s+\S+구)/,
    /^(경기도\s+\S+시\s+\S+[동면읍리])/,
    /^(경기도\s+\S+시)/,
    /^(경기도\s+\S+군\s+\S+[동면읍리]\s+\S+리)/,
    /^(경기도\s+\S+군\s+\S+[동면읍리])/,
    /^(경기\s+\S+시)/,
    /^(고양시\s*\S+구)/,
    /^(고양시\S*)/,
    /^(파주시\s+\S+동)/,
    /^(파주시)/,
    /^(안성시)/,
    /^(영종도)/,
    /^(서울\S*구)/,
  ];
  for (const p of regionPatterns) {
    const m = title.match(p);
    if (m) {
      region = m[1];
      break;
    }
  }
  if (!region) {
    // fallback: 첫 몇 단어
    const parts = title.split(/\s+/);
    region = parts.slice(0, 2).join(" ");
  }

  return { region, buildingType, pyeong };
}

// 평수 기반 사이즈 카테고리
function getSizeCategory(pyeong) {
  if (!pyeong) return "unknown";
  if (pyeong <= 25) return "small";
  if (pyeong <= 39) return "medium";
  return "large";
}

// 소형 베리에이션 풀
const smallVariations = [
  "컴팩트한 공간을 효율적으로 활용한 리모델링으로, 수납과 동선을 극대화했습니다",
  "작은 공간의 큰 변화를 이끌어낸 프로젝트로, 밝고 넓어 보이는 공간 설계에 집중했습니다",
  "한정된 면적을 최대한 활용하여 실용적이면서도 세련된 공간을 완성했습니다",
  "소형 평수의 장점을 살려 아늑하면서도 기능적인 생활공간을 구현했습니다",
  "콤팩트한 구조 안에서 개방감과 수납력을 동시에 확보한 시공입니다",
  "작지만 알찬 공간 구성으로 일상의 편리함을 높인 인테리어입니다",
  "효율적인 공간 분할과 밝은 톤의 마감재로 쾌적한 주거환경을 만들었습니다",
  "좁은 공간도 넓게 느껴지도록 시선의 흐름을 고려한 설계를 적용했습니다",
  "미니멀한 디자인으로 공간 활용도를 극대화한 소형 주거 리모델링입니다",
  "제한된 평수에서 최적의 생활 동선을 확보하며 모던한 감성을 담았습니다",
];

// 중형 베리에이션 풀
const mediumVariations = [
  "가족의 라이프스타일에 맞춘 맞춤 설계로 거실과 주방의 개방감을 살렸습니다",
  "넓은 거실과 기능적인 주방 배치로 가족 모두가 만족하는 공간을 완성했습니다",
  "가족 구성원 각각의 생활 패턴을 반영한 균형 잡힌 공간 구성이 특징입니다",
  "주방과 거실의 자연스러운 연결로 소통이 있는 생활공간을 만들었습니다",
  "실용적인 수납 설계와 세련된 마감으로 일상이 편안한 공간을 구현했습니다",
  "중형 평수의 장점을 극대화하여 여유롭고 정돈된 주거 환경을 조성했습니다",
  "거실 중심의 개방형 구조와 효율적인 수납으로 깔끔한 생활이 가능합니다",
  "가족의 취향과 동선을 세밀하게 분석하여 최적의 공간 배치를 완성했습니다",
  "트렌디한 디자인과 실용성을 겸비한 균형 잡힌 주거 리모델링입니다",
  "일상의 편의와 디자인 감성을 모두 잡은 가족 맞춤형 인테리어입니다",
  "자연광을 최대한 활용한 밝은 거실과 기능적인 주방이 조화를 이룹니다",
  "생활 편의를 최우선으로 고려한 동선 설계와 깔끔한 마감이 돋보입니다",
  "가족 중심의 공간 재구성으로 함께하는 시간이 더 풍요로워졌습니다",
  "주방, 거실, 침실 모두 빈틈없이 설계하여 만족도 높은 공간을 만들었습니다",
  "모던한 감각과 따뜻한 소재의 조화로 편안한 집을 완성했습니다",
];

// 대형 베리에이션 풀
const largeVariations = [
  "넓은 공간의 품격을 높인 시공으로, 고급 자재와 세심한 마감이 돋보입니다",
  "고급 자재와 세심한 마감으로 공간 곳곳에 품격을 더했습니다",
  "대형 평수만의 여유로운 공간감을 살려 격조 높은 주거환경을 완성했습니다",
  "넓은 면적을 활용한 프리미엄 마감과 세련된 공간 구성이 특징입니다",
  "공간의 깊이감과 고급스러운 분위기를 동시에 구현한 프리미엄 리모델링입니다",
  "여유로운 평수를 기반으로 호텔급 마감과 디자인을 적용했습니다",
  "대형 공간에 어울리는 고급 마감재와 조명 설계로 격조를 더했습니다",
  "넓은 거실과 독립적인 개인 공간을 모두 갖춘 프리미엄 시공입니다",
  "공간의 볼륨감을 극대화하는 설계와 고급 소재의 조합으로 완성도를 높였습니다",
  "대형 평수의 강점을 살린 럭셔리 인테리어로 일상에 품격을 더했습니다",
];

// 상업공간 베리에이션 풀
const commercialVariations = [
  "방문 고객의 첫인상을 결정하는 공간 설계에 집중하여 브랜드 가치를 높였습니다",
  "브랜드 아이덴티티를 담은 공간 디자인으로 고객 경험을 극대화했습니다",
  "고객의 동선과 체류 시간을 고려한 전략적 공간 배치를 적용했습니다",
  "상업 공간 특유의 내구성과 디자인 감성을 모두 충족하는 시공을 진행했습니다",
  "비즈니스 목적에 최적화된 공간 구성으로 운영 효율성을 높였습니다",
  "방문객에게 강한 인상을 남기는 공간 연출과 실용적인 동선을 갖췄습니다",
  "업종 특성에 맞춘 맞춤 설계로 기능성과 심미성을 겸비했습니다",
  "트렌디한 상업 인테리어로 고객 유입과 브랜드 인지도 향상에 기여합니다",
  "공간 활용도와 고객 편의를 동시에 고려한 상업 공간 리모델링입니다",
  "매장의 콘셉트를 공간 전체에 일관되게 구현하여 브랜드 경험을 완성했습니다",
  "고객 접점을 세심하게 설계하여 재방문율을 높이는 공간을 만들었습니다",
  "내구성 높은 자재 선택과 세련된 디자인으로 오래 가는 상업 공간을 완성했습니다",
];

// 평수 모를 때 (주거) 일반 베리에이션
const generalResidentialVariations = [
  "생활의 편의와 디자인 감성을 조화롭게 담아낸 주거 리모델링입니다",
  "거주자의 취향을 세심하게 반영하여 일상이 풍요로운 공간을 완성했습니다",
  "깔끔한 마감과 실용적인 공간 구성으로 쾌적한 주거환경을 만들었습니다",
  "트렌디한 감각과 실용성을 겸비한 주거 인테리어를 진행했습니다",
  "밝고 개방적인 공간 설계로 매일이 상쾌한 집을 구현했습니다",
  "세련된 컬러 조합과 기능적인 수납 설계가 돋보이는 시공입니다",
  "자연광과 조명의 조화로 언제나 밝고 따뜻한 공간을 연출했습니다",
  "모던한 디자인 언어로 일관성 있는 공간 스타일을 완성했습니다",
  "거주자의 동선을 분석하여 불편함 없는 생활 공간을 설계했습니다",
  "심플하면서도 개성 있는 마감으로 특별한 나만의 공간을 만들었습니다",
  "편안한 색감과 질감의 마감재를 엄선하여 아늑한 분위기를 조성했습니다",
  "주방, 욕실, 거실 등 각 공간의 특성에 맞는 최적의 마감을 적용했습니다",
  "오래된 공간에 새로운 생명을 불어넣는 전면 리모델링을 진행했습니다",
  "화이트 톤 베이스에 포인트 소재를 더해 깔끔하면서도 따뜻한 공간입니다",
  "구조 변경을 통해 기존 대비 훨씬 넓고 쾌적한 공간을 확보했습니다",
];

// 마무리 멘트 풀
const closingVariations = [
  "토브하우스가 투명한 견적과 꼼꼼한 시공으로 완성했습니다.",
  "토브하우스가 고객 맞춤 설계와 정직한 견적으로 신뢰를 드렸습니다.",
  "토브하우스의 체계적인 공정 관리와 세심한 마감으로 만족을 드렸습니다.",
  "토브하우스가 합리적인 견적과 책임 시공으로 완성도를 높였습니다.",
  "토브하우스가 맞춤 디자인과 투명한 비용 안내로 함께했습니다.",
  "토브하우스의 전문 시공팀이 정성을 다해 완성한 프로젝트입니다.",
  "토브하우스가 자재 선택부터 마감까지 빈틈없이 관리했습니다.",
  "토브하우스의 1:1 맞춤 상담과 꼼꼼한 시공이 만들어낸 결과물입니다.",
  "토브하우스가 설계부터 시공까지 원스톱으로 책임 완성했습니다.",
  "토브하우스의 투명한 공정과 세심한 마감이 돋보이는 시공 사례입니다.",
  "토브하우스가 고객의 비전을 현실로 만들어드렸습니다.",
  "토브하우스의 전문성과 정직한 견적이 만들어낸 신뢰의 결과물입니다.",
  "토브하우스가 디테일 하나까지 놓치지 않는 시공으로 마무리했습니다.",
  "토브하우스가 합리적인 비용과 프리미엄 마감의 균형을 잡아드렸습니다.",
  "토브하우스의 축적된 노하우로 기대 이상의 공간을 선사했습니다.",
  "토브하우스가 고객과의 소통을 바탕으로 만족스러운 결과를 만들었습니다.",
  "토브하우스가 정확한 공기 준수와 깔끔한 마감으로 약속을 지켰습니다.",
  "토브하우스의 체계적인 프로세스가 완성도 높은 공간을 만들었습니다.",
  "토브하우스가 트렌드와 실용성을 모두 잡는 시공을 제공했습니다.",
  "토브하우스가 처음부터 끝까지 함께하며 완벽한 공간을 만들었습니다.",
];

// 사용 추적용 인덱스
const usedIndices = {
  small: 0,
  medium: 0,
  large: 0,
  commercial: 0,
  general: 0,
  closing: 0,
};

function getVariation(pool, key) {
  const idx = usedIndices[key] % pool.length;
  usedIndices[key]++;
  return pool[idx];
}

function generateDescription(record) {
  const { title, category } = record.fields;
  const { region, buildingType, pyeong } = parseTitle(title);
  const isCommercial = category === "상업공간";

  // 첫 문장: 소개
  let intro;
  if (pyeong) {
    intro = `${region}에 위치한 ${buildingType} ${pyeong}평 리모델링 프로젝트입니다.`;
  } else {
    // 평수 없는 경우
    intro = `${region}에 위치한 ${buildingType} 리모델링 프로젝트입니다.`;
  }

  // 두번째 문장: 시공 내용 베리에이션
  let middle;
  if (isCommercial) {
    middle = getVariation(commercialVariations, "commercial");
  } else if (!pyeong) {
    middle = getVariation(generalResidentialVariations, "general");
  } else {
    const size = getSizeCategory(pyeong);
    if (size === "small") middle = getVariation(smallVariations, "small");
    else if (size === "medium")
      middle = getVariation(mediumVariations, "medium");
    else middle = getVariation(largeVariations, "large");
  }

  // 세번째 문장: 마무리
  const closing = getVariation(closingVariations, "closing");

  return `${intro} ${middle} ${closing}`;
}

async function main() {
  // 1. Fetch all records
  console.log("Fetching records...");
  const data = await airtableRequest("GET", "portfolio?pageSize=100");
  const records = data.records;
  console.log(`Fetched ${records.length} records`);

  // 2. Generate descriptions
  const updates = records.map((r) => ({
    id: r.id,
    fields: { description: generateDescription(r) },
  }));

  // 3. Show preview of first 5
  console.log("\n--- Preview (first 5) ---");
  updates.slice(0, 5).forEach((u, i) => {
    console.log(`\n[${i}] ${records[i].fields.title}`);
    console.log(`    → ${u.fields.description}`);
  });

  // 4. Batch update 10 at a time
  console.log("\n--- Updating ---");
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    const result = await airtableRequest("PATCH", "portfolio", {
      records: batch,
    });
    if (result.error) {
      console.error(`Batch ${i / 10 + 1} ERROR:`, result.error);
      return;
    }
    console.log(
      `Batch ${Math.floor(i / 10) + 1}: Updated ${batch.length} records (${i + 1}~${i + batch.length})`,
    );
    // Rate limit: small delay
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\nDone! Updated ${updates.length} records.`);

  // 5. Verify: show all descriptions
  console.log("\n--- All Generated Descriptions ---");
  updates.forEach((u, i) => {
    console.log(`[${i + 1}] ${records[i].fields.title}`);
    console.log(`    ${u.fields.description}\n`);
  });
}

main().catch(console.error);
