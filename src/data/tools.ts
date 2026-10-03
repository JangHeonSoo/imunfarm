/**
 * 농업 계산기(/tools/) 공용 기준값과 계산식.
 * 서버(검색엔진이 읽는 기본 결과)와 브라우저(입력 변경)가 같은 식을 쓴다.
 * 큰 시세 JSON을 끌어오지 않도록 prices.ts 를 import 하지 않는다.
 */
import energy from './generated/energy/summary.json'

/* ---------------- 시장별 판매 금액 ---------------- */

/**
 * 도매시장 위탁수수료 법정 상한 (농수산물 유통 및 가격안정에 관한 법률 시행규칙 제39조, 2026-09-22 시행).
 * 양곡부류(미곡·맥류·두류·메밀·참깨·땅콩) 1천분의 20, 청과부류 1천분의 70.
 */
export const FEE_GRAIN = 2
export const FEE_PRODUCE = 7
const GRAIN_IDS = new Set([
	'rice',
	'glutinous-rice',
	'soybean',
	'red-bean',
	'mung-bean',
	'buckwheat',
	'sesame',
	'peanut'
])
export const feeFor = (id: string) => (GRAIN_IDS.has(id) ? FEE_GRAIN : FEE_PRODUCE)

/** 수입품은 농가가 내는 품목이 아니므로 시장 비교에서 뺀다 */
export const MARKET_EXCLUDE = new Set([
	'mung-bean-imported',
	'buckwheat',
	'soybean-white',
	'red-bean-red',
	'perilla-seed-imported',
	'sesame-india',
	'sesame-china'
])

/** 같은 값이 이 일수 넘게 이어지면 '값이 늦게 바뀌는 시장'으로 표시한다 */
export const FLAT_WARN_DAYS = 3

export type MarketInput = {
	regions: {
		id: string
		label: string
		price: number | null
		date: string | null
		since: string | null
	}[]
	qty: number
	feePct: number
	transport: Record<string, number>
}

export type MarketRow = {
	id: string
	label: string
	price: number
	date: string
	since: string
	gross: number
	cost: number
	net: number
}

export const computeMarket = ({ regions, qty, feePct, transport }: MarketInput): MarketRow[] =>
	regions
		.filter((r) => r.price != null)
		.map((r) => {
			const gross = Math.round((r.price as number) * qty)
			const cost = Math.round((gross * feePct) / 100) + (transport[r.id] || 0)
			return {
				id: r.id,
				label: r.label,
				price: r.price as number,
				date: r.date as string,
				since: r.since as string,
				gross,
				cost,
				net: gross - cost
			}
		})
		.sort((a, b) => b.net - a.net)

/* ---------------- 태양광 발전 수익 ---------------- */

/**
 * SMP·REC 기준값은 scripts/energy/fetch.mjs 가 한국전력거래소 공공데이터에서 매일 받아 만든 요약을 쓴다.
 * smp = 지난달 육지 시간별 SMP 평균, rec = 지난달 REC 현물시장 육지 평균가(거래량 가중).
 */
const ENERGY = energy as {
	month: string
	smp: number
	rec: number
	smpMonthly: Record<string, number>
	recMonthly: Record<string, number>
}

export const SOLAR = {
	basis: ENERGY.month,
	smp: ENERGY.smp,
	rec: ENERGY.rec,
	/** kW당 연간 발전량 (kWh) */
	yieldPerKw: 1300,
	/** kW당 연 운영비 (점검·보험·통신·잡비) */
	opexPerKw: 35000,
	/** kW당 총 시공비 (100kW 일반 검토 기준 1억 8천만 원) */
	costPerKw: 1800000
}

/** 최근 12개월 월평균이 6개월 이상 쌓이면 최저·최고 월, 그 전에는 지난달 ±15% */
const band = (monthly: Record<string, number>, now: number, digits: number) => {
	const recent = Object.entries(monthly)
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.slice(-12)
		.map(([, v]) => v)
	const r = (v: number) =>
		digits >= 0
			? Math.round(v * 10 ** digits) / 10 ** digits
			: Math.round(v / 10 ** -digits) * 10 ** -digits
	return recent.length >= 6
		? { low: r(Math.min(...recent)), high: r(Math.max(...recent)) }
		: { low: r(now * 0.85), high: r(now * 1.15) }
}
const smpBand = band(ENERGY.smpMonthly, ENERGY.smp, 0)
const recBand = band(ENERGY.recMonthly, ENERGY.rec, -2)

/** 단가 시나리오 (시공비는 바꾸지 않는다) */
export const SOLAR_SCENARIOS = {
	low: { smp: smpBand.low, rec: recBand.low },
	now: { smp: SOLAR.smp, rec: SOLAR.rec },
	high: { smp: smpBand.high, rec: recBand.high }
} as const

export type SolarInput = {
	kw: number
	yieldPerKw: number
	smp: number
	rec: number
	weight: number
	costPerKw: number
	opexPerKw: number
	loanPct: number
	ratePct: number
	years: number
}

