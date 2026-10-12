/**
 * 땅 주소 → 작물 추천 (/tools/farmland-crop-finder/) 규칙표와 점수 계산.
 * 흙토람 토양 API는 이용조건이 '상업적 이용금지(제4유형)'라 쓰지 않고, 지목·실제 이용·기후대만으로 고른다.
 * 작물 정보는 농사로(농촌진흥청) 재배 일반 기준을 보수적으로 줄인 것이다. 지역·품종마다 시기는 앞뒤로 달라진다.
 * 서버(api/farmland)와 브라우저가 같이 쓰므로 시세 데이터(prices.ts)는 여기서 불러오지 않는다.
 */

/** 지적 지목 중 농사와 관련 있는 것. 그 밖(대·잡종지 등)은 'other' */
export type Jimok = '전' | '답' | '과수원' | '목장용지' | '임야' | 'other'
/** 팜맵(농경지 전자지도)의 실제 이용 구분 */
export type FarmUse = '논' | '밭' | '과수' | '시설' | null
export type Zone = 'north' | 'central' | 'south' | 'jeju'
export type Labor = 1 | 2 | 3

export type CropRule = {
	id: string
	ko: string
	en: string
	/** /prices/<id>/ 품목 (없으면 null) */
	priceId: string | null
	/** 지목별 맞는 정도 0(안 맞음)–3(잘 맞음) */
	jimok: Partial<Record<Jimok, number>>
	/** 기후대별 0–2 */
	zones: Record<Zone, number>
	/** 심는(파종·정식) 달 */
	plant: number[]
	/** 거두는 달 */
	harvest: number[]
	/** 수확이 심은 다음 해 */
	nextYear?: boolean
	/** 나무: 심고 몇 년 뒤부터 수확 */
	years?: string
	/** 비닐하우스가 있어야 함 */
	greenhouse?: boolean
	/** 손이 가는 정도 1 적음, 2 보통, 3 많음 */
	labor: Labor
	/**
	 * 10a당 소득 (원, 2024년산). 농촌진흥청 「2024 농산물소득자료집」(2025.11, 국가승인통계 제143002호) 11–13쪽,
	 * 콩·마늘·양파·고추·쌀은 같은 책 별지 1의 국가데이터처 농축산물생산비조사 값. 딸기·방울토마토는 토경, 옥수수는 노지풋옥수수.
	 * 땅콩·녹두·팥·메밀은 조사 대상이 아니라 없다.
	 * https://nongsaro.go.kr/portal/ps/psb/psbf/agricultIncomeInfoLst.ps
	 */
	income?: { won: number; year: number }
	reasonKo: string
	reasonEn: string
}

const Z = (north: number, central: number, south: number, jeju: number) => ({
	north,
	central,
	south,
	jeju
})

