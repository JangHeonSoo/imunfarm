/**
 * 쿠팡 파트너스 Open API 클라이언트 (HMAC 서명).
 * 키는 환경변수 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 또는 repo 루트 .env 에서 읽는다.
 * 저장소가 공개이므로 이 모듈로 받은 수익·리포트 숫자는 파일로 커밋하지 않는다.
 */
import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const HOST = 'https://api-gateway.coupang.com'
const BASE = '/v2/providers/affiliate_open_api/apis/openapi/v1'

const readEnv = (name) => {
	if (process.env[name]) return process.env[name].trim()
	const envPath = join(ROOT, '.env')
	if (existsSync(envPath)) {
		const line = readFileSync(envPath, 'utf8')
			.split('\n')
			.find((l) => l.startsWith(`${name}=`))
		if (line) return line.slice(name.length + 1).trim()
	}
	throw new Error(`${name} 가 없다 (.env 또는 환경변수)`)
}

const signedDate = () => {
	const d = new Date().toISOString() // 2026-10-03T09:41:22.123Z
	return `${d.slice(2, 4)}${d.slice(5, 7)}${d.slice(8, 10)}T${d.slice(11, 13)}${d.slice(14, 16)}${d.slice(17, 19)}Z`
}

export const request = async (method, path, { query = {}, body } = {}) => {
	const access = readEnv('COUPANG_ACCESS_KEY')
	const secret = readEnv('COUPANG_SECRET_KEY')
	const qs = new URLSearchParams(query).toString()
	const fullPath = `${BASE}${path}`
	const date = signedDate()
	const signature = createHmac('sha256', secret)
		.update(date + method + fullPath + qs)
		.digest('hex')
	const res = await fetch(`${HOST}${fullPath}${qs ? `?${qs}` : ''}`, {
		method,
		headers: {
			Authorization: `CEA algorithm=HmacSHA256, access-key=${access}, signed-date=${date}, signature=${signature}`,
			'Content-Type': 'application/json;charset=UTF-8'
		},
		body: body ? JSON.stringify(body) : undefined,
		signal: AbortSignal.timeout(30000)
	})
	const text = await res.text()
	let json
	try {
		json = JSON.parse(text)
	} catch {
		throw new Error(`쿠팡 API 응답 형식 오류 (${res.status}): ${text.slice(0, 200)}`)
	}
	if (!res.ok || (json.rCode && json.rCode !== '0'))
		throw new Error(`쿠팡 API 오류 (${res.status}): ${json.rCode ?? ''} ${json.rMessage ?? text.slice(0, 200)}`)
	return json.data
}

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')

/** 리포트: kind = clicks | orders | cancels | commission */
export const report = (kind, start, end) =>
	request('GET', `/reports/${kind}`, { query: { startDate: ymd(start), endDate: ymd(end) } })

/** 키워드 상품 검색 (1시간 10회 제한) */
export const searchProducts = (keyword, limit = 10, subId) =>
	request('GET', '/products/search', {
		query: { keyword, limit: String(limit), ...(subId ? { subId } : {}) }
	})

/** 쿠팡 상품 URL → 파트너스 추적 링크 */
export const deeplink = (urls, subId) =>
	request('POST', '/deeplink', { body: { coupangUrls: urls, ...(subId ? { subId } : {}) } })