/** 원리금 균등상환 연 상환액 */
export const annuity = (principal: number, ratePct: number, years: number) => {
	if (principal <= 0 || years <= 0) return 0
	const r = ratePct / 100
	if (r === 0) return principal / years
	return (principal * r) / (1 - Math.pow(1 + r, -years))
}

export const computeSolar = (i: SolarInput) => {
	const kwh = i.kw * i.yieldPerKw
	const smpRevenue = kwh * i.smp
	const recRevenue = (kwh / 1000) * i.weight * i.rec
	const revenue = smpRevenue + recRevenue
	const opex = i.kw * i.opexPerKw
	const net = revenue - opex
	const cost = i.kw * i.costPerKw
	const loan = (cost * i.loanPct) / 100
	const debt = annuity(loan, i.ratePct, i.years)
	const cash = net - debt
	const equity = cost - loan
	return {
		kwh,
		smpRevenue,
		recRevenue,
		revenue,
		opex,
		net,
		cost,
		loan,
		debt,
		cash,
		equity,
		/** 단순 회수기간 = 총투자비 ÷ 연 순수익 */
		payback: net > 0 ? cost / net : null,
		monthlyNet: net / 12,
		monthlyCash: cash / 12
	}
}

/* ---------------- 저온저장고 설치비·전기료 ---------------- */

/**
 * 평형별 설치비 범위(만 원)와 냉동기 소비전력 가정.
 * 출처: IMUN.FARM cold-storage-price-2026-3-5-10-pyeong (지자체 보조사업 공고·시공 견적 기반 범위).
 */
export const COLD_ANCHORS = [
	{ pyeong: 3, min: 650, max: 900, kw: 1.5 },
	{ pyeong: 5, min: 1100, max: 1700, kw: 2.2 },
	{ pyeong: 10, min: 2500, max: 3800, kw: 4.0 }
]

/** 한전 농사용전력(을) 저압, 2025-04-01 적용 요금표 */
export const COLD_TARIFF = { basicPerKw: 1150, perKwh: 65.9, basis: '2025-04-01' }

export const COLD_USAGE = [
	{ id: 'low', pct: 25 },
	{ id: 'mid', pct: 35 },
	{ id: 'high', pct: 50 }
] as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const coldSpec = (pyeong: number) => {
	const A = COLD_ANCHORS
	if (pyeong <= A[0].pyeong) {
		const t = pyeong / A[0].pyeong
		return { min: A[0].min * t, max: A[0].max * t, kw: A[0].kw * t }
	}
	for (let k = 1; k < A.length; k++) {
		if (pyeong <= A[k].pyeong) {
			const t = (pyeong - A[k - 1].pyeong) / (A[k].pyeong - A[k - 1].pyeong)
			return {
				min: lerp(A[k - 1].min, A[k].min, t),
				max: lerp(A[k - 1].max, A[k].max, t),
				kw: lerp(A[k - 1].kw, A[k].kw, t)
			}
		}
	}
	const last = A[A.length - 1]
	const t = pyeong / last.pyeong
	return { min: last.min * t, max: last.max * t, kw: last.kw * t }
}

export const computeCold = (pyeong: number, usagePct: number, subsidyPct: number) => {
	const s = coldSpec(pyeong)
	const kwh = s.kw * (usagePct / 100) * 24 * 30
	const monthly = kwh * COLD_TARIFF.perKwh + s.kw * COLD_TARIFF.basicPerKw
	const share = 1 - subsidyPct / 100
	return {
		kw: s.kw,
		min: s.min * 10000,
		max: s.max * 10000,
		selfMin: s.min * 10000 * share,
		selfMax: s.max * 10000 * share,
		kwh,
		monthly,
		yearly: monthly * 12
	}
}

