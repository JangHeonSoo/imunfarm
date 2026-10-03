#!/usr/bin/env node
/**
 * 한국전력거래소 공공데이터(공공데이터포털)에서 태양광 계산기용 SMP·REC 단가를 받아
 * src/data/generated/energy/ 에 저장한다.
 *
 *   node scripts/energy/fetch.mjs
 *
 * - SMP: B552115/SmpWithForecastDemand (하루 48건: 육지·제주 × 24시간). 육지 시간별 값의 하루 평균을 쌓는다.
 *   개발계정 호출 한도가 작아 한 번에 MAX_SMP_CALLS 일만 받는다. 최신 날짜부터 받고, 남는 호출로 과거를 채운다.
 * - REC: B552115/RecMarketInfo2 (현물시장 거래일별). 한 번에 전체를 받아 KEEP_DAYS 안쪽만 남긴다.
 * - summary.json: 계산기가 읽는 작은 요약(지난달 평균, 월별 평균). 빌드는 이 파일만 읽는다.
 *
 * 인증키는 환경변수 DATA_GO_KR_KEY 또는 repo 루트 .env 에서 읽는다 (KAMIS 와 같은 키).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'src', 'data', 'generated', 'energy')
const BASE = 'https://apis.data.go.kr/B552115'
const KEEP_DAYS = 400
const MAX_SMP_CALLS = 40
/** 월평균으로 인정할 최소 일수 */
const MIN_MONTH_DAYS = 25

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
const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000)
const addDays = (s, n) => {
	const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)))
	d.setUTCDate(d.getUTCDate() + n)
	return ymd(d)
}
const round = (v, n = 2) => Math.round(v * 10 ** n) / 10 ** n

const call = async (path, params, attempt = 1) => {
	const qs = new URLSearchParams({ serviceKey: KEY, dataType: 'json', pageNo: '1', ...params })
	try {
		const res = await fetch(`${BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(60000) })
		const text = await res.text()
		const body = JSON.parse(text)?.response?.body
		if (!body) throw new Error(`응답 형식 오류: ${text.slice(0, 200)}`)
		const items = body.items?.item ?? []
		return { total: Number(body.totalCount ?? 0), items: Array.isArray(items) ? items : [items] }
	} catch (err) {
		if (attempt >= 3) throw err
		await sleep(1500 * attempt)
		return call(path, params, attempt + 1)
	}
}

const load = (name, fallback) => {
	const p = join(OUT, name)
	return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback
}
const save = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data) + '\n')

mkdirSync(OUT, { recursive: true })
const today = ymd(kstNow())
const cutoff = addDays(today, -KEEP_DAYS)

/* ---------- SMP ---------- */
const smp = load('smp.json', { daily: {} })
const wanted = []
for (let d = today; d >= cutoff; d = addDays(d, -1)) if (!(d in smp.daily)) wanted.push(d)
let calls = 0
for (const d of wanted) {
	if (calls >= MAX_SMP_CALLS) break
	calls++
	let items
	try {
		;({ items } = await call('SmpWithForecastDemand/getSmpWithForecastDemand', { numOfRows: '60', date: d }))
	} catch (err) {
		// 일일 호출 한도 초과 등: 받은 날까지만 저장하고 다음 실행에서 이어 받는다
		console.warn(`SMP ${d} 중단: ${String(err.message).slice(0, 120)}`)
		break
	}
	const land = items.filter((x) => x.areaName === '육지').map((x) => Number(x.smp))
	// 아직 공개 전인 날(오늘·내일)은 비워 두고 다음 실행에서 다시 받는다
	if (land.length >= 24) smp.daily[d] = round(land.reduce((a, b) => a + b, 0) / land.length)
	await sleep(150)
}
for (const d of Object.keys(smp.daily)) if (d < cutoff) delete smp.daily[d]
smp.daily = Object.fromEntries(Object.entries(smp.daily).sort(([a], [b]) => (a < b ? -1 : 1)))
smp.lastDate = Object.keys(smp.daily).at(-1) ?? null
save('smp.json', smp)

/* ---------- REC ---------- */
const recRes = await call('RecMarketInfo2/getRecMarketInfo2', { numOfRows: '2000' })
const rec = { daily: {} }
for (const x of recRes.items) {
	const d = String(x.bzDd)
	const avg = Number(x.landAvgPrc)
	const vol = Number(x.landTrdRecValue)
	if (d >= cutoff && avg > 0) rec.daily[d] = [Math.round(avg), vol]
}
rec.daily = Object.fromEntries(Object.entries(rec.daily).sort(([a], [b]) => (a < b ? -1 : 1)))
rec.lastDate = Object.keys(rec.daily).at(-1) ?? null
save('rec.json', rec)

/* ---------- 요약 ---------- */
const byMonth = (daily, weight) => {
	const m = {}
	for (const [d, v] of Object.entries(daily)) {
		const key = `${d.slice(0, 4)}-${d.slice(4, 6)}`
		const [value, w] = weight ? v : [v, 1]
		m[key] ??= { sum: 0, w: 0, days: 0 }
		m[key].sum += value * w
		m[key].w += w
		m[key].days++
	}
	return m
}
const thisMonth = `${today.slice(0, 4)}-${today.slice(4, 6)}`
const smpMonths = byMonth(smp.daily, false)
const recMonths = byMonth(rec.daily, true)
const smpMonthly = Object.fromEntries(
	Object.entries(smpMonths)
		.filter(([k, v]) => k < thisMonth && v.days >= MIN_MONTH_DAYS)
		.map(([k, v]) => [k, round(v.sum / v.w)])
)
// REC 는 거래일이 주 2회 남짓이라 거래일 수 조건 없이 지난달까지 거래량 가중 평균
const recMonthly = Object.fromEntries(
	Object.entries(recMonths)
		.filter(([k, v]) => k < thisMonth && v.w > 0)
		.map(([k, v]) => [k, Math.round(v.sum / v.w)])
)
const lastFull = Object.keys(smpMonthly).filter((k) => k in recMonthly).at(-1)
if (!lastFull) throw new Error('지난달 SMP·REC 평균을 만들 수 없다')
const summary = {
	month: lastFull,
	smp: smpMonthly[lastFull],
	rec: recMonthly[lastFull],
	smpDays: smpMonths[lastFull].days,
	smpLastDate: smp.lastDate,
	recLastDate: rec.lastDate,
	smpMonthly,
	recMonthly
}
save('summary.json', summary)
console.log(
	`SMP ${calls}회 호출, ${Object.keys(smp.daily).length}일 보유 (최신 ${smp.lastDate}) · REC ${Object.keys(rec.daily).length}거래일 (최신 ${rec.lastDate})`
)
console.log(`기준 ${lastFull}: SMP ${summary.smp}원/kWh, REC ${summary.rec}원`)
