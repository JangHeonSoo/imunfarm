#!/usr/bin/env node
/**
 * 오피넷(한국석유공사) 오픈 API에서 실내등유 시도별 평균 판매가격을 받아
 * src/data/generated/energy/kerosene.json 에 날짜별로 쌓는다 (등유 가격 페이지용).
 *
 *   node scripts/energy/kerosene.mjs
 *
 * - avgSidoPrice.do (prodcd=C004): 17개 시도 + 전국의 "현재" 평균가와 전일 대비 등락. 지난 값은 주지 않으므로
 *   매일 받아 쌓는다(2026-10-28 시작). 같은 날 여러 번 받으면 마지막 값으로 덮는다.
 * - avgAllPrice.do: 전국 평균의 기준일(TRADE_DT). 시도별 값도 이 날짜로 저장한다.
 * - 전국 행의 DIFF 는 가격과 같은 값으로 와서 쓰지 않는다. 등락은 쌓인 값으로 계산한다.
 *
 * 인증키는 환경변수 OPINET_KEY 또는 repo 루트 .env 에서 읽는다.
 * 출처 표기: 오피넷(한국석유공사). 공공데이터포털 이용허락범위 "제한 없음"(15163154).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'src', 'data', 'generated', 'energy', 'kerosene.json')
const BASE = 'https://www.opinet.co.kr/api'
const KEEP_DAYS = 800

const readKey = () => {
	if (process.env.OPINET_KEY) return process.env.OPINET_KEY.trim()
	const envPath = join(ROOT, '.env')
	if (existsSync(envPath)) {
		const line = readFileSync(envPath, 'utf8')
			.split('\n')
			.find((l) => l.startsWith('OPINET_KEY='))
		if (line) return line.slice('OPINET_KEY='.length).trim()
	}
	throw new Error('OPINET_KEY 가 없다 (.env 또는 환경변수)')
}
const KEY = readKey()

const call = async (path, params) => {
	const qs = new URLSearchParams({ out: 'json', certkey: KEY, ...params })
	const res = await fetch(`${BASE}/${path}?${qs}`, { signal: AbortSignal.timeout(30000) })
	const text = await res.text()
	const oil = JSON.parse(text)?.RESULT?.OIL
	if (!Array.isArray(oil)) throw new Error(`응답 형식 오류: ${text.slice(0, 200)}`)
	return oil
}

const all = await call('avgAllPrice.do', {})
const date = all.find((o) => o.PRODCD === 'C004')?.TRADE_DT
if (!/^\d{8}$/.test(date ?? '')) throw new Error('실내등유 기준일을 찾지 못했다')

const prev = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8)) - 86400000)
	.toISOString()
	.slice(0, 10)
	.replace(/-/g, '')

const sido = await call('avgSidoPrice.do', { prodcd: 'C004' })
if (sido.length < 10) throw new Error(`시도 수가 너무 적다: ${sido.length}`)

const data = existsSync(OUT)
	? JSON.parse(readFileSync(OUT, 'utf8'))
	: { source: '오피넷(한국석유공사) 시도별 주유소 평균가격', product: '실내등유', unit: '원/L', regions: {}, series: {} }

for (const o of sido) {
	const code = String(o.SIDOCD)
	const price = Math.round(Number(o.PRICE) * 100) / 100
	if (!price) continue
	data.regions[code] = String(o.SIDONM)
	const s = (data.series[code] ??= {})
	s[date] = price
	// 전날 값이 없으면 공식 등락(DIFF)으로 채운다 (시작일에도 "어제보다"를 보여 주려고). 전국 행은 DIFF 가 틀려 뺀다.
	const diff = Number(o.DIFF)
	if (code !== '00' && Number.isFinite(diff) && !(prev in s)) s[prev] = Math.round((price - diff) * 100) / 100
}

// 오래된 값 정리
const cutoff = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8)) - KEEP_DAYS * 86400000)
	.toISOString()
	.slice(0, 10)
	.replace(/-/g, '')
for (const s of Object.values(data.series)) for (const d of Object.keys(s)) if (d < cutoff) delete s[d]

data.lastDate = date
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n')
console.log(`실내등유 ${date}: ${sido.length}개 지역, 전국 ${data.series['00']?.[date] ?? '-'}원/L`)
