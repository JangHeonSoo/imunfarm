#!/usr/bin/env node
/**
 * aT KAMIS 가격정보(공공데이터포털)에서 도매 시세를 받아 src/data/generated/kamis/ 에 저장한다.
 *
 *   node scripts/kamis/fetch.mjs            # 일별: 마지막 저장일 이후만 이어 받기 (없으면 400일)
 *   node scripts/kamis/fetch.mjs --full     # 일별 400일 전체 다시 받기
 *   node scripts/kamis/fetch.mjs --monthly  # 월별 10년치도 함께 갱신
 *   (출하량 volume.json 은 매번 최근 조사일 8일치를 갱신한다. 끄려면 --no-volume)
 *
 * 인증키는 환경변수 DATA_GO_KR_KEY 또는 repo 루트 .env 에서 읽는다.
 * 저장 파일은 빌드 때 그대로 읽히므로 배포 환경에는 키가 필요 없다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'src', 'data', 'generated', 'kamis')
const BASE = 'https://apis.data.go.kr/B552845'
const DAILY_DAYS = 400
/** 10년 전 같은 달까지 들어가도록 한 해 더 받는다 */
const MONTHLY_YEARS = 11
const PAGE = 1000

const args = new Set(process.argv.slice(2))

const readKey = () => {
	if (process.env.DATA_GO_KR_KEY) return process.env.DATA_GO_KR_KEY.trim()
	const envPath = join(ROOT, '.env')
	if (existsSync(envPath)) {
		const line = readFileSync(envPath, 'utf8')
			.split('\n')
			.find((l) => l.startsWith('DATA_GO_KR_KEY='))
		if (line) return line.slice('DATA_GO_KR_KEY='.length).trim()
	}
	throw new Error('DATA_GO_KR_KEY 가 없다 (.env 또는 환경변수)')
}
const KEY = readKey()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')
const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000)

const call = async (service, params, attempt = 1, op = 'price') => {
	const qs = new URLSearchParams({ serviceKey: KEY, returnType: 'JSON', numOfRows: String(PAGE), ...params })
	try {
		const res = await fetch(`${BASE}/${service}/${op}?${qs}`, { signal: AbortSignal.timeout(90000) })
		const text = await res.text()
		const json = JSON.parse(text)
		const body = json?.response?.body
		if (!body) throw new Error(`응답 형식 오류: ${text.slice(0, 200)}`)
		const items = body.items?.item ?? []
		return { total: Number(body.totalCount ?? 0), items: Array.isArray(items) ? items : [items] }
	} catch (err) {
		if (attempt >= 4) throw err
		await sleep(1500 * attempt)
		return call(service, params, attempt + 1, op)
	}
}

const callAll = async (service, params, op = 'price') => {
	const rows = []
	for (let page = 1; ; page++) {
		const { total, items } = await call(service, { ...params, pageNo: String(page) }, 1, op)
		rows.push(...items)
		if (!items.length || rows.length >= total) break
	}
	return rows
}

const comboKey = (r) => `${r.ctgry_cd}-${r.item_cd}-${r.vrty_cd}-${r.grd_cd}`

const loadJson = (name, fallback) => {
	const p = join(OUT, name)
	return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback
}
const saveJson = (name, data) => {
	mkdirSync(OUT, { recursive: true })
	writeFileSync(join(OUT, name), JSON.stringify(data) + '\n')
}

/**
 * daily.json
 *   combos: { "300-314-01-04": { ctgry, item, vrty, grd, unit } }
 *   series: { "300-314-01-04": { "1101": { "20260930": 486000, ... } } }
 * 같은 도시에 시장이 여러 개면 그날 값의 평균을 쓴다.
 */
