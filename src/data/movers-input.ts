/**
 * 빌드할 때 '오늘 많이 움직인 품목' 계산에 필요한 자료를 모은다.
 * 시세표 페이지와 /data/movers.json 이 같이 쓴다.
 */
import { ITEMS, REGIONS, buildAnalysis, buildPriceData, getPriceAsOfDate } from '@/data/prices'
import type { MoversInput } from '@/data/movers'
import volumeItems from '@/data/volume-items.json'
import volumeFile from '@/data/generated/kamis/volume.json'

type VolumeCell = [number, number]
const volumeDates = (
	volumeFile as unknown as { dates: Record<string, Record<string, Record<string, VolumeCell>>> }
).dates
const volMap = volumeItems as unknown as Record<string, [string, string[] | null][]>

/** 1주 전 반입량이 이보다 적으면 비율이 과장되므로 비교하지 않는다 (kg) */
const MIN_VOLUME_KG = 500

const cache = new Map<string, MoversInput>()

export const buildMoversInput = (isEn: boolean, today = getPriceAsOfDate()): MoversInput => {
	const key = `${isEn}|${today.toISOString()}`
	const cached = cache.get(key)
	if (cached) return cached

	const { dates, table } = buildPriceData(today)

	const series: MoversInput['series'] = {}
	const why: MoversInput['why'] = {}
	const vol: MoversInput['vol'] = {}
	for (const item of ITEMS) {
		series[item.id] = {}
		why[item.id] = {}
		for (const region of REGIONS) {
			series[item.id][region.id] = dates.map((date) => table[date][region.id][item.id].price)
			const a = buildAnalysis(item, region, today)
			why[item.id][region.id] = { season: a.seasonality, yoy: a.benchmarks[0]?.diffPct ?? null }
		}
		const rules = volMap[item.id]
		if (!rules) continue
		vol[item.id] = {}
		for (const region of REGIONS) {
			vol[item.id][region.id] = {}
			for (const iso of dates) {
				const byKey = volumeDates[iso.replace(/-/g, '')]?.[region.id]
				if (!byKey) continue
				let now = 0
				let before = 0
				for (const [k, [a, b]] of Object.entries(byKey)) {
					const [m, sc] = k.split('|')
					if (rules.some(([rm, rs]) => rm === m && (!rs || rs.includes(sc)))) {
						now += a
						before += b
					}
				}
				if (before >= MIN_VOLUME_KG)
					vol[item.id][region.id][iso] = Math.round(((now - before) / before) * 100)
			}
		}
	}

	const input: MoversInput = {
		dates,
		regions: REGIONS.map((r) => ({ id: r.id, label: isEn ? r.en : r.ko })),
		items: ITEMS.map((i) => ({ id: i.id, label: isEn ? i.en : i.ko })),
		series,
		vol,
		why
	}
	cache.set(key, input)
	return input
}
