/**
 * 지역별·날짜별 주요 농산물 도매 시세.
 *
 * 거래량이 가장 많은 공영 도매시장과 반입량 상위 품목으로 구성했다.
 * 값은 고정 시드(품목·지역·날짜)로 계산되므로 같은 날짜는 언제 빌드해도 같은 값이 나온다.
 *
 * 실데이터(KAMIS 농산물유통정보 OpenAPI 등)를 붙일 때는
 * priceAt() 한 곳만 교체하면 나머지(표·차트·분석)는 그대로 동작한다.
 */

export type Region = {
	id: string
	ko: string
	en: string
	adj: number
}

export type Item = {
	id: string
	ko: string
	en: string
	gradeKo: string
	gradeEn: string
	unitKo: string
	unitEn: string
	base: number
	vol: number
	/** 계절성 진폭 (0이면 연중 평탄) */
	season: number
	/** 연중 최고가가 오는 달 (1~12) */
	peakMonth: number
	/** 연평균 추세 (물가·작황 추세) */
	drift: number
	keywordsKo: string[]
	keywordsEn: string[]
}

export const REGIONS: Region[] = [
	{ id: 'garak', ko: '서울 가락', en: 'Seoul Garak', adj: 0 },
	{ id: 'gangseo', ko: '서울 강서', en: 'Seoul Gangseo', adj: -0.014 },
	{ id: 'busan', ko: '부산 엄궁', en: 'Busan Eomgung', adj: 0.021 },
	{ id: 'daegu', ko: '대구 북부', en: 'Daegu Bukbu', adj: -0.026 },
	{ id: 'gwangju', ko: '광주 각화', en: 'Gwangju Gakhwa', adj: -0.033 },
	{ id: 'daejeon', ko: '대전 오정', en: 'Daejeon Ojeong', adj: -0.009 }
]

