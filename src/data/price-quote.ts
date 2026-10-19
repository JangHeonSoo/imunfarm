/**
 * 품목 시세 페이지 위쪽 "주식 페이지" 요약 (finviz 종목 페이지의 숫자 표처럼).
 * 서울 KAMIS 일별 조사값(최근 400일)과 월평균(10년)으로 계산한다. 값은 모두 서버에서 정해진다.
 */
import type { ItemAnalysis, ItemSeries } from '@/data/prices'

const DAY = 86400000
const ms = (iso: string) => Date.parse(iso)

export type QuoteStats = {
	current: number | null
	date: string | null
	prev: { price: number; date: string } | null
	change: number | null
	changePct: number | null
	/** 같은 값이 이어진 첫 조사일 (KAMIS 도매가는 몇 주씩 그대로인 경우가 많다) */
	since: string | null
	sinceDays: number | null
	perf: { key: string; pct: number | null }[]
	high52: { price: number; date: string } | null
	low52: { price: number; date: string } | null
}

/** iso 날짜 이전(같은 날 포함) 마지막 조사값 */
const valueAt = (list: [string, number][], iso: string) => {
	let found: [string, number] | null = null
	for (const p of list) {
		if (p[0] > iso) break
		found = p
	}
	return found
}

export const buildQuote = (
	series: ItemSeries,
	regionId: string,
	analysis: ItemAnalysis
): QuoteStats => {
	const list = series.daily[regionId] ?? []
	const last = list[list.length - 1] ?? null
	if (!last || analysis.current == null)
		return {
			current: null,
			date: null,
			prev: null,
			change: null,
			changePct: null,
			since: null,
			sinceDays: null,
			perf: [],
			high52: null,
			low52: null
		}
	const [date, current] = last
	const prevPoint = list.length > 1 ? list[list.length - 2] : null
	const change = prevPoint ? current - prevPoint[1] : null
	const pctOf = (then: number | null | undefined) =>
		then ? Math.round(((current - then) / then) * 1000) / 10 : null

	let k = list.length - 1
	while (k > 0 && list[k - 1][1] === current) k--
	const since = list[k][0]

	const back = (days: number) => {
		const iso = new Date(ms(date) - days * DAY).toISOString().slice(0, 10)
		const p = valueAt(list, iso)
		// 너무 오래된 값(목표일보다 45일 넘게 앞)은 비교하지 않는다
		return p && ms(iso) - ms(p[0]) <= 45 * DAY ? p[1] : null
	}
	const ytdStart = list.find((p) => p[0] >= `${date.slice(0, 4)}-01-01`)
	const perf = [
		{ key: 'w1', pct: pctOf(back(7)) },
		{ key: 'm1', pct: pctOf(back(30)) },
		{ key: 'm3', pct: pctOf(back(91)) },
		{ key: 'm6', pct: pctOf(back(182)) },
		{ key: 'ytd', pct: ytdStart && ytdStart[0] < date ? pctOf(ytdStart[1]) : null },
		{ key: 'y1', pct: pctOf(back(365)) }
	]

	const year = list.filter((p) => ms(date) - ms(p[0]) < 365 * DAY)
	const hi = year.reduce<[string, number] | null>((m, p) => (!m || p[1] > m[1] ? p : m), null)
	const lo = year.reduce<[string, number] | null>((m, p) => (!m || p[1] < m[1] ? p : m), null)

	return {
		current,
		date,
		prev: prevPoint ? { price: prevPoint[1], date: prevPoint[0] } : null,
		change,
		changePct: prevPoint ? pctOf(prevPoint[1]) : null,
		since,
		sinceDays: Math.round((ms(date) - ms(since)) / DAY),
		perf,
		high52: hi ? { price: hi[1], date: hi[0] } : null,
		low52: lo ? { price: lo[1], date: lo[0] } : null
	}
}