export const FARMLAND_CROPS: CropRule[] = [
	{
		id: 'peanut',
		ko: '땅콩',
		en: 'Peanut',
		priceId: 'peanut',
		jimok: { 전: 3, 답: 1 },
		zones: Z(1, 2, 2, 1),
		plant: [4, 5],
		harvest: [9, 10],
		labor: 2,
		reasonKo:
			'물 빠짐이 좋은 모래 섞인 밭에서 잘 자라고, 비닐 멀칭만 하면 손이 크게 가지 않습니다.',
		reasonEn: 'Grows well in free-draining sandy fields and needs little work once mulched.'
	},
	{
		id: 'perilla-seed',
		ko: '들깨',
		en: 'Perilla seed',
		priceId: 'perilla-seed',
		jimok: { 전: 3, 답: 2 },
		zones: Z(2, 2, 2, 1),
		plant: [6, 7],
		harvest: [10],
		labor: 1,
		income: { won: 596862, year: 2024 },
		reasonKo: '병해충이 적고 어느 지역에서나 잘 자라 처음 농사짓는 땅에도 무난합니다.',
		reasonEn: 'Few pests and grows almost anywhere, so it suits a first season.'
	},
	{
		id: 'sesame',
		ko: '참깨',
		en: 'Sesame',
		priceId: 'sesame',
		jimok: { 전: 3 },
		zones: Z(1, 2, 2, 1),
		plant: [5],
		harvest: [8, 9],
		labor: 3,
		income: { won: 1045564, year: 2024 },
		reasonKo:
			'값이 좋은 작물이지만 습기에 약해 물 빠짐이 좋은 밭이어야 하고, 베고 터는 일이 많습니다.',
		reasonEn: 'Pays well but hates wet soil, and cutting and threshing take a lot of work.'
	},
	{
		id: 'ginger',
		ko: '생강',
		en: 'Ginger',
		priceId: 'ginger',
		jimok: { 전: 3 },
		zones: Z(0, 2, 2, 1),
		plant: [4, 5],
		harvest: [10, 11],
		labor: 3,
		income: { won: 4170854, year: 2024 },
		reasonKo: '따뜻한 곳을 좋아해 충청 이남 밭에 맞고, 서리 오기 전에 캐야 합니다.',
		reasonEn: 'Likes warmth, so it fits fields from Chungcheong southward; dig it before frost.'
	},
	{
		id: 'mung-bean',
		ko: '녹두',
		en: 'Mung bean',
		priceId: 'mung-bean',
		jimok: { 전: 3, 답: 1 },
		zones: Z(1, 2, 2, 1),
		plant: [6, 7],
		harvest: [8, 9],
		labor: 3,
		reasonKo: '척박한 땅에서도 자라지만 꼬투리가 익는 대로 여러 번 따야 해서 손이 갑니다.',
		reasonEn: 'Copes with poor soil, but pods ripen unevenly and are picked several times.'
	},
	{
		id: 'red-bean',
		ko: '팥',
		en: 'Red bean',
		priceId: 'red-bean',
		jimok: { 전: 3, 답: 1 },
		zones: Z(2, 2, 2, 1),
		plant: [6, 7],
		harvest: [9, 10],
		labor: 2,
		reasonKo: '콩보다 늦게 심어도 되고 전국 어디서나 기를 수 있습니다.',
		reasonEn: 'Can be sown later than soybean and grows anywhere in Korea.'
	},
	{
		id: 'soybean',
		ko: '콩',
		en: 'Soybean',
		priceId: 'soybean',
		jimok: { 전: 3, 답: 2 },
		zones: Z(2, 2, 2, 1),
		plant: [6],
		harvest: [10, 11],
		labor: 1,
		income: { won: 454599, year: 2024 },
		reasonKo:
			'기계로 심고 거두기 쉬워 일손이 적게 들고, 논에 물 빠짐 공사를 하면 논콩으로도 짓습니다.',
		reasonEn: 'Easy to mechanise, and drained paddies are widely used for soybean too.'
	},
	{
		id: 'sweet-potato',
		ko: '고구마',
		en: 'Sweet potato',
		priceId: 'sweet-potato',
		jimok: { 전: 3 },
		zones: Z(1, 2, 2, 2),
		plant: [5, 6],
		harvest: [9, 10],
		labor: 2,
		income: { won: 1710559, year: 2024 },
		reasonKo: '모래 섞인 물 빠짐 좋은 밭이 알맞고, 거름이 많지 않아도 잘 듭니다.',
		reasonEn: 'Suits sandy, free-draining fields and does not need rich soil.'
	},
	{
		id: 'potato',
		ko: '감자',
		en: 'Potato',
		priceId: 'potato',
		jimok: { 전: 3 },
		zones: Z(2, 2, 2, 2),
		plant: [3],
		harvest: [6],
		labor: 2,
		income: { won: 1249665, year: 2024 },
		reasonKo: '봄에 심어 6월에 거두면 같은 밭에 가을 작물을 한 번 더 심을 수 있습니다.',
		reasonEn: 'Planted in spring and lifted in June, leaving room for an autumn crop.'
	},
	{
		id: 'garlic',
		ko: '마늘',
		en: 'Garlic',
		priceId: 'garlic',
		jimok: { 전: 3, 답: 2 },
		zones: Z(1, 2, 2, 2),
		plant: [9, 10],
		harvest: [5, 6],
		nextYear: true,
		labor: 3,
		income: { won: 2010609, year: 2024 },
		reasonKo:
			'가을에 심어 겨울을 나는 작물입니다. 남부는 난지형, 중부·북부는 한지형 품종을 고릅니다.',
		reasonEn:
			'Planted in autumn and overwintered; pick southern or northern-type cultivars by region.'
	},
	{
		id: 'onion',
		ko: '양파',
		en: 'Onion',
		priceId: 'onion',
		jimok: { 전: 3, 답: 2 },
		zones: Z(0, 1, 2, 2),
		plant: [10, 11],
		harvest: [5, 6],
		nextYear: true,
		labor: 3,
		income: { won: 1960401, year: 2024 },
		reasonKo:
			'겨울을 나야 해서 따뜻한 남부에 맞고, 남부에서는 벼 거둔 논에 뒷그루로 많이 심습니다.',
		reasonEn: 'Overwinters, so it fits the warm south, often after rice in paddies.'
	},
	{
		id: 'cabbage',
		ko: '배추',
		en: 'Napa cabbage',
		priceId: 'cabbage',
		jimok: { 전: 3 },
		zones: Z(2, 2, 2, 1),
		plant: [8, 9],
		harvest: [11],
		labor: 2,
		income: { won: 2603067, year: 2024 },
		reasonKo:
			'김장용 가을배추는 8월 말에서 9월 초에 심습니다. 서늘한 고랭지에서는 여름배추도 됩니다.',
		reasonEn: 'Autumn kimchi cabbage goes in late August; cool highlands can grow a summer crop.'
	},
	{
		id: 'radish',
		ko: '무',
		en: 'Radish',
		priceId: 'radish',
		jimok: { 전: 3 },
		zones: Z(2, 2, 2, 2),
		plant: [8, 9],
		harvest: [10, 11],
		labor: 1,
		income: { won: 1531514, year: 2024 },
		reasonKo: '씨를 바로 뿌리는 작물이라 손이 적게 가고, 흙이 깊고 부드러운 밭이 좋습니다.',
		reasonEn: 'Direct-sown with little work; likes deep, loose soil.'
	},
	{
		id: 'red-chili-pepper',
		ko: '고추',
		en: 'Chili pepper',
		priceId: 'red-chili-pepper',
		jimok: { 전: 3 },
		zones: Z(2, 2, 2, 1),
		plant: [5],
		harvest: [7, 8, 9, 10],
		labor: 3,
		income: { won: 3361880, year: 2024 },
		reasonKo: '여름 내내 여러 번 따서 팔 수 있지만 지주 세우기, 방제, 수확에 손이 많이 갑니다.',
		reasonEn: 'Picked many times through summer, but staking, spraying and picking take work.'
	},
	{
		id: 'greenonion-2',
		ko: '쪽파',
		en: 'Scallion',
		priceId: 'greenonion-2',
		jimok: { 전: 3 },
		zones: Z(1, 2, 2, 2),
		plant: [8, 9],
		harvest: [10, 11],
		labor: 2,
		income: { won: 3081534, year: 2024 },
		reasonKo: '늦여름에 종구를 심으면 김장철에 거둘 수 있어 텃밭이나 작은 밭에 알맞습니다.',
		reasonEn: 'Bulbs planted in late summer are ready for kimchi season; good for small plots.'
	},
	{
		id: 'corn',
		ko: '옥수수',
		en: 'Corn',
		priceId: null,
		jimok: { 전: 3, 답: 1 },
		zones: Z(2, 2, 2, 1),
		plant: [4, 5],
		harvest: [7, 8],
		labor: 1,
		income: { won: 1135449, year: 2024 },
		reasonKo: '심고 석 달이면 거둘 수 있고 손이 적게 가서 처음 짓는 밭에 많이 심습니다.',
		reasonEn: 'Ready about three months after sowing with little work.'
	},
	{
		id: 'buckwheat',
		ko: '메밀',
		en: 'Buckwheat',
		priceId: 'buckwheat',
		jimok: { 전: 3 },
		zones: Z(2, 2, 1, 2),
		plant: [7, 8],
		harvest: [10],
		labor: 1,
		reasonKo: '서늘한 곳을 좋아하고 자라는 기간이 짧아 거름과 손이 거의 들지 않습니다.',
		reasonEn: 'Likes cool weather, grows fast and needs almost no inputs.'
	},
	{
		id: 'blueberry',
		ko: '블루베리',
		en: 'Blueberry',
		priceId: null,
		jimok: { 전: 2, 과수원: 3 },
		zones: Z(1, 2, 2, 1),
		plant: [3, 11],
		harvest: [6, 7],
		years: '2–3',
		labor: 2,
		income: { won: 6459798, year: 2024 },
		reasonKo:
			'산성 흙이 필요해 피트모스로 흙을 바꿔 심는 경우가 많습니다. 나무 작물이라 한 번 심으면 오래 갑니다.',
		reasonEn: 'Needs acidic soil, often made with peat moss. A long-lived bush crop.'
	},
	{
		id: 'apple',
		ko: '사과',
		en: 'Apple',
		priceId: 'apple',
		jimok: { 과수원: 3, 전: 2 },
		zones: Z(2, 2, 1, 0),
		plant: [3],
		harvest: [9, 10],
		years: '3–4',
		labor: 3,
		income: { won: 5114297, year: 2024 },
		reasonKo:
			'서늘한 곳이 맞아 재배지가 점점 북쪽으로 올라가고 있습니다. 묘목을 심고 몇 년 뒤부터 수확합니다.',
		reasonEn:
			'Prefers cool regions, and growing areas are moving north. Harvest starts a few years after planting.'
	},
	{
		id: 'pear',
		ko: '배',
		en: 'Pear',
		priceId: 'pear',
		jimok: { 과수원: 3, 전: 2 },
		zones: Z(1, 2, 2, 1),
		plant: [3],
		harvest: [9, 10],
		years: '4–5',
		labor: 3,
		income: { won: 4318622, year: 2024 },
		reasonKo: '중부와 남부 과수원에 맞고, 봉지 씌우기와 가지치기에 손이 많이 갑니다.',
		reasonEn: 'Fits central and southern orchards; bagging and pruning take a lot of work.'
	},
	{
		id: 'sweet-persimmon',
		ko: '단감',
		en: 'Sweet persimmon',
		priceId: 'sweet-persimmon',
		jimok: { 과수원: 3, 전: 2 },
		zones: Z(0, 0, 2, 1),
		plant: [3],
		harvest: [10, 11],
		years: '4–5',
		labor: 2,
		income: { won: 2058061, year: 2024 },
		reasonKo: '추위에 약해 경남·전남 같은 따뜻한 남부에서 짓습니다.',
		reasonEn: 'Frost-tender, so it is grown in the warm south such as Gyeongnam and Jeonnam.'
	},
	{
		id: 'rice',
		ko: '벼',
		en: 'Rice',
		priceId: 'rice',
		jimok: { 답: 3 },
		zones: Z(2, 2, 2, 1),
		plant: [5, 6],
		harvest: [9, 10],
		labor: 1,
		income: { won: 571863, year: 2024 },
		reasonKo: '논에 가장 기본인 작물이고, 모내기와 수확을 대부분 기계로 맡길 수 있습니다.',
		reasonEn:
			'The default paddy crop; planting and harvest can mostly be contracted out by machine.'
	},
	{
		id: 'strawberry',
		ko: '딸기',
		en: 'Strawberry',
		priceId: 'strawberry',
		jimok: { 전: 2, 답: 2 },
		zones: Z(1, 2, 2, 2),
		plant: [9],
		harvest: [12, 1, 2, 3, 4],
		greenhouse: true,
		labor: 3,
		income: { won: 10686223, year: 2024 },
		reasonKo:
			'비닐하우스에서 겨울부터 봄까지 거두는 작물입니다. 시설비와 일손이 많이 들지만 매출도 큽니다.',
		reasonEn: 'A greenhouse crop picked from winter to spring; high cost and labour, high sales.'
	},
	{
		id: 'cherry-tomato',
		ko: '방울토마토',
		en: 'Cherry tomato',
		priceId: 'cherry-tomato',
		jimok: { 전: 2, 답: 2 },
		zones: Z(2, 2, 2, 2),
		plant: [3, 8],
		harvest: [5, 6, 7, 10, 11],
		greenhouse: true,
		labor: 3,
		income: { won: 10690553, year: 2024 },
		reasonKo: '비닐하우스에서 봄·가을 두 번 짓는 경우가 많고, 줄기 유인과 수확이 매일 이어집니다.',
		reasonEn: 'Usually grown twice a year in a greenhouse, with daily training and picking.'
	},
	{
		id: 'lettuce',
		ko: '상추',
		en: 'Lettuce',
		priceId: 'lettuce',
		jimok: { 전: 3, 답: 1 },
		zones: Z(2, 2, 2, 2),
		plant: [3, 4, 8, 9],
		harvest: [4, 5, 6, 9, 10, 11],
		greenhouse: true,
		labor: 2,
		income: { won: 5020401, year: 2024 },
		reasonKo:
			'자라는 기간이 짧아 비닐하우스에서 1년에 여러 번 짓고, 노지에서는 봄·가을에 짓습니다.',
		reasonEn: 'Short-cycle; several crops a year under plastic, or spring and autumn outdoors.'
	}
]