const fetchDaily = async () => {
	const prev = args.has('--full') ? null : loadJson('daily.json', null)
	const today = kstToday()
	const start = new Date(today)
	if (prev?.lastDate) {
		const [y, m, d] = [prev.lastDate.slice(0, 4), prev.lastDate.slice(4, 6), prev.lastDate.slice(6, 8)]
		start.setTime(Date.UTC(+y, +m - 1, +d) - 7 * 86400000)
	} else {
		start.setTime(today.getTime() - DAILY_DAYS * 86400000)
	}

	const combos = prev?.combos ?? {}
	const series = prev?.series ?? {}
	const regions = prev?.regions ?? {}
	const sums = new Map()

	// 하루 수백 건이라 한 달 단위로 끊어 받는다
	for (let from = new Date(start); from <= today; ) {
		const to = new Date(Math.min(today.getTime(), from.getTime() + 30 * 86400000))
		const rows = await callAll('periodWholesale', {
			'cond[exmn_ymd::GTE]': ymd(from),
			'cond[exmn_ymd::LTE]': ymd(to)
		})
		for (const r of rows) {
			const price = Number(r.exmn_dd_prc)
			if (!price) continue
			const key = comboKey(r)
			combos[key] ??= {
				ctgry: r.ctgry_nm,
				item: r.item_nm,
				vrty: r.vrty_nm,
				grd: r.grd_nm,
				unit: `${r.unit_sz}${r.unit}`
			}
			regions[r.sgg_cd] ??= r.sgg_nm
			const id = `${key}|${r.sgg_cd}|${r.exmn_ymd}`
			const s = sums.get(id) ?? { sum: 0, n: 0 }
			s.sum += price
			s.n++
			sums.set(id, s)
		}
		process.stdout.write(`daily ${ymd(from)}-${ymd(to)}: ${rows.length}\n`)
		from = new Date(to.getTime() + 86400000)
	}

	for (const [id, { sum, n }] of sums) {
		const [key, sgg, date] = id.split('|')
		series[key] ??= {}
		series[key][sgg] ??= {}
		series[key][sgg][date] = Math.round(sum / n)
	}

	// 보관 기간을 넘긴 날짜 정리
	const cutoff = ymd(new Date(today.getTime() - DAILY_DAYS * 86400000))
	let lastDate = ''
	for (const bySgg of Object.values(series)) {
		for (const byDate of Object.values(bySgg)) {
			for (const date of Object.keys(byDate)) {
				if (date < cutoff) delete byDate[date]
				else if (date > lastDate) lastDate = date
			}
		}
	}

	saveJson('daily.json', { lastDate, regions, combos, series })
	return lastDate
}

/**
 * monthly.json
 *   series: { "300-314-01-04": { "1101": { "202609": 514200 } } }
 * daily.json 에 나온 품목 조합만 받는다.
 */