export const ITEMS: Item[] = [
	{
		id: 'cabbage',
		ko: '배추',
		en: 'Napa cabbage',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '10kg 망',
		unitEn: '10kg net',
		base: 12400,
		vol: 0.06,
		season: 0.3,
		peakMonth: 9,
		drift: 0.03,
		keywordsKo: ['배추 시세', '배추 가격', '배추 도매가', '김장 배추 가격'],
		keywordsEn: ['napa cabbage price', 'kimchi cabbage wholesale']
	},
	{
		id: 'radish',
		ko: '무',
		en: 'Radish',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 16800,
		vol: 0.055,
		season: 0.24,
		peakMonth: 8,
		drift: 0.025,
		keywordsKo: ['무 시세', '무 가격', '무 도매가'],
		keywordsEn: ['radish price', 'korean radish wholesale']
	},
	{
		id: 'onion',
		ko: '양파',
		en: 'Onion',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 24600,
		vol: 0.038,
		season: 0.19,
		peakMonth: 3,
		drift: 0.028,
		keywordsKo: ['양파 시세', '양파 가격', '양파 도매가'],
		keywordsEn: ['onion price', 'onion wholesale korea']
	},
	{
		id: 'garlic',
		ko: '마늘 (깐마늘)',
		en: 'Garlic (peeled)',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 128000,
		vol: 0.026,
		season: 0.12,
		peakMonth: 4,
		drift: 0.022,
		keywordsKo: ['마늘 시세', '깐마늘 가격', '마늘 도매가'],
		keywordsEn: ['garlic price', 'peeled garlic wholesale']
	},
	{
		id: 'greenonion',
		ko: '대파',
		en: 'Green onion',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '1kg',
		unitEn: '1kg',
		base: 2180,
		vol: 0.072,
		season: 0.34,
		peakMonth: 4,
		drift: 0.035,
		keywordsKo: ['대파 시세', '대파 가격', '대파 도매가'],
		keywordsEn: ['green onion price', 'scallion wholesale']
	},
	{
		id: 'potato',
		ko: '감자 (수미)',
		en: 'Potato (Sumi)',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '20kg',
		unitEn: '20kg',
		base: 31200,
		vol: 0.042,
		season: 0.17,
		peakMonth: 5,
		drift: 0.026,
		keywordsKo: ['감자 시세', '감자 가격', '수미감자 도매가'],
		keywordsEn: ['potato price', 'sumi potato wholesale']
	},
	{
		id: 'apple',
		ko: '사과 (후지)',
		en: 'Apple (Fuji)',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 48500,
		vol: 0.035,
		season: 0.16,
		peakMonth: 8,
		drift: 0.038,
		keywordsKo: ['사과 시세', '사과 가격', '후지 사과 도매가'],
		keywordsEn: ['apple price', 'fuji apple wholesale']
	},
	{
		id: 'pear',
		ko: '배 (신고)',
		en: 'Pear (Singo)',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '15kg',
		unitEn: '15kg',
		base: 54800,
		vol: 0.033,
		season: 0.18,
		peakMonth: 8,
		drift: 0.031,
		keywordsKo: ['배 시세', '신고배 가격', '배 도매가'],
		keywordsEn: ['pear price', 'singo pear wholesale']
	},
	{
		id: 'tomato',
		ko: '토마토',
		en: 'Tomato',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 27400,
		vol: 0.058,
		season: 0.22,
		peakMonth: 12,
		drift: 0.024,
		keywordsKo: ['토마토 시세', '토마토 가격', '토마토 도매가'],
		keywordsEn: ['tomato price', 'tomato wholesale korea']
	},
	{
		id: 'cucumber',
		ko: '오이 (다다기)',
		en: 'Cucumber',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '100개',
		unitEn: '100 ea',
		base: 41000,
		vol: 0.065,
		season: 0.28,
		peakMonth: 1,
		drift: 0.027,
		keywordsKo: ['오이 시세', '오이 가격', '다다기오이 도매가'],
		keywordsEn: ['cucumber price', 'cucumber wholesale korea']
	},
	{
		id: 'pepper',
		ko: '청양고추',
		en: 'Cheongyang pepper',
		gradeKo: '상',
		gradeEn: 'A',
		unitKo: '10kg',
		unitEn: '10kg',
		base: 38600,
		vol: 0.078,
		season: 0.31,
		peakMonth: 1,
		drift: 0.03,
		keywordsKo: ['청양고추 시세', '고추 가격', '청양고추 도매가'],
		keywordsEn: ['cheongyang pepper price', 'chili pepper wholesale']
	},
	{
		id: 'watermelon',
		ko: '수박',
		en: 'Watermelon',
		gradeKo: '특',
		gradeEn: 'Prime',
		unitKo: '1개',
		unitEn: '1 ea',
		base: 21500,
		vol: 0.05,
		season: 0.26,
		peakMonth: 6,
		drift: 0.029,
		keywordsKo: ['수박 시세', '수박 가격', '수박 도매가'],
		keywordsEn: ['watermelon price', 'watermelon wholesale korea']
	}
]

export const HISTORY_DAYS = 30
/** 장기 분석 기간(년) */
export const HISTORY_YEARS = 10

const EPOCH = Date.UTC(2013, 0, 1)
const DAY = 86400000
/** base 가 가리키는 기준 시점 — 이 날짜 부근이 base 값이 된다 */
const REFERENCE = Date.UTC(2026, 0, 1)

const noise = (seed: string) => {
	let h = 2166136261
	for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
	return ((h >>> 0) % 100000) / 100000 - 0.5
}

const dayIndexOf = (ms: number) => Math.floor((ms - EPOCH) / DAY)
const msOfIndex = (index: number) => EPOCH + index * DAY
export const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/**
 * 시세표 기준일.
 *
 * 매일 오전 자동 발행은 새벽/아침에 확정된 "전일" 시세를 보여주는 것이 안전하므로
 * 빌드 환경에서 IMUNFARM_PRICE_AS_OF=YYYY-MM-DD 를 넘기면 그 날짜 기준으로 굽는다.
 * 값이 없거나 잘못되면 기존처럼 빌드 당일 날짜를 쓴다.
 */
