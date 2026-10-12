/**
 * 필지 정보 → 팜맵 실제 이용과 작물 추천 (/tools/farmland-crop-finder/ 가 부른다).
 * 브이월드는 해외 서버 요청을 막아서 주소·필지·토지특성은 브라우저가 조회해 넘겨 준다.
 * GET /api/farmland?pnu=&lon=&lat=&address=&jibun=&jimok=&area=&areaEstimated=&zoning=&landUse=
 * DATA_GO_KR_KEY 는 Cloudflare Pages 비밀값. 없거나 팜맵이 실패해도 팜맵 없이 추천한다.
 * 개발 서버에서만 ?fixture=1 로 예시 응답을 돌려준다 (화면 확인용).
 */
import type { APIRoute } from 'astro'
import { farmUse, type FarmlandEnv } from '@/data/farmland-api'
import { isFarmJimok, normalizeJimok, rankCrops, zoneOf, type FarmUse } from '@/data/farmland-crops'

export const prerender = false

const json = (body: unknown, status = 200, cache = 'no-store') =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache }
	})

const FIXTURE = {
	address: '충청남도 서산시 예시면 예시리 123 (예시 응답)',
	pnu: '4421000000101230000',
	jibun: '123전',
	lon: 126.45,
	lat: 36.78,
	facts: { jimok: '전', areaM2: 2380, zoning: '농림지역', landUse: '전', year: '2026' },
	use: '밭' as FarmUse
}

export const GET: APIRoute = async ({ url, locals }) => {
	const q = url.searchParams
	const month = new Date().getMonth() + 1

	if (import.meta.env.DEV && q.get('fixture') === '1') {
		const f = FIXTURE
		const jimok = normalizeJimok(f.facts.jimok)
		const zone = zoneOf(f.pnu.slice(0, 2), f.lat)
		return json({
			address: f.address,
			pnu: f.pnu,
			jibun: f.jibun,
			jimok: f.facts.jimok,
			isFarmland: isFarmJimok(jimok),
			areaM2: f.facts.areaM2,
			zoning: f.facts.zoning,
			landUse: f.facts.landUse,
			farmUse: f.use,
			zone,
			lon: f.lon,
			lat: f.lat,
			crops: rankCrops({ jimok, use: f.use, zone, month }),
			fixture: true
		})
	}

	// 브라우저가 넘긴 값은 짧은 글자·숫자만 받는다
	const text = (k: string, max = 40) => {
		const v = (q.get(k) ?? '').replace(/\s+/g, ' ').trim()
		return v && v.length <= max ? v : null
	}
	const pnu = q.get('pnu') ?? ''
	const lon = Number(q.get('lon'))
	const lat = Number(q.get('lat'))
	const area = Number(q.get('area'))
	if (!/^\d{19}$/.test(pnu) || !(lon >= 124 && lon <= 132) || !(lat >= 33 && lat <= 39))
		return json({ error: 'no-parcel', message: '이 주소의 필지 정보를 찾지 못했습니다.' }, 400)

	// 키는 실행 시점의 Cloudflare 비밀값에서만 읽는다. import.meta.env 로 읽으면 빌드할 때 .env 값이 번들에 박힌다
	const env: FarmlandEnv = (locals as { runtime?: { env?: FarmlandEnv } }).runtime?.env ?? {}
	const use = await farmUse(env, lon, lat, pnu).catch(() => null)
	const jibun = text('jibun')
	const jimokName = text('jimok', 10) ?? jibun?.replace(/^[\d\s-]+/, '').trim() ?? null
	const jimok = normalizeJimok(jimokName)
	const zone = zoneOf(pnu.slice(0, 2), lat)
	return json(
		{
			address: text('address', 120) ?? '',
			pnu,
			jibun,
			jimok: jimokName,
			isFarmland: isFarmJimok(jimok),
			areaM2: Number.isFinite(area) && area > 0 && area < 1e8 ? area : null,
			areaEstimated: q.get('areaEstimated') === '1',
			zoning: text('zoning'),
			landUse: text('landUse'),
			farmUse: use,
			zone,
			lon,
			lat,
			crops: rankCrops({ jimok, use, zone, month })
		},
		200,
		'public, max-age=86400'
	)
}
