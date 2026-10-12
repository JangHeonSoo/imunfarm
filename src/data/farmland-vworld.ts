/**
 * 땅 주소 → 필지 정보 (브라우저 전용, /tools/farmland-crop-finder/ 화면이 부른다).
 * 브이월드는 해외 서버(Cloudflare)의 요청을 막아서 방문자 브라우저에서 JSONP 로 부른다.
 * 인증키는 imun.farm 도메인에 묶인 공개용 키다 (PUBLIC_VWORLD_KEY).
 *
 * 1) 지오코더 2.0   https://api.vworld.kr/req/address   주소 → 좌표 (지번 먼저, 안 되면 도로명)
 * 2) 2D 데이터 2.0  https://api.vworld.kr/req/data      좌표 → 연속지적도 필지 (pnu·지번·경계)
 * 3) NED 토지특성   https://api.vworld.kr/ned/data/getLandCharacteristics   pnu → 지목·면적·용도지역·이용상황
 */

const KEY = import.meta.env.PUBLIC_VWORLD_KEY as string | undefined
const DOMAIN = 'https://imun.farm'
const TIMEOUT = 10000

export const vworldReady = () => !!KEY

export type Parcel = {
	address: string
	pnu: string
	/** 지번 (끝 글자가 지목, 예: 123-4전) */
	jibun: string | null
	lon: number
	lat: number
	/** 필지 경계 [경도, 위도] 고리들 (2단계 3D 배치용) */
	polygon: [number, number][][]
}

export type LandFacts = {
	jimok: string | null
	areaM2: number | null
	zoning: string | null
	/** 토지이용상황 (예: 전, 답, 과수원, 단독) */
	landUse: string | null
	year: string | null
}

let seq = 0

/** JSONP 한 번 부르기. 시간이 넘거나 스크립트가 실패하면 reject, 끝나면 콜백·태그를 지운다 */
function jsonp(base: string, params: Record<string, string | number | boolean>): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const name = `__imVworld${Date.now().toString(36)}${seq++}`
		const w = window as unknown as Record<string, unknown>
		const script = document.createElement('script')
		const done = () => {
			clearTimeout(timer)
			delete w[name]
			script.remove()
		}
		const timer = setTimeout(() => {
			done()
			reject(new Error('timeout'))
		}, TIMEOUT)
		w[name] = (data: unknown) => {
			done()
			resolve(data)
		}
		script.onerror = () => {
			done()
			reject(new Error('script'))
		}
		const q = new URLSearchParams({
			...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
			key: KEY ?? '',
			domain: DOMAIN,
			callback: name
		})
		script.src = `${base}?${q}`
		document.head.append(script)
	})
}

/** 브이월드가 가끔 맞는 키에도 인증키 오류(INCORRECT_KEY)를 돌려줘서 조금 쉬었다가 세 번 더 부른다 */
async function call(
	base: string,
	params: Record<string, string | number | boolean>
): Promise<unknown> {
	const failed = (d: unknown) => {
		const o = d as {
			response?: { status?: string }
			landCharacteristicss?: { resultCode?: string }
		}
		return o?.response?.status === 'ERROR' || !!o?.landCharacteristicss?.resultCode
	}
	for (let i = 0; i < 3; i++) {
		try {
			const d = await jsonp(base, params)
			if (!failed(d)) return d
		} catch {
			// 아래에서 다시
		}
		await new Promise((r) => setTimeout(r, 400 * (i + 1)))
	}
	return jsonp(base, params)
}