export const getPriceAsOfDate = () => {
	const raw = import.meta.env.IMUNFARM_PRICE_AS_OF
	if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		const [year, month, day] = raw.split('-').map(Number)
		return new Date(year, month - 1, day)
	}

	// 기본값은 한국 시간 기준 전일이다. 오전 자동 발행 때 아직 당일 경락가가
	// 확정되지 않는 경우가 있어, 완전히 지나간 거래일을 기본 기준으로 삼는다.
	const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
	return new Date(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() - 1)
}

/** 품목별 누적 랜덤워크. 한 번만 계산해 재사용한다. */
const walks = new Map<string, Float64Array>()
const walkFor = (item: Item, until: number) => {
	const cached = walks.get(item.id)
	if (cached && cached.length > until) return cached
	const length = until + 2
	const walk = new Float64Array(length)
	let value = 0
	for (let d = 0; d < length; d++) {
		value = value * 0.972 + noise(`${item.id}:${d}`) * item.vol
		walk[d] = value
	}
	walks.set(item.id, walk)
	return walk
}

const roundTo = (value: number) => {
	const step = value > 100000 ? 500 : value > 10000 ? 100 : value > 1000 ? 10 : 5
	return Math.max(step, Math.round(value / step) * step)
}

/** 실데이터를 붙일 때 교체할 지점 */
export const priceAt = (item: Item, region: Region, dayIndex: number) => {
	const walk = walkFor(item, dayIndex)
	const date = new Date(msOfIndex(dayIndex))
	const dayOfYear =
		(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
			Date.UTC(date.getUTCFullYear(), 0, 1)) /
		DAY
	// 연중 계절 파동 (peakMonth 근처가 최고)
	const peak = ((item.peakMonth - 1) * 30.4 + 15) / 365
	const season = Math.cos((dayOfYear / 365 - peak) * Math.PI * 2) * item.season * 0.5
	// 장기 추세 (REFERENCE 시점을 base 로 두고 앞뒤로 환산)
	const years = (msOfIndex(dayIndex) - REFERENCE) / (DAY * 365.25)
	const trend = Math.pow(1 + item.drift, years)
	const regionScale = 1 + region.adj + noise(`${region.id}:${item.id}`) * 0.02
	return roundTo(item.base * trend * (1 + walk[dayIndex] + season) * regionScale)
}

export type PriceCell = { price: number; delta: number }
export type PriceTable = Record<string, Record<string, Record<string, PriceCell>>>
export type PriceData = { dates: string[]; table: PriceTable }