/** 시도(법정동코드 앞 2자리)와 위도로 기후대 */
export const zoneOf = (sido: string, lat: number | null): Zone => {
	if (sido === '50') return 'jeju'
	if (sido === '42' || sido === '51') return 'north'
	// 경기·인천 북부는 강원과 비슷하게 춥다
	if ((sido === '41' || sido === '28') && lat !== null && lat >= 37.75) return 'north'
	if (['11', '28', '41', '43', '44', '30', '36'].includes(sido)) return 'central'
	// 경북 북부(안동·영주·봉화 등)는 중부와 비슷하다
	if (sido === '47' && lat !== null && lat >= 36.4) return 'central'
	return 'south'
}

export const ZONE_LABEL: Record<Zone, { ko: string; en: string }> = {
	north: { ko: '북부 (강원·경기 북부)', en: 'North (Gangwon, northern Gyeonggi)' },
	central: { ko: '중부 (경기·충청·경북 북부)', en: 'Central (Gyeonggi, Chungcheong)' },
	south: { ko: '남부 (전라·경상)', en: 'South (Jeolla, Gyeongsang)' },
	jeju: { ko: '제주', en: 'Jeju' }
}

/** 지목 이름(토지특성 lndcgrCodeNm 또는 지번 끝 글자)을 규칙표 지목으로 */
export const normalizeJimok = (name: string | null | undefined): Jimok => {
	const s = (name ?? '').trim()
	if (!s) return 'other'
	if (s === '전' || s.startsWith('전 ')) return '전'
	if (s === '답') return '답'
	if (s === '과' || s.startsWith('과수')) return '과수원'
	if (s === '목' || s.startsWith('목장')) return '목장용지'
	if (s === '임' || s.startsWith('임야')) return '임야'
	return 'other'
}