/** 1) 주소 → 좌표. text 는 브이월드가 고친 주소 (예: 250 → 250-1), type 은 지번(PARCEL)·도로명(ROAD) 중 맞은 쪽 */
export async function geocode(
	address: string
): Promise<{ lon: number; lat: number; text: string; type: 'PARCEL' | 'ROAD' } | null> {
	for (const type of ['PARCEL', 'ROAD'] as const) {
		const data = (await call('https://api.vworld.kr/req/address', {
			service: 'address',
			request: 'GetCoord',
			version: '2.0',
			crs: 'EPSG:4326',
			type,
			refine: true,
			simple: false,
			format: 'json',
			errorformat: 'json',
			address
		})) as {
			response?: {
				status?: string
				result?: { point?: { x: string; y: string } }
				refined?: { text?: string }
			}
		}
		const r = data.response
		if (r?.status === 'OK' && r.result?.point)
			return {
				lon: Number(r.result.point.x),
				lat: Number(r.result.point.y),
				text: r.refined?.text || address,
				type
			}
	}
	return null
}

function ringsOf(g?: { type: string; coordinates: unknown }): [number, number][][] {
	if (!g) return []
	if (g.type === 'Polygon') return g.coordinates as [number, number][][]
	if (g.type === 'MultiPolygon') return (g.coordinates as [number, number][][][]).flat()
	return []
}

/** 2) 좌표 → 필지 (연속지적도 LP_PA_CBND_BUBUN) */
export async function parcelAt(lon: number, lat: number): Promise<Parcel | null> {
	const data = (await call('https://api.vworld.kr/req/data', {
		service: 'data',
		request: 'GetFeature',
		version: '2.0',
		data: 'LP_PA_CBND_BUBUN',
		geomFilter: `POINT(${lon} ${lat})`,
		geometry: true,
		attribute: true,
		crs: 'EPSG:4326',
		format: 'json',
		errorformat: 'json',
		size: 1,
		page: 1
	})) as {
		response?: {
			result?: {
				featureCollection?: {
					features?: {
						geometry?: { type: string; coordinates: unknown }
						properties?: Record<string, string>
					}[]
				}
			}
		}
	}
	const f = data.response?.result?.featureCollection?.features?.[0]
	const p = f?.properties
	if (!p?.pnu) return null
	return {
		address: p.addr ?? '',
		pnu: p.pnu,
		jibun: p.jibun ?? null,
		lon,
		lat,
		polygon: ringsOf(f?.geometry)
	}
}

/** 3) pnu → 토지특성. 해마다 한 줄씩 오래된 해부터 오므로(2013년부터 18줄 정도) 넉넉히 받아 가장 최근 해를 쓴다 */
export async function landFacts(pnu: string): Promise<LandFacts | null> {
	const data = (await call('https://api.vworld.kr/ned/data/getLandCharacteristics', {
		pnu,
		format: 'json',
		numOfRows: 50,
		pageNo: 1
	})) as { landCharacteristicss?: { field?: Record<string, string>[] } }
	const rows = (data.landCharacteristicss?.field ?? []).filter((r) => r.lndcgrCodeNm || r.lndpclAr)
	if (!rows.length) return null
	rows.sort((a, b) => String(b.stdrYear ?? '').localeCompare(String(a.stdrYear ?? '')))
	const r = rows[0]
	const s = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v))
	const area = Number(r.lndpclAr)
	return {
		jimok: s(r.lndcgrCodeNm),
		areaM2: Number.isFinite(area) && area > 0 ? area : null,
		zoning: s(r.prposArea1Nm),
		landUse: s(r.ladUseSittnNm),
		year: s(r.stdrYear)
	}
}

/** 경계로 면적(㎡) 어림 (토지특성 면적이 없을 때만) */
export function polygonAreaM2(rings: [number, number][][]): number | null {
	const ring = rings[0]
	if (!ring || ring.length < 3) return null
	const lat0 = ring[0][1]
	const mx = 111320 * Math.cos((lat0 * Math.PI) / 180)
	const my = 110540
	let s = 0
	for (let i = 0; i < ring.length; i++) {
		const [x1, y1] = ring[i]
		const [x2, y2] = ring[(i + 1) % ring.length]
		s += x1 * mx * (y2 * my) - x2 * mx * (y1 * my)
	}
	return Math.abs(s / 2)
}