/** 작물별 저장 조건. 출처: IMUN.FARM cold-storage-temperature-humidity-by-crop (농촌진흥청, USDA HB66 등) */
export const CROPS = [
	{
		id: 'apple',
		ko: '사과 (후지)',
		en: 'Apple (Fuji)',
		temp: '0℃ ±0.5',
		rh: '90–95%',
		life: '일반 저장 약 4개월',
		lifeEn: 'about 4 months',
		note: '에틸렌을 많이 냅니다',
		noteEn: 'Gives off a lot of ethylene',
		ethylene: 'emit'
	},
	{
		id: 'pear',
		ko: '배 (신고)',
		en: 'Pear (Niitaka)',
		temp: '0℃ ±0.5',
		rh: '90–95%',
		life: '품종·숙도에 따라 다름',
		lifeEn: 'Varies by variety',
		note: '입고 전 예건, 과습하면 과피흑변',
		noteEn: 'Pre-dry before storage; too humid causes skin blackening',
		ethylene: ''
	},
	{
		id: 'persimmon',
		ko: '단감',
		en: 'Sweet persimmon',
		temp: '0℃ ±1',
		rh: '90–95%',
		life: '약 3개월',
		lifeEn: 'about 3 months',
		note: '0℃ 아래는 얼고, 에틸렌에 매우 민감합니다',
		noteEn: 'Freezes below 0℃; very ethylene-sensitive',
		ethylene: 'sensitive'
	},
	{
		id: 'grape',
		ko: '포도',
		en: 'Grape',
		temp: '0℃ 안팎',
		rh: '85–90%',
		life: '캠벨 4–7주',
		lifeEn: 'Campbell 4–7 weeks',
		note: '품온 5℃까지 예냉 후 입고',
		noteEn: 'Pre-cool to 5℃ pulp temperature first',
		ethylene: ''
	},
	{
		id: 'potato',
		ko: '감자 (식용)',
		en: 'Potato (table)',
		temp: '약 4℃',
		rh: '90% 이상',
		life: '큐어링 시 길게',
		lifeEn: 'Long after curing',
		note: '0–2℃는 언 피해 위험',
		noteEn: '0–2℃ risks chilling damage',
		ethylene: ''
	},
	{
		id: 'sweet-potato',
		ko: '고구마',
		en: 'Sweet potato',
		temp: '12–15℃',
		rh: '90–95%',
		life: '최대 1년',
		lifeEn: 'up to 1 year',
		note: '12℃ 아래는 저온장해',
		noteEn: 'Chilling injury below 12℃',
		ethylene: 'sensitive'
	},
	{
		id: 'onion',
		ko: '양파',
		en: 'Onion',
		temp: '0–1℃',
		rh: '65–75%',
		life: '6–9개월',
		lifeEn: '6–9 months',
		note: '습도를 높이면 싹과 부패',
		noteEn: 'High humidity causes sprouting and rot',
		ethylene: ''
	},
	{
		id: 'garlic',
		ko: '마늘',
		en: 'Garlic',
		temp: '−3℃에서 0℃',
		rh: '60–70%',
		life: '9개월 이상',
		lifeEn: '9+ months',
		note: '냄새가 옮으니 따로 저장',
		noteEn: 'Store apart; odor transfers',
		ethylene: ''
	},
	{
		id: 'ginger',
		ko: '생강',
		en: 'Ginger',
		temp: '13℃ 안팎',
		rh: '85–96%',
		life: '수개월',
		lifeEn: 'several months',
		note: '10℃ 아래는 피해',
		noteEn: 'Damaged below 10℃',
		ethylene: ''
	},
	{
		id: 'cabbage',
		ko: '배추',
		en: 'Napa cabbage',
		temp: '0–3℃',
		rh: '90–95%',
		life: '3–6개월',
		lifeEn: '3–6 months',
		note: '찬바람이 직접 닿지 않게',
		noteEn: 'Keep out of direct cold airflow',
		ethylene: 'sensitive'
	},
	{
		id: 'radish',
		ko: '무',
		en: 'Radish',
		temp: '0℃',
		rh: '90–95%',
		life: '겨울무 2–4개월',
		lifeEn: 'winter radish 2–4 months',
		note: '저온장해 없음',
		noteEn: 'No chilling injury',
		ethylene: ''
	},
	{
		id: 'carrot',
		ko: '당근',
		en: 'Carrot',
		temp: '0℃',
		rh: '95% 이상',
		life: '7–9개월',
		lifeEn: '7–9 months',
		note: '에틸렌에 닿으면 쓴맛',
		noteEn: 'Turns bitter with ethylene',
		ethylene: 'sensitive'
	},
	{
		id: 'leafy',
		ko: '시금치·엽채류',
		en: 'Spinach, leafy greens',
		temp: '0℃',
		rh: '90–95%',
		life: '약 2주',
		lifeEn: 'about 2 weeks',
		note: '에틸렌에 민감',
		noteEn: 'Ethylene-sensitive',
		ethylene: 'sensitive'
	},
	{
		id: 'pepper',
		ko: '풋고추',
		en: 'Green pepper',
		temp: '7–10℃',
		rh: '90–95%',
		life: '2–3주',
		lifeEn: '2–3 weeks',
		note: '7℃ 아래는 저온장해',
		noteEn: 'Chilling injury below 7℃',
		ethylene: ''
	},
	{
		id: 'strawberry',
		ko: '딸기',
		en: 'Strawberry',
		temp: '0–4℃',
		rh: '90–95%',
		life: '최대 7일',
		lifeEn: 'up to 7 days',
		note: '저장보다 예냉 품목',
		noteEn: 'Pre-cool rather than store',
		ethylene: ''
	}
]

/** 만 원 단위 금액 글자. 1억 이상은 "1억 8,000만 원"처럼 억을 붙인다. */
export function manKo(v: number): string {
	const sign = v < 0 ? '−' : ''
	const man = Math.round(Math.abs(v) / 10000)
	const eok = Math.floor(man / 10000)
	const rest = man % 10000
	if (!man) return '0원'
	if (!eok) return `${sign}${man.toLocaleString('ko-KR')}만 원`
	return `${sign}${eok.toLocaleString('ko-KR')}억${rest ? ` ${rest.toLocaleString('ko-KR')}만` : ''} 원`
}