/** 지목·실제 이용이 농지인지 */
export const isFarmJimok = (j: Jimok) => j === '전' || j === '답' || j === '과수원'

export type CropPick = {
	id: string
	score: number
	/** 추천 근거 꼬리표 (화면에서 언어별 문장으로 바꾼다) */
	tags: ('jimok' | 'use' | 'zone' | 'easy' | 'soon' | 'greenhouse' | 'paddy-drain')[]
}

/** 다음 심는 달까지 남은 달 수 (0 이번 달) */
export const monthsUntil = (months: number[], now: number) =>
	Math.min(...months.map((m) => (m - now + 12) % 12))

/**
 * 순서: 지목이 맞는(2 이상) 작물 가운데 10a당 소득(농촌진흥청 농산물소득조사)이 높은 순.
 * 점수(지목 적합 ×3 + 기후대 ×2 + 실제 이용 +3 + 일손 +1 + 석 달 안 +1)는 소득 자료가 없을 때 순서와 근거 꼬리표에만 쓴다.
 * 지목이 농지가 아니면 밭 기준으로 보고, 화면에서 '농지가 아닙니다' 안내를 따로 한다.
 */
export const rankCrops = (
	input: { jimok: Jimok; use: FarmUse; zone: Zone; month: number },
	limit = 8
): CropPick[] => {
	const base: Jimok = isFarmJimok(input.jimok) ? input.jimok : '전'
	const picks: CropPick[] = []
	for (const c of FARMLAND_CROPS) {
		let fit = c.jimok[base] ?? 0
		// 팜맵상 실제로 밭·과수로 쓰는 논이면 밭 작물도 본다
		if (base === '답' && (input.use === '밭' || input.use === '과수'))
			fit = Math.max(fit, c.jimok['전'] ?? 0)
		const zone = c.zones[input.zone]
		if (fit === 0 || zone === 0) continue
		const tags: CropPick['tags'] = []
		let score = fit * 3 + zone * 2
		if (fit >= 3) tags.push('jimok')
		if (zone >= 2) tags.push('zone')
		if (c.greenhouse) {
			if (input.use === '시설') {
				score += 3
				tags.push('use')
			} else {
				score -= 4
				tags.push('greenhouse')
			}
		} else if (input.use) {
			const ok =
				(input.use === '논' && (c.jimok['답'] ?? 0) >= 2) ||
				(input.use === '밭' && (c.jimok['전'] ?? 0) >= 3) ||
				(input.use === '과수' && (c.jimok['과수원'] ?? 0) >= 3)
			if (ok) {
				score += 3
				tags.push('use')
			}
		}
		if (base === '답' && c.id !== 'rice' && (c.jimok['답'] ?? 0) < 3) tags.push('paddy-drain')
		if (c.labor === 1) {
			score += 1
			tags.push('easy')
		}
		if (monthsUntil(c.plant, input.month) <= 3) {
			score += 1
			tags.push('soon')
		}
		picks.push({ id: c.id, score, tags })
	}
	// 맞는 작물(지목 2 이상) 중 10a당 소득이 높은 순. 소득 자료가 없는 작물은 뒤로, 그 안에서는 점수 순
	const inc = (id: string) => FARMLAND_CROPS.find((c) => c.id === id)?.income?.won ?? -1
	const fits = (id: string) => {
		const c = FARMLAND_CROPS.find((x) => x.id === id)!
		let f = c.jimok[base] ?? 0
		if (base === '답' && (input.use === '밭' || input.use === '과수'))
			f = Math.max(f, c.jimok['전'] ?? 0)
		return f >= 2
	}
	return picks
		.filter((p) => fits(p.id))
		.sort((a, b) => inc(b.id) - inc(a.id) || b.score - a.score)
		.slice(0, limit)
}

/** "5월", "9–10월", 이듬해 표기 */
export const monthRange = (months: number[], isEn: boolean) => {
	const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	const label = (m: number) => (isEn ? names[m - 1] : `${m}`)
	// 연속 구간으로 묶는다 (12→1 넘어가는 것 포함)
	const set = new Set(months)
	const start = months.find((m) => !set.has(m === 1 ? 12 : m - 1)) ?? months[0]
	const runs: number[][] = []
	let m = start
	for (let k = 0; k < 12; k++) {
		if (set.has(m)) {
			const last = runs[runs.length - 1]
			if (last && last[last.length - 1] === (m === 1 ? 12 : m - 1)) last.push(m)
			else runs.push([m])
		}
		m = m === 12 ? 1 : m + 1
	}
	const text = runs
		.map((r) => (r.length === 1 ? label(r[0]) : `${label(r[0])}–${label(r[r.length - 1])}`))
		.join(isEn ? ', ' : '·')
	return isEn ? text : `${text}월`
}
