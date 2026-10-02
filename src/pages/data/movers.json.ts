/**
 * 매일 점검용: 지역별 '오늘 많이 움직인 품목', 근거, 사람이 봐야 할 표시(flags)와 데이터 완결성.
 * Hermes 07시 확인 작업이 이 파일을 읽어 보고한다.
 */
import type { APIRoute } from 'astro'
import daily from '@/data/generated/kamis/daily.json'
import { buildMovers } from '@/data/movers'
import { buildMoversInput } from '@/data/movers-input'
import { getPriceAsOfDate } from '@/data/prices'

export const prerender = true

export const GET: APIRoute = () => {
	const today = getPriceAsOfDate()
	const input = buildMoversInput(false, today)
	const i = input.dates.length - 1

	// 마지막 조사일의 행 수가 직전 조사일보다 크게 적으면 하루치가 덜 들어온 것일 수 있다
	const counts: Record<string, number> = {}
	for (const bySgg of Object.values(
		(daily as { series: Record<string, Record<string, Record<string, number>>> }).series
	))
		for (const byDate of Object.values(bySgg))
			for (const d of Object.keys(byDate)) counts[d] = (counts[d] ?? 0) + 1
	const days = Object.keys(counts).sort()
	const last = days[days.length - 1]
	const prev = days[days.length - 2]
	const completeness = {
		lastDate: last,
		rows: counts[last],
		prevDate: prev,
		prevRows: counts[prev],
		ok: counts[last] >= counts[prev] * 0.9
	}

	const regions = Object.fromEntries(
		input.regions.map((r) => [r.id, buildMovers(input, r.id, i, false)])
	)
	const flagged = Object.entries(regions).flatMap(([region, list]) =>
		list.filter((m) => m.flags.length).map((m) => ({ region, ...m }))
	)

	return new Response(
		JSON.stringify({ asOf: input.dates[i], completeness, flagged, regions }, null, 1),
		{ headers: { 'content-type': 'application/json; charset=utf-8' } }
	)
}