const fetchMonthly = async () => {
	const daily = loadJson('daily.json', null)
	if (!daily) throw new Error('daily.json 을 먼저 만들어야 한다')
	const today = kstToday()
	const toYm = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, '0')}`
	const fromYm = `${today.getUTCFullYear() - MONTHLY_YEARS}${String(today.getUTCMonth() + 1).padStart(2, '0')}`

	const wanted = new Set(args.has('--monthly-all') ? Object.keys(daily.combos) : loadWantedCombos())
	const byItem = new Map()
	for (const key of wanted) {
		const [ctgry, item] = key.split('-')
		byItem.set(`${ctgry}-${item}`, true)
	}

	const series = {}
	for (const ci of byItem.keys()) {
		const [ctgry, item] = ci.split('-')
		const rows = await callAll('perYearMonth', {
			'cond[exmn_ym::GTE]': fromYm,
			'cond[exmn_ym::LTE]': toYm,
			'cond[se_cd::EQ]': '02',
			'cond[ctgry_cd::EQ]': ctgry,
			'cond[item_cd::EQ]': item
		})
		for (const r of rows) {
			const key = comboKey(r)
			if (!wanted.has(key)) continue
			const avg = Number(r.pmm_avgprc)
			if (!avg) continue
			series[key] ??= {}
			series[key][r.sgg_cd] ??= {}
			series[key][r.sgg_cd][r.exmn_ym] = avg
		}
		process.stdout.write(`monthly ${ci}: ${rows.length}\n`)
	}
	saveJson('monthly.json', { fromYm, toYm, series })
}

/**
 * volume.json — 도매시장 출하(반입)량. 한국농수산식품유통공사_출하량 추이 정보.
 *   dates: { "20261001": { "seoul": { "오이|백다다기": [오늘 kg, 1주 전 kg] } } }
 * 오늘 값은 1주 전 값이 함께 있는 행만 더해 같은 출하처끼리 비교한다.
 * 우리 5개 도시와 volume-items.json 에 있는 품목만 남긴다.
 */
const VOLUME_DAYS = 8
const CITY_OF_MARKET = {
	서울가락: 'seoul',
	서울강서: 'seoul',
	부산엄궁: 'busan',
	부산반여: 'busan',
	대구북부: 'daegu',
	광주각화: 'gwangju',
	광주서부: 'gwangju',
	대전오정: 'daejeon',
	대전노은: 'daejeon'
}

const fetchVolume = async () => {
	const daily = loadJson('daily.json', null)
	if (!daily) return
	const mapping = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'volume-items.json'), 'utf8'))
	const wanted = new Set(Object.values(mapping).flatMap((list) => list.map(([m]) => m)))
	const surveyDates = new Set()
	for (const bySgg of Object.values(daily.series))
		for (const byDate of Object.values(bySgg)) for (const d of Object.keys(byDate)) surveyDates.add(d)
	const recent = [...surveyDates].sort().slice(-VOLUME_DAYS)

	const prev = loadJson('volume.json', { dates: {} })
	const dates = {}
	for (const d of recent) {
		// 지난 날짜는 다시 받지 않는다. 최근 2일은 늦게 들어온 행이 있을 수 있어 다시 받는다.
		if (prev.dates[d] && d < recent[recent.length - 2]) {
			dates[d] = prev.dates[d]
			continue
		}
		const rows = await callAll('shipmentSequel', { 'cond[spmt_ymd::EQ]': d }, 'info')
		const agg = {}
		for (const r of rows) {
			const city = CITY_OF_MARKET[r.whsl_mrkt_nm]
			if (!city || !wanted.has(r.gds_mclsf_nm)) continue
			const now = Number(r.avg_spmt_amt)
			const before = Number(r.ww1_bfr_avg_spmt_amt)
			if (!now || !before) continue
			const key = `${r.gds_mclsf_nm}|${r.gds_sclsf_nm}`
			agg[city] ??= {}
			const cell = (agg[city][key] ??= [0, 0])
			cell[0] += now
			cell[1] += before
		}
		dates[d] = agg
		process.stdout.write(`volume ${d}: ${rows.length}\n`)
	}
	saveJson('volume.json', { dates })
}

/** prices.ts 의 품목 코드 목록 (kamis-items.json) */
const loadWantedCombos = () => {
	const p = join(ROOT, 'src', 'data', 'kamis-items.json')
	if (!existsSync(p)) return []
	return Object.values(JSON.parse(readFileSync(p, 'utf8'))).flatMap((v) => v.codes)
}

const main = async () => {
	const lastDate = await fetchDaily()
	if (args.has('--monthly') || args.has('--monthly-all')) await fetchMonthly()
	if (!args.has('--no-volume')) await fetchVolume()
	saveJson('meta.json', {
		source: 'aT KAMIS 가격정보 (공공데이터포털 한국농수산식품유통공사_기간별 중도매인 가격정보, 연월별 도·소매가격정보)',
		lastDate,
		fetchedAtKst: kstToday().toISOString().replace('Z', '+09:00')
	})
	process.stdout.write(`done. lastDate=${lastDate}\n`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