/** 최근 HISTORY_DAYS 일치 일별 시세 */
export const buildPriceData = (today = new Date()): PriceData => {
	const lastIndex = dayIndexOf(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
	const firstIndex = lastIndex - HISTORY_DAYS + 1
	const dates: string[] = []
	const table: PriceTable = {}

	for (let d = firstIndex; d <= lastIndex; d++) {
		const key = toKey(msOfIndex(d))
		dates.push(key)
		table[key] = {}
		for (const region of REGIONS) {
			table[key][region.id] = {}
			for (const item of ITEMS) {
				const price = priceAt(item, region, d)
				const prev = priceAt(item, region, d - 1)
				const delta = prev ? Math.round(((price - prev) / prev) * 1000) / 10 : 0
				table[key][region.id][item.id] = { price, delta }
			}
		}
	}
	return { dates, table }
}

export type Benchmark = {
	yearsAgo: number
	year: number
	avg: number
	diffPct: number
}

export type ItemAnalysis = {
	/** 최근가 */
	current: number
	/** 최근 30일 평균·최저·최고 */
	windowAvg: number
	windowMin: number
	windowMax: number
	/** 30일 변동률 */
	trend30: number
	/** 최근 30일 변동성 (표준편차 / 평균) */
	volatility: number
	/** 1·3·5·10년 전 같은 기간(±15일) 평균과 비교 */
	benchmarks: Benchmark[]
	/** 최근 1년(365일) 안에서 현재가의 백분위 (0~100) */
	percentile: number
	/** 월별 계절지수 (10년 평균 = 100) */
	seasonality: number[]
	/** 이번 달 / 다음 달 계절지수 */
	monthIndex: number
	nextMonthIndex: number
	/** 최근 60개월 월평균 */
	monthly: { ym: string; avg: number }[]
	/** 10년 연평균 상승률 (%) */
	cagr: number
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / (values.length || 1)

/** 지정한 날짜를 중심으로 ±window 일 평균 */
const periodAvg = (item: Item, region: Region, centerIndex: number, window: number) => {
	const values: number[] = []
	for (let d = centerIndex - window; d <= centerIndex + window; d++) {
		if (d < 1) continue
		values.push(priceAt(item, region, d))
	}
	return Math.round(mean(values))
}

export const buildAnalysis = (item: Item, region: Region, today = new Date()): ItemAnalysis => {
	const lastIndex = dayIndexOf(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
	const recent: number[] = []
	for (let d = lastIndex - HISTORY_DAYS + 1; d <= lastIndex; d++)
		recent.push(priceAt(item, region, d))

	const current = recent[recent.length - 1]
	const windowAvg = Math.round(mean(recent))
	const windowMin = Math.min(...recent)
	const windowMax = Math.max(...recent)
	const trend30 = Math.round(((current - recent[0]) / recent[0]) * 1000) / 10
	const variance = mean(recent.map((v) => (v - windowAvg) ** 2))
	const volatility = Math.round((Math.sqrt(variance) / windowAvg) * 1000) / 10

	// 같은 기간(±15일) 기준 과거 비교
	const thisPeriodAvg = periodAvg(item, region, lastIndex, 15)
	const benchmarks: Benchmark[] = [1, 3, 5, 10].map((yearsAgo) => {
		const center = lastIndex - Math.round(yearsAgo * 365.25)
		const avg = periodAvg(item, region, center, 15)
		return {
			yearsAgo,
			year: today.getFullYear() - yearsAgo,
			avg,
			diffPct: avg ? Math.round(((thisPeriodAvg - avg) / avg) * 1000) / 10 : 0
		}
	})

	// 최근 1년 안에서의 위치 — 장기 상승 추세 때문에 10년 표본은 항상 상단에 붙는다
	const sample: number[] = []
	for (let d = lastIndex - 364; d <= lastIndex; d++)
		if (d > 0) sample.push(priceAt(item, region, d))
	const below = sample.filter((v) => v < current).length
	const percentile = Math.round((below / (sample.length || 1)) * 100)

	// 월별 계절지수 + 최근 60개월 월평균
	const monthSums = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }))
	const monthlyMap = new Map<string, { sum: number; count: number }>()
	const startIndex = Math.max(1, lastIndex - Math.round(HISTORY_YEARS * 365.25))
	for (let d = startIndex; d <= lastIndex; d++) {
		const date = new Date(msOfIndex(d))
		const month = date.getUTCMonth()
		const price = priceAt(item, region, d)
		monthSums[month].sum += price
		monthSums[month].count++
		const ym = `${date.getUTCFullYear()}-${String(month + 1).padStart(2, '0')}`
		const bucket = monthlyMap.get(ym) ?? { sum: 0, count: 0 }
		bucket.sum += price
		bucket.count++
		monthlyMap.set(ym, bucket)
	}
	const overall = mean(monthSums.map((m) => (m.count ? m.sum / m.count : 0)))
	const seasonality = monthSums.map((m) =>
		m.count && overall ? Math.round((m.sum / m.count / overall) * 100) : 100
	)
	const monthly = Array.from(monthlyMap.entries())
		.map(([ym, b]) => ({ ym, avg: Math.round(b.sum / b.count) }))
		.slice(-60)

	const thisMonth = today.getMonth()
	const decadeAgo = periodAvg(item, region, Math.max(1, lastIndex - Math.round(10 * 365.25)), 15)
	const cagr = decadeAgo
		? Math.round((Math.pow(thisPeriodAvg / decadeAgo, 1 / 10) - 1) * 1000) / 10
		: 0

	return {
		current,
		windowAvg,
		windowMin,
		windowMax,
		trend30,
		volatility,
		benchmarks,
		percentile,
		seasonality,
		monthIndex: seasonality[thisMonth],
		nextMonthIndex: seasonality[(thisMonth + 1) % 12],
		monthly,
		cagr
	}
}

export const formatDate = (iso: string) => iso.replace(/-/g, '.')
