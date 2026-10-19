/**
 * 메인 시세 지도 (finviz 지도처럼 칸 크기 = 시장 크기, 색 = 오르고 내림).
 * - 칸 크기: 최근 7개 조사일 전국 공영도매시장 반입량 평균(aT 출하량 API, trade.json) × 그 품목 kg당 도매가 = 하루 거래금액 추정.
 *   곡식·깨는 도매시장 밖 거래가 많아 작게 나오고 쌀은 자료가 없어서, 모든 칸에 최소 크기를 둔다(MIN_SHARE).
 * - 색: 작년 같은 달 평균보다 비싸면 빨강, 싸면 파랑 (KAMIS 도매가는 몇 주씩 그대로라 하루 변동으로는 색이 거의 안 난다).
 * 크기·작물 목록은 price-map.json, 가격은 prices.ts(서울 KAMIS)에서 가져온다.
 */
import { ITEMS, REGIONS, buildAnalysis, getItemStatus, getPriceAsOfDate } from '@/data/prices'
import { KG_FIRST, perKgOf, unitKgOf } from '@/data/price-popular'
import mapFile from '@/data/price-map.json'
import tradeFile from '@/data/generated/kamis/trade.json'
import pricePhotos from '@/data/price-photos.json'

type Rule = [string, string[] | null, string[]?]
type Crop = {
	ko: string
	en: string
	group: 'veg' | 'fruit' | 'grain' | 'seed'
	items: string[]
	trade: Rule[]
	kgPerUnit?: number
}

export type MapTile = {
	id: string
	name: string
	photo: string | null
	value: number
	yoy: number | null
	price: number | null
	unit: string
	kg: number | null
}
export type MapGroup = { key: string; label: string; tiles: MapTile[] }

const MIN_SHARE = 0.006

const GROUP_LABELS = {
	ko: { veg: '채소', fruit: '과일', grain: '쌀·콩·감자', seed: '깨·땅콩·버섯' },
	en: { veg: 'Vegetables', fruit: 'Fruit', grain: 'Grains and beans', seed: 'Seeds and mushrooms' }
}

const trade = tradeFile as unknown as { dates: Record<string, Record<string, number>> }

/** 규칙에 맞는 반입량(kg)의 최근 조사일 평균 */
const tradeKg = (rules: Rule[]) => {
	const days = Object.values(trade.dates)
	if (!days.length || !rules.length) return 0
	let total = 0
	for (const day of days)
		for (const [key, kg] of Object.entries(day)) {
			const [m, s] = key.split('|')
			for (const [rm, only, except] of rules)
				if (m === rm && (!only || only.includes(s)) && !(except ?? []).includes(s)) total += kg
		}
	return total / days.length
}

export const buildPriceMap = (
	isEn = false
): { groups: MapGroup[]; days: number; lastDate: string } => {
	const today = getPriceAsOfDate()
	const crops = (mapFile as unknown as { crops: Crop[] }).crops
	const tiles = crops.map((crop) => {
		const quotes = crop.items.map((id) => {
			const item = ITEMS.find((i) => i.id === id)!
			const a = buildAnalysis(item, REGIONS[0], today)
			const stale = getItemStatus(item, today).stale || a.current == null
			return { item, a, stale }
		})
		// 칸을 대표하는 품목: 지금 조사되는 첫 품목 (없으면 첫 품목)
		const main = quotes.find((q) => !q.stale) ?? quotes[0]
		const unitKg = unitKgOf(main.item.unitKo)
		const count = Number(main.item.unitKo.match(/^(\d+)개/)?.[1]) || null
		const ref = main.a.current ?? main.a.windowAvg
		const perKg =
			ref == null
				? 0
				: unitKg
					? ref / unitKg
					: count && crop.kgPerUnit
						? ref / (count * crop.kgPerUnit)
						: 0
		return {
			group: crop.group,
			tile: {
				id: main.item.id,
				name: isEn ? crop.en : crop.ko,
				photo: (pricePhotos as string[]).includes(main.item.id)
					? `/images/prices/thumb/${main.item.id}.webp`
					: null,
				value: tradeKg(crop.trade) * perKg,
				yoy: main.stale ? null : (main.a.benchmarks.find((b) => b.yearsAgo === 1)?.diffPct ?? null),
				price: main.stale ? null : main.a.current,
				unit: isEn ? main.item.unitEn : main.item.unitKo,
				kg:
					!isEn && KG_FIRST.has(main.item.id) && !main.stale
						? perKgOf(main.a.current, unitKg)
						: null
			} satisfies MapTile
		}
	})
	const total = tiles.reduce((s, t) => s + t.tile.value, 0) || 1
	const floor = total * MIN_SHARE
	for (const t of tiles) t.tile.value = Math.max(t.tile.value, floor)

	const labels = GROUP_LABELS[isEn ? 'en' : 'ko']
	const groups = (['veg', 'fruit', 'grain', 'seed'] as const).map((key) => ({
		key,
		label: labels[key],
		tiles: tiles
			.filter((t) => t.group === key)
			.map((t) => t.tile)
			.sort((a, b) => b.value - a.value)
	}))
	const dates = Object.keys(trade.dates).sort()
	return { groups, days: dates.length, lastDate: dates[dates.length - 1] ?? '' }
}
