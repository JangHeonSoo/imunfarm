/**
 * 팜맵 조회 (서버 전용, /api/farmland 에서만 부른다).
 * 브이월드 조회(주소·필지·토지특성)는 해외 서버 요청이 막혀 있어 브라우저에서 한다 (src/data/farmland-vworld.ts).
 *
 * 팜맵(농경지 전자지도)  https://apis.data.go.kr/B552895/getFarmmapService/getAreaBasedFarmmapInfo
 * 좌표(EPSG:5179) 반경 안 농경지 → 논·밭·과수·시설. 근처에 농경지가 없으면 XML NODATA_ERROR(resultCode 3)가 온다
 */

export type FarmlandEnv = {
	DATA_GO_KR_KEY?: string
}

const TIMEOUT = 8000

async function getJson(url: string): Promise<unknown> {
	const ctrl = new AbortController()
	const t = setTimeout(() => ctrl.abort(), TIMEOUT)
	try {
		const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		const text = await res.text()
		try {
			return JSON.parse(text)
		} catch {
			// 근처에 농경지가 없으면 JSON 을 달라고 해도 XML 오류로 온다
			if (text.includes('NODATA_ERROR')) return null
			throw new Error('not json: ' + text.slice(0, 120))
		}
	} finally {
		clearTimeout(t)
	}
}

const qs = (o: Record<string, string | number | boolean | undefined>) =>
	Object.entries(o)
		.filter(([, v]) => v !== undefined && v !== '')
		.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
		.join('&')

/** 응답 안 어디에 있든 field 를 가진 객체들을 찾는다 */
function findRows(node: unknown, field: string, out: Record<string, unknown>[] = []) {
	if (Array.isArray(node)) node.forEach((n) => findRows(n, field, out))
	else if (node && typeof node === 'object') {
		const o = node as Record<string, unknown>
		if (field in o) out.push(o)
		else Object.values(o).forEach((v) => findRows(v, field, out))
	}
	return out
}

/** 팜맵: 좌표 근처 농경지의 실제 이용 (논·밭·과수·시설). pnu 가 같은 것을 먼저 고른다 */
export async function farmUse(
	env: FarmlandEnv,
	lon: number,
	lat: number,
	pnu: string
): Promise<'논' | '밭' | '과수' | '시설' | null> {
	if (!env.DATA_GO_KR_KEY) return null
	const [x, y] = toUtmK(lon, lat)
	const url =
		'https://apis.data.go.kr/B552895/getFarmmapService/getAreaBasedFarmmapInfo?' +
		qs({
			serviceKey: env.DATA_GO_KR_KEY,
			positionX: x.toFixed(2),
			positionY: y.toFixed(2),
			radius: 30,
			numOfRows: 20,
			pageNo: 1,
			type: 'json'
		})
	const rows = findRows(await getJson(url), 'fmapInnb')
	if (!rows.length) return null
	// 한 필지가 여러 조각(예: 밭 + 시설)으로 나뉘어 올 수 있다. 같은 pnu 조각 중 가장 많은 이용을 고르고, 같으면 노지(논·밭·과수)를 앞에 둔다
	const same = rows.filter((r) => String(r.pnuLnmCd ?? '') === pnu)
	const uses = (same.length ? same : rows.slice(0, 1))
		.map((r) => String(r.intprNm ?? ''))
		.map((t) => (t.startsWith('과수') ? '과수' : t.startsWith('시설') ? '시설' : t))
		.filter((t): t is '논' | '밭' | '과수' | '시설' => ['논', '밭', '과수', '시설'].includes(t))
	if (!uses.length) return null
	const count = (t: string) => uses.filter((u) => u === t).length
	return [...new Set(uses)].sort(
		(a, b) => count(b) - count(a) || (a === '시설' ? 1 : b === '시설' ? -1 : 0)
	)[0]
}

/**
 * WGS84 경위도 → EPSG:5179 (UTM-K, GRS80). 팜맵 좌표계.
 * 횡메르카토르 전개식 (원점 38°N 127.5°E, 축척 0.9996, 가산 1,000,000 / 2,000,000).
 */
export function toUtmK(lon: number, lat: number): [number, number] {
	const a = 6378137
	const f = 1 / 298.257222101
	const k0 = 0.9996
	const lat0 = (38 * Math.PI) / 180
	const lon0 = (127.5 * Math.PI) / 180
	const e2 = f * (2 - f)
	const ep2 = e2 / (1 - e2)
	const phi = (lat * Math.PI) / 180
	const lam = (lon * Math.PI) / 180
	const M = (p: number) =>
		a *
		((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * p -
			((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * p) +
			((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p) -
			((35 * e2 ** 3) / 3072) * Math.sin(6 * p))
	const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2)
	const T = Math.tan(phi) ** 2
	const C = ep2 * Math.cos(phi) ** 2
	const A = (lam - lon0) * Math.cos(phi)
	const x =
		1000000 +
		k0 *
			N *
			(A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120)
	const y =
		2000000 +
		k0 *
			(M(phi) -
				M(lat0) +
				N *
					Math.tan(phi) *
					(A ** 2 / 2 +
						((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
						((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720))
	return [x, y]
}
