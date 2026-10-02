/**
 * '오늘 많이 움직인 품목'과 그 근거.
 * 시세표 페이지(서버·브라우저)와 /data/movers.json(매일 점검용)이 같은 계산을 쓴다.
 * 근거는 데이터로 확인되는 사실만 쓴다. 날씨·작황 같은 외부 원인은 넣지 않는다.
 */

export type MoversInput = {
	/** 최근 조사일 (오름차순, YYYY-MM-DD) */
	dates: string[]
	regions: { id: string; label: string }[]
	items: { id: string; label: string }[]
	/** item → region → dates 순서 가격 (조사 없는 날은 직전 값, 없으면 null) */
	series: Record<string, Record<string, (number | null)[]>>
	/** item → region → date → 도매시장 반입량 1주 전 대비 % */
	vol: Record<string, Record<string, Record<string, number>>>
	/** item → region → 10년 월별 계절지수, 작년 같은 달 대비 % */
	why: Record<string, Record<string, { season: (number | null)[]; yoy: number | null }>>
}

export type Mover = {
	id: string
	label: string
	price: number
	delta: number
	reasons: string[]
	/** 매일 점검에서 사람이 한 번 봐야 할 이유 */
	flags: string[]
}

const DAY = 86400000
const ms = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
const signed = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(0)}%`

export function analyzeMove(
	input: MoversInput,
	itemId: string,
	regionId: string,
	i: number,
	isEn: boolean
) {
	const values = input.series[itemId]?.[regionId] ?? []
	const now = values[i]
	const prev = values[i - 1]
	const reasons: string[] = []
	const flags: string[] = []
	if (now == null || !prev) return { delta: 0, reasons, flags }
	const delta = Math.round(((now - prev) / prev) * 1000) / 10
	const sign = Math.sign(now - prev)
	if (sign === 0) return { delta, reasons, flags }

	// 1) 급락 뒤 반등 / 급등 뒤 조정: 하루 변동만 보면 방향을 오해하기 쉽다
	const window = values.slice(0, i + 1).filter((v): v is number => v != null)
	const peak = Math.max(...window)
	const trough = Math.min(...window)
	let context = false
	if (sign > 0 && now <= peak * 0.6) {
		reasons.push(
			isEn
				? `Rebound after a slump (${signed((now / peak - 1) * 100)} vs recent high)`
				: `급락 뒤 반등 (최근 고점보다 ${signed((now / peak - 1) * 100)})`
		)
		context = true
	} else if (sign < 0 && now >= trough * 1.6) {
		reasons.push(
			isEn
				? `Easing after a spike (${signed((now / trough - 1) * 100)} vs recent low)`
				: `급등 뒤 조정 (최근 저점보다 ${signed((now / trough - 1) * 100)})`
		)
		context = true
	}

	// 2) 도매시장 반입량
	const v = input.vol[itemId]?.[regionId]?.[input.dates[i]]
	const hasVolume = v != null && Math.abs(v) >= 15
	if (hasVolume)
		reasons.push(isEn ? `Arrivals ${signed(v)} vs last week` : `반입량 1주 전보다 ${signed(v)}`)

	// 3) 연속 상승·하락
	let streak = 0
	for (let k = i; k > 0; k--) {
		const a = values[k]
		const b = values[k - 1]
		if (a == null || !b || Math.sign(a - b) !== sign) break
		streak++
	}
	if (streak >= 2)
		reasons.push(
			isEn
				? `${streak} surveys in a row ${sign > 0 ? 'up' : 'down'}`
				: `${streak}일 연속 ${sign > 0 ? '상승' : '하락'}`
		)

	// 4) 다른 도시도 같은 방향인지
	const dirs = input.regions
		.map((r) => {
			const s = input.series[itemId]?.[r.id] ?? []
			return s[i] != null && s[i - 1] ? Math.sign((s[i] as number) - (s[i - 1] as number)) : null
		})
		.filter((x): x is number => x != null)
	const same = dirs.filter((d) => d === sign).length
	const allCities = dirs.length >= 3 && same === dirs.length
	const onlyHere = dirs.length >= 3 && same === 1
	if (allCities)
		reasons.push(
			isEn
				? `All ${same} cities ${sign > 0 ? 'up' : 'down'}`
				: `${same}개 도시 모두 ${sign > 0 ? '상승' : '하락'}`
		)
	else if (onlyHere) reasons.push(isEn ? 'Only this city moved' : '이 지역만 움직임')

	// 5) 계절 흐름, 6) 작년 같은 달
	const w = input.why[itemId]?.[regionId]
	let seasonDir = 0
	if (w) {
		const month = Number(input.dates[i].slice(5, 7)) - 1
		const s1 = w.season[month]
		const s0 = w.season[(month + 11) % 12]
		if (s1 && s0) {
			const d = (s1 / s0 - 1) * 100
			if (Math.abs(d) >= 3) {
				seasonDir = Math.sign(d)
				reasons.push(
					isEn
						? `Seasonally ${d > 0 ? 'rising' : 'falling'} now`
						: `이맘때 보통 ${d > 0 ? '오르는' : '내리는'} 시기`
				)
			}
		}
		if (w.yoy != null && Math.abs(w.yoy) >= 10)
			reasons.push(isEn ? `${signed(w.yoy)} vs last year` : `작년 같은 달보다 ${signed(w.yoy)}`)
	}

	// 점검 표시: 근거가 약한 큰 변동, 데이터 오류 의심
	const abs = Math.abs(delta)
	if (abs >= 60) flags.push(`하루 ${abs.toFixed(0)}% 변동: KAMIS 원자료 확인`)
	if (abs >= 40 && onlyHere) flags.push('한 도시만 급변: 데이터 오류 가능')
	if (abs >= 30 && !context && !hasVolume && !allCities && streak < 2)
		flags.push('30% 넘는 변동인데 뒷받침하는 사실 없음')
	if (abs >= 10 && seasonDir !== 0 && seasonDir !== sign && !context && !hasVolume)
		flags.push('계절 흐름과 반대 방향인데 설명 근거 없음')

	return { delta, reasons: reasons.slice(0, 2), flags }
}

export function buildMovers(
	input: MoversInput,
	regionId: string,
	i: number,
	isEn: boolean,
	limit = 10
): Mover[] {
	return input.items
		.map((item) => {
			const price = input.series[item.id]?.[regionId]?.[i]
			if (price == null) return null
			const r = analyzeMove(input, item.id, regionId, i, isEn)
			if (!r.delta) return null
			return {
				id: item.id,
				label: item.label,
				price,
				delta: r.delta,
				reasons: r.reasons,
				flags: r.flags
			}
		})
		.filter((m): m is Mover => m != null)
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
		.slice(0, limit)
}

/** 날짜 문자열 사이 일수 (점검 리포트용) */
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY)
