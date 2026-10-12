/**
 * 내 땅 시설 배치 (2단계, /tools/farmland-crop-finder/). three.js 없이 계산만 한다 (시험·PDF 용으로 따로 쓸 수 있게).
 *
 * 좌표: 필지 무게중심 기준 미터 (x 동쪽, y 북쪽). 시설 각도 a 는 x 축에서 반시계 방향 도(°), 길이(len)는 그 방향.
 *
 * 시설 크기 근거
 * - 단동·연동 비닐하우스, 벤로형 온실: 농림수산식품부 고시 「원예특작시설 내재해형 규격 설계도·시방서」
 *   https://www.law.go.kr/LSW/flDownload.do?flSeq=17880777
 *   10-단동-2형 폭 7.0m·높이 3.3m / 08-연동(민)-1형 폭 7.0m·높이 3.63m(3연동) / 08-자동화-1(벤로형) 폭 8.0m·높이 5.7m
 * - 농막 연면적 20㎡ 이하: 농지법 시행규칙 제3조의2, 농식품부 「농촌체류형 쉼터·농막 운영 지침」(2025.12)
 * - 동 사이 간격 1.6m: 눈 피해를 막으려면 최소 1.5m 이상 (기장군 농업기술센터 게시물, 농촌진흥청 출처 표기). 법정 기준은 없다
 * - 창고·작업 공간·하우스 길이·작업로 폭은 법정 규격이 아니라 화면용 시작값이다
 */

export type P = [number, number]
export type Ring = P[]

export type PieceKind = 'single' | 'multi' | 'smart' | 'storage' | 'shed' | 'compost' | 'yard'

type KindSpec = {
	ko: string
	en: string
	/** 폭 (연동·온실은 한 칸 폭) m */
	w: number
	/** 높이 m (0 이면 바닥만) */
	h: number
	len: number
	minLen: number
	maxLen: number
	step: number
	/** 연동·온실 칸 수 */
	n?: { def: number; min: number; max: number }
	greenhouse?: boolean
	/** 물을 대는 시설 */
	water?: boolean
	/** 넓이 한도 ㎡ (넘으면 표시) */
	maxArea?: number
}

export const KINDS: Record<PieceKind, KindSpec> = {
	single: {
		ko: '단동 하우스',
		en: 'Tunnel house',
		w: 7,
		h: 3.3,
		len: 40,
		minLen: 10,
		maxLen: 120,
		step: 5,
		greenhouse: true,
		water: true
	},
	multi: {
		ko: '연동 하우스',
		en: 'Multi-span house',
		w: 7,
		h: 3.63,
		len: 40,
		minLen: 10,
		maxLen: 120,
		step: 5,
		n: { def: 3, min: 2, max: 10 },
		greenhouse: true,
		water: true
	},
	smart: {
		ko: '스마트팜 온실',
		en: 'Smart-farm glasshouse',
		w: 8,
		h: 5.7,
		len: 32,
		minLen: 16,
		maxLen: 120,
		step: 4,
		n: { def: 2, min: 1, max: 10 },
		greenhouse: true,
		water: true
	},
	storage: {
		ko: '창고',
		en: 'Storage',
		w: 6,
		h: 4.5,
		len: 9,
		minLen: 4,
		maxLen: 30,
		step: 1,
		water: true
	},
	shed: {
		ko: '농막',
		en: 'Farm hut',
		w: 3,
		h: 2.6,
		len: 6,
		minLen: 3,
		maxLen: 12,
		step: 0.5,
		maxArea: 20
	},
	compost: {
		ko: '퇴비장',
		en: 'Compost bay',
		w: 4,
		h: 1.2,
		len: 5,
		minLen: 3,
		maxLen: 15,
		step: 1
	},
	yard: {
		ko: '작업·주차',
		en: 'Work & parking',
		w: 6,
		h: 0,
		len: 8,
		minLen: 4,
		maxLen: 30,
		step: 1
	}
}

export const KIND_ORDER: PieceKind[] = [
	'single',
	'multi',
	'smart',
	'storage',
	'shed',
	'compost',
	'yard'
]

export type Piece = {
	id: number
	k: PieceKind
	x: number
	y: number
	/** 길이 방향 각도 ° */
	a: number
	len: number
	/** 연동·온실 칸 수 (나머지는 1) */
	n: number
}

export type Layout = {
	pieces: Piece[]
	/** 물 들어오는 곳 (관정·수도 인입). 없으면 길 쪽 */
	well: P | null
	/** 배수 나가는 곳. 없으면 구거·길 쪽 */
	outlet: P | null
}

/** open = 이웃 필지가 없는 변 (지번 없는 길·공터인 경우가 많다) */
export type EdgeTag = 'road' | 'ditch' | 'river' | 'open' | null

export type Site = {
	ring: Ring
	/** 변 i (ring[i] → ring[i+1]) 바깥에 닿은 땅 */
	tags: EdgeTag[]
	/** 길 필지를 못 찾아 어림했는지 */
	roadGuessed: boolean
	/** 길 쪽을 정한 근거: 도로 필지 / 이웃 필지가 없는 변 / 가장 긴 변 */
	roadFrom: 'parcel' | 'open' | 'longest'
	/** 가장 긴 변 방향 (라디안) */
	theta: number
	area: number
}

// 화면용 시작값 (법정 규격 아님)
const ROAD_W = 3
const EDGE_GAP = 2.5
export const HOUSE_GAP = 1.6
/** 하우스 옆면과 땅 경계 사이 (동 사이 간격과 같게) */
const SIDE_GAP = HOUSE_GAP

// ── 기본 기하 ──────────────────────────────────────────

export function signedArea(r: Ring) {
	let s = 0
	for (let i = 0; i < r.length; i++) {
		const [x1, y1] = r[i]
		const [x2, y2] = r[(i + 1) % r.length]
		s += x1 * y2 - x2 * y1
	}
	return s / 2
}

export const polyArea = (r: Ring) => Math.abs(signedArea(r))

export function centroid(r: Ring): P {
	const a = signedArea(r)
	if (Math.abs(a) < 1e-9) return [avg(r.map((p) => p[0])), avg(r.map((p) => p[1]))]
	let cx = 0
	let cy = 0
	for (let i = 0; i < r.length; i++) {
		const [x1, y1] = r[i]
		const [x2, y2] = r[(i + 1) % r.length]
		const f = x1 * y2 - x2 * y1
		cx += (x1 + x2) * f
		cy += (y1 + y2) * f
	}
	return [cx / (6 * a), cy / (6 * a)]
}

const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / Math.max(1, v.length)

export function inPoly([x, y]: P, r: Ring) {
	let inside = false
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
		const [xi, yi] = r[i]
		const [xj, yj] = r[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
	}
	return inside
}

const rot = ([x, y]: P, t: number): P => [
	x * Math.cos(t) - y * Math.sin(t),
	x * Math.sin(t) + y * Math.cos(t)
]

export const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1])

export function pathLength(pts: P[]) {
	let s = 0
	for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i])
	return s
}

/** 선분 a-b 위에서 p 와 가장 가까운 점 */
function nearestOnSeg(p: P, a: P, b: P): P {
	const dx = b[0] - a[0]
	const dy = b[1] - a[1]
	const l2 = dx * dx + dy * dy
	const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0
	return [a[0] + t * dx, a[1] + t * dy]
}

/** 고리 경계에서 p 와 가장 가까운 점과 그 변 번호 */
export function nearestOnRing(p: P, r: Ring): { pt: P; edge: number } {
	let best = { pt: r[0], edge: 0, d: Infinity }
	for (let i = 0; i < r.length; i++) {
		const q = nearestOnSeg(p, r[i], r[(i + 1) % r.length])
		const d = dist(p, q)
		if (d < best.d) best = { pt: q, edge: i, d }
	}
	return { pt: best.pt, edge: best.edge }
}

function segsCross(a: P, b: P, c: P, d: P) {
	const o = (p: P, q: P, r: P) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
	const d1 = o(c, d, a)
	const d2 = o(c, d, b)
	const d3 = o(a, b, c)
	const d4 = o(a, b, d)
	return d1 * d2 < 0 && d3 * d4 < 0
}

/** 볼록 다각형 clip 으로 subject 를 자른다 (Sutherland–Hodgman) */
export function clipConvex(subject: Ring, clip: Ring): Ring {
	let out = subject
	const ccw = signedArea(clip) > 0
	for (let i = 0; i < clip.length && out.length; i++) {
		const a = clip[i]
		const b = clip[(i + 1) % clip.length]
		const side = (p: P) => {
			const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
			return ccw ? c >= 0 : c <= 0
		}
		const inp = out
		out = []
		for (let j = 0; j < inp.length; j++) {
			const p = inp[j]
			const q = inp[(j + 1) % inp.length]
			const pi = side(p)
			const qi = side(q)
			if (pi) out.push(p)
			if (pi !== qi) {
				const x1 = p[0]
				const y1 = p[1]
				const x2 = q[0]
				const y2 = q[1]
				const x3 = a[0]
				const y3 = a[1]
				const x4 = b[0]
				const y4 = b[1]
				const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
				if (Math.abs(den) > 1e-12) {
					const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
					out.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)])
				}
			}
		}
	}
	return out
}

// ── 필지 ─────────────────────────────────────────────

/**
 * 경위도 고리들 → 무게중심 기준 미터 고리 (가장 넓은 고리 하나, 닫는 점 뺌)와
 * 같은 기준으로 다른 경위도 점을 옮기는 함수 (이웃 필지용)
 */
export function localFrame(
	rings: [number, number][][]
): { ring: Ring; toLocal: (lon: number, lat: number) => P } | null {
	const pick = rings
		.filter((r) => r.length >= 3)
		.map((r) => ({ r, a: polyArea(r) }))
		.sort((a, b) => b.a - a.a)[0]?.r
	if (!pick) return null
	const lon0 = avg(pick.map((p) => p[0]))
	const lat0 = avg(pick.map((p) => p[1]))
	const mx = 111320 * Math.cos((lat0 * Math.PI) / 180)
	const my = 110540
	let ring: Ring = pick.map(([x, y]) => [(x - lon0) * mx, (y - lat0) * my])
	if (ring.length > 3 && dist(ring[0], ring[ring.length - 1]) < 1e-6) ring = ring.slice(0, -1)
	const [cx, cy] = centroid(ring)
	return {
		ring: ring.map(([x, y]) => [x - cx, y - cy]),
		toLocal: (lon, lat) => [(lon - lon0) * mx - cx, (lat - lat0) * my - cy]
	}
}

/** 가장 긴 변 방향 (실제 밭도 긴 변을 따라 이랑과 하우스를 놓는다) */
export function mainAngle(r: Ring) {
	let best = 0
	let ang = 0
	for (let i = 0; i < r.length; i++) {
		const [x1, y1] = r[i]
		const [x2, y2] = r[(i + 1) % r.length]
		const l = Math.hypot(x2 - x1, y2 - y1)
		if (l > best) {
			best = l
			ang = Math.atan2(y2 - y1, x2 - x1)
		}
	}
	return ang
}

/** 변 i 의 바깥쪽 단위 법선 */
function outward(r: Ring, i: number): P {
	const [x1, y1] = r[i]
	const [x2, y2] = r[(i + 1) % r.length]
	const l = Math.hypot(x2 - x1, y2 - y1) || 1
	const s = signedArea(r) > 0 ? 1 : -1
	// 반시계 고리면 오른쪽(dy, -dx)이 바깥
	return [((y2 - y1) / l) * s, (-(x2 - x1) / l) * s]
}

const edgeLen = (r: Ring, i: number) => dist(r[i], r[(i + 1) % r.length])

/** 지번 끝 지목 글자 → 변 표시 (도 = 도로, 구 = 구거, 천 = 하천) */
export function tagOfJibun(jibun: string | null | undefined): EdgeTag {
	const j = (jibun ?? '').replace(/\s/g, '')
	if (j.endsWith('도')) return 'road'
	if (j.endsWith('구')) return 'ditch'
	if (j.endsWith('천')) return 'river'
	return null
}

/**
 * 이웃 필지로 변마다 바깥에 무엇이 닿았는지 본다. 변 위 세 점에서 1.5m 바깥 점이 들어가는 이웃의 지목.
 * 셋 중 하나라도 도로면 도로 (긴 변 일부만 길에 닿는 경우가 많다)
 */
export function classifyEdges(ring: Ring, neighbours: { ring: Ring; tag: EdgeTag }[]): EdgeTag[] {
	if (!neighbours.length) return ring.map(() => null)
	return ring.map((_, i) => {
		const a = ring[i]
		const b = ring[(i + 1) % ring.length]
		const n = outward(ring, i)
		const hits: EdgeTag[] = []
		for (const t of [0.2, 0.5, 0.8]) {
			const p: P = [a[0] + (b[0] - a[0]) * t + n[0] * 1.5, a[1] + (b[1] - a[1]) * t + n[1] * 1.5]
			const nb = neighbours.find((x) => inPoly(p, x.ring))
			hits.push(nb?.tag ?? null)
		}
		if (hits.includes('road')) return 'road'
		if (hits.includes('river')) return 'river'
		if (hits.includes('ditch')) return 'ditch'
		// 세 점 모두 어느 필지에도 안 들어가면 지번 없는 땅 (길인 경우가 많다)
		const empty = [0.2, 0.5, 0.8].every((t) => {
			const p: P = [a[0] + (b[0] - a[0]) * t + n[0] * 1.5, a[1] + (b[1] - a[1]) * t + n[1] * 1.5]
			return !neighbours.some((x) => inPoly(p, x.ring))
		})
		return empty ? 'open' : null
	})
}

export function makeSite(ring: Ring, tags?: EdgeTag[]): Site {
	const t = ring.map((_, i) => tags?.[i] ?? null)
	let roadFrom: Site['roadFrom'] = 'parcel'
	if (!t.includes('road')) {
		// 도로 필지가 없으면 이웃 필지가 없는 변이 이어진 구간 중 가장 긴 곳을 길 쪽으로
		const n = ring.length
		const groups: number[][] = []
		const first = t.findIndex((x) => x !== 'open')
		if (first >= 0)
			for (let k = 0; k < n; k++) {
				const i = (first + 1 + k) % n
				if (t[i] !== 'open') continue
				const last = groups[groups.length - 1]
				if (last && last[last.length - 1] === (i - 1 + n) % n) last.push(i)
				else groups.push([i])
			}
		const len = (g: number[]) => g.reduce((s, i) => s + edgeLen(ring, i), 0)
		const best = groups.sort((a, b) => len(b) - len(a))[0]
		if (best && len(best) >= 4) {
			for (const i of best) t[i] = 'road'
			roadFrom = 'open'
		} else {
			// 그것도 없으면 가장 긴 변 (구거·하천에 닿은 변은 빼고)
			let b = -1
			for (let i = 0; i < n; i++)
				if ((t[i] === null || t[i] === 'open') && (b < 0 || edgeLen(ring, i) > edgeLen(ring, b)))
					b = i
			t[b < 0 ? 0 : b] = 'road'
			roadFrom = 'longest'
		}
	}
	return {
		ring,
		tags: t,
		roadGuessed: roadFrom !== 'parcel',
		roadFrom,
		theta: mainAngle(ring),
		area: polyArea(ring)
	}
}

/** 길에 닿은 변 중 가장 긴 변 */
function roadEdge(site: Site) {
	let best = -1
	site.tags.forEach((t, i) => {
		if (t === 'road' && (best < 0 || edgeLen(site.ring, i) > edgeLen(site.ring, best))) best = i
	})
	return best < 0 ? 0 : best
}

// ── 시설 ─────────────────────────────────────────────

export function pieceSize(p: Piece) {
	const k = KINDS[p.k]
	return { w: k.w * (k.n ? p.n : 1), l: p.len, h: k.h }
}

/** 시설 바닥 사각형 (반시계) */
export function rectOf(p: Piece, grow = 0): Ring {
	const { w, l } = pieceSize(p)
	const t = (p.a * Math.PI) / 180
	const hw = w / 2 + grow
	const hl = l / 2 + grow
	return (
		[
			[-hl, -hw],
			[hl, -hw],
			[hl, hw],
			[-hl, hw]
		] as P[]
	).map((q) => {
		const [x, y] = rot(q, t)
		return [x + p.x, y + p.y] as P
	})
}

function rectInside(rect: Ring, ring: Ring) {
	if (!rect.every((q) => inPoly(q, ring))) return false
	for (let i = 0; i < rect.length; i++)
		for (let j = 0; j < ring.length; j++)
			if (segsCross(rect[i], rect[(i + 1) % 4], ring[j], ring[(j + 1) % ring.length])) return false
	return true
}

/** 볼록 사각형 두 개가 겹치는지 (분리축) */
function rectsOverlap(a: Ring, b: Ring) {
	for (const poly of [a, b]) {
		for (let i = 0; i < poly.length; i++) {
			const p = poly[i]
			const q = poly[(i + 1) % poly.length]
			const nx = q[1] - p[1]
			const ny = p[0] - q[0]
			const proj = (r: Ring) => r.map(([x, y]) => x * nx + y * ny)
			const pa = proj(a)
			const pb = proj(b)
			if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6)
				return false
		}
	}
	return true
}

let nextId = 1
export const newId = (layout: Layout) => Math.max(nextId++, ...layout.pieces.map((p) => p.id + 1))

export function makePiece(k: PieceKind, x: number, y: number, a: number, id: number): Piece {
	const s = KINDS[k]
	return { id, k, x, y, a, len: s.len, n: s.n?.def ?? 1 }
}

/** 시설을 땅 안 빈 곳에 놓는다. 못 찾으면 무게중심 (ok = false) */
export function placeNew(site: Site, layout: Layout, k: PieceKind): Piece & { ok?: boolean } {
	const id = newId(layout)
	const a = (site.theta * 180) / Math.PI
	const p = makePiece(k, 0, 0, a, id)
	// 길이가 땅보다 길면 줄인다
	const fit = fitLength(site, p)
	if (fit) p.len = fit
	const others = layout.pieces.map((q) => rectOf(q, 0.8))
	const free = (q: Piece) => {
		const r = rectOf(q)
		return rectInside(rectOf(q, 0.5), site.ring) && !others.some((o) => rectsOverlap(r, o))
	}
	// 길 쪽 시설(창고·농막·작업 공간)은 길 가까이부터, 하우스는 가운데부터 찾는다
	const near = ['storage', 'shed', 'yard', 'compost'].includes(k)
	const rd = roadEdge(site)
	const target: P = near
		? (() => {
				const a = site.ring[rd]
				const b = site.ring[(rd + 1) % site.ring.length]
				return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
			})()
		: centroid(site.ring)
	const cands = gridPoints(site.ring, Math.max(1, Math.sqrt(site.area) / 40)).sort(
		(u, v) => dist(u, target) - dist(v, target)
	)
	for (const turn of [0, 90]) {
		for (const c of cands) {
			const q = { ...p, x: c[0], y: c[1], a: a + turn }
			if (free(q)) return { ...q, ok: true }
		}
	}
	const c = centroid(site.ring)
	return { ...p, x: c[0], y: c[1], ok: false }
}

/** 이 방향으로 땅 가운데를 지나는 최대 길이 (step 단위로 내림). 하우스가 땅보다 길지 않게 */
function fitLength(site: Site, p: Piece): number | null {
	const s = KINDS[p.k]
	const t = (p.a * Math.PI) / 180
	const u: P = [Math.cos(t), Math.sin(t)]
	const c = centroid(site.ring)
	let lo = 0
	while (lo < 400 && inPoly([c[0] + u[0] * lo, c[1] + u[1] * lo], site.ring)) lo += 0.5
	let hi = 0
	while (hi < 400 && inPoly([c[0] - u[0] * hi, c[1] - u[1] * hi], site.ring)) hi += 0.5
	const span = lo + hi - 2 * EDGE_GAP
	if (span >= p.len) return null
	const l = Math.floor(span / s.step) * s.step
	return Math.max(s.minLen, Math.min(s.maxLen, l))
}

function gridPoints(r: Ring, cell: number): P[] {
	const xs = r.map((p) => p[0])
	const ys = r.map((p) => p[1])
	const out: P[] = []
	for (let x = Math.min(...xs) + cell / 2; x < Math.max(...xs); x += cell)
		for (let y = Math.min(...ys) + cell / 2; y < Math.max(...ys); y += cell)
			if (inPoly([x, y], r)) out.push([x, y])
	return out
}

/** 가로줄 y 에서 다각형 안쪽 구간들 */
function scan(r: Ring, y: number): [number, number][] {
	const xs: number[] = []
	for (let i = 0; i < r.length; i++) {
		const [x1, y1] = r[i]
		const [x2, y2] = r[(i + 1) % r.length]
		if (y1 === y2) continue
		if (y >= Math.min(y1, y2) && y < Math.max(y1, y2))
			xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
	}
	xs.sort((a, b) => a - b)
	const out: [number, number][] = []
	for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]])
	return out
}

function overlapIv(a: [number, number][], b: [number, number][]) {
	const out: [number, number][] = []
	for (const [a1, a2] of a)
		for (const [b1, b2] of b) {
			const s = Math.max(a1, b1)
			const e = Math.min(a2, b2)
			if (e > s) out.push([s, e])
		}
	return out
}

/**
 * 자동 배치: 하우스가 가장 넓게 들어가는 배치를 고른다.
 * 1) 하우스 방향(긴 변들 방향과 그 직각)과 줄 시작 위치를 바꿔 가며 하우스만 채워 보고 넓은 순으로 몇 개 남긴다.
 * 2) 그 방향들에서 창고·작업 공간을 길 변 여러 자리(끝·가운데)에 놓아 보고, 하우스가 가장 넓게 남는 자리를 고른다.
 * 땅 가장자리는 작업로로 비워 둔다. 노지 작물이면 같은 자리에 창고·작업 공간만 둔다.
 */
export function autoLayout(site: Site, opts: { houses?: boolean } = {}): Layout {
	const area = (ps: Piece[]) => ps.reduce((s, p) => s + p.len * KINDS[p.k].w, 0)
	// 1) 방향·줄 위치
	const tries: { t: number; phase: number; a: number }[] = []
	for (const t of houseAngles(site.ring))
		for (const phase of [-1, 0, 0.25, 0.5, 0.75]) {
			const a = area(fillHouses(site, [], t, phase))
			tries.push({ t, phase, a })
		}
	tries.sort((u, v) => v.a - u.a)
	const top = tries.filter((x, i) => i < 12 && x.a > 0)
	if (!top.length) top.push({ t: site.theta, phase: -1, a: 0 })

	// 2) 창고·작업 공간 자리
	type Pick = { hub: Piece[]; houses: Piece[]; a: number }
	let withYard: Pick | null = null
	let storageOnly: Pick | null = null
	for (const anchor of hubAnchors(site))
		for (const yard of [true, false]) {
			const hub = hubAt(site, anchor, yard)
			if (!hub) continue
			const blocked = hub.map((p) => rectOf(p, HOUSE_GAP))
			const entry = entryOf(site, { pieces: hub, well: null, outlet: null })
			if (entry) blocked.push(corridor(entry.a, entry.b, ROAD_W + 1))
			for (const x of top) {
				const houses = fillHouses(site, blocked, x.t, x.phase)
				const pick = { hub, houses, a: area(houses) - houses.length * 2 }
				if (yard && (!withYard || pick.a > withYard.a)) withYard = pick
				if (!yard && (!storageOnly || pick.a > storageOnly.a)) storageOnly = pick
			}
		}
	// 작업 공간 때문에 하우스가 많이 줄면 (작은 땅) 창고만 둔다
	let best = withYard
	if (storageOnly && (!best || storageOnly.a > best.a * 1.25 + 20)) best = storageOnly
	const hub = best?.hub ?? []
	const pieces = [...hub]
	if (opts.houses !== false) {
		pieces.push(...(best?.houses ?? fillHouses(site, [], top[0].t, top[0].phase)))
		// 3) 남은 자투리(좁은 꼬리 등)에 다른 방향으로 더 들어가면 채운다
		for (let round = 0; round < 2; round++) {
			const blocked = pieces.map((p) => rectOf(p, HOUSE_GAP))
			let add: Piece[] = []
			for (const x of tries) {
				const more = fillHouses(site, blocked, x.t, x.phase)
				if (area(more) > area(add)) add = more
			}
			if (area(add) < 60) break
			pieces.push(...add)
		}
	}
	const layout: Layout = { pieces: [], well: null, outlet: null }
	for (const p of pieces) layout.pieces.push({ ...p, id: newId(layout) })
	return layout
}

/** 하우스 방향 후보: 긴 변들 방향과 그 직각 (라디안, 3° 안쪽은 하나로) */
function houseAngles(r: Ring): number[] {
	const edges = r
		.map((p, i) => {
			const q = r[(i + 1) % r.length]
			return { t: Math.atan2(q[1] - p[1], q[0] - p[0]), l: dist(p, q) }
		})
		.sort((a, b) => b.l - a.l)
	const out: number[] = []
	const norm = (t: number) => ((t % Math.PI) + Math.PI) % Math.PI
	const near = (a: number, b: number) => {
		const d = Math.abs(norm(a) - norm(b))
		return Math.min(d, Math.PI - d) < (3 * Math.PI) / 180
	}
	for (const e of edges.filter((x, i) => i < 3 || x.l >= 8))
		for (const t of [e.t, e.t + Math.PI / 2]) if (!out.some((o) => near(o, t))) out.push(norm(t))
	return out
}

/**
 * 방향 t 로 단동 하우스를 줄지어 채운다. phase: 줄 시작 위치 (0–1 은 한 줄 간격의 몫, -1 이면 가운데 맞춤).
 * blocked: 비워 둘 곳 (창고·작업 공간·진입로)
 */
function fillHouses(site: Site, blocked: Ring[], t: number, phase: number): Piece[] {
	const spec = KINDS.single
	const rotRing = site.ring.map((p) => rot(p, -t))
	const blk = blocked.map((r) => r.map((q) => rot(q, -t)))
	const ys = rotRing.map((p) => p[1])
	const minY = Math.min(...ys)
	const maxY = Math.max(...ys)
	const pitch = spec.w + HOUSE_GAP
	const half = spec.w / 2
	const span = maxY - minY - 2 * SIDE_GAP
	if (span < spec.w) return []
	const count = Math.floor((span - spec.w) / pitch) + 1
	const slack = span - spec.w - (count - 1) * pitch
	const start = minY + SIDE_GAP + half + (phase < 0 ? slack / 2 : phase * pitch)
	const out: Piece[] = []
	for (let v = start; v <= maxY - SIDE_GAP - half + 1e-6; v += pitch) {
		// 하우스 폭과 옆 통로까지 여러 줄에서 모두 땅 안인 구간
		let iv = scan(rotRing, v)
		for (const d of [-half - SIDE_GAP, -half, -half / 2, half / 2, half, half + SIDE_GAP])
			iv = overlapIv(iv, scan(rotRing, v + d))
		iv = iv
			.map(([a, b]) => [a + EDGE_GAP, b - EDGE_GAP] as [number, number])
			.filter(([a, b]) => b - a >= spec.minLen)
		for (const r of blk) {
			const cuts = [-half, -half / 2, 0, half / 2, half].flatMap((d) => scan(r, v + d))
			if (!cuts.length) continue
			const c1 = Math.min(...cuts.map((c) => c[0]))
			const c2 = Math.max(...cuts.map((c) => c[1]))
			iv = iv.flatMap(([a, b]) => {
				if (c2 <= a || c1 >= b) return [[a, b] as [number, number]]
				const o: [number, number][] = []
				if (c1 - a >= spec.minLen) o.push([a, c1])
				if (b - c2 >= spec.minLen) o.push([c2, b])
				return o
			})
		}
		for (const [a, b] of iv) {
			// 너무 긴 줄은 끊는다 (한 동 최대 길이)
			const n = Math.ceil((b - a) / (spec.maxLen + HOUSE_GAP))
			const len = Math.floor(((b - a - (n - 1) * HOUSE_GAP) / n) * 2) / 2
			if (len < spec.minLen) continue
			for (let j = 0; j < n; j++) {
				const u = a + j * (len + HOUSE_GAP) + len / 2
				const [x, y] = rot([u, v], t)
				const p: Piece = { id: 0, k: 'single', x, y, a: (t * 180) / Math.PI, len, n: 1 }
				if (rectInside(rectOf(p), site.ring)) out.push(p)
			}
		}
	}
	return out
}

/** 창고 자리 후보: 길 변마다 양 끝과 가운데 (변 번호, 변 위 점) */
function hubAnchors(site: Site): { i: number; at: P }[] {
	const out: { i: number; at: P; l: number }[] = []
	site.tags.forEach((tag, i) => {
		if (tag !== 'road') return
		const a = site.ring[i]
		const b = site.ring[(i + 1) % site.ring.length]
		const l = dist(a, b)
		if (l < 3) return
		const ds = l < 14 ? [l / 2] : [5, l / 2, l - 5]
		for (const d of ds)
			out.push({ i, l, at: [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l] })
	})
	// 길 변이 잘게 나뉜 땅은 긴 변부터 12자리까지
	return out.sort((u, v) => v.l - u.l).slice(0, 12)
}

/** 길 변 점 at 안쪽에 창고(길과 나란히)와 그 옆 작업 공간을 놓는다. 못 놓으면 null */
function hubAt(site: Site, anchor: { i: number; at: P }, yard: boolean): Piece[] | null {
	const a = site.ring[anchor.i]
	const b = site.ring[(anchor.i + 1) % site.ring.length]
	const l = dist(a, b) || 1
	const e: P = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
	const o = outward(site.ring, anchor.i)
	const deg = (Math.atan2(e[1], e[0]) * 180) / Math.PI
	const fits = (p: Piece, others: Piece[]) =>
		rectInside(rectOf(p, 0.5), site.ring) &&
		!others.some((q) => rectsOverlap(rectOf(p), rectOf(q, 0.5)))
	const at = (k: PieceKind, s: number, d: number): Piece => {
		const p = makePiece(k, 0, 0, deg, 0)
		return {
			...p,
			x: anchor.at[0] + e[0] * s - o[0] * d,
			y: anchor.at[1] + e[1] * s - o[1] * d
		}
	}
	const sw = KINDS.storage
	const yw = KINDS.yard
	for (const d of [1, 2, 3, 4, 6, 8])
		for (const s of [0, -2, 2, -4, 4]) {
			const st = at('storage', s, d + sw.w / 2)
			if (!fits(st, [])) continue
			if (!yard) return [st]
			const gap = (sw.len + yw.len) / 2 + 1
			for (const [ys, yd] of [
				[s + gap, d + yw.w / 2],
				[s - gap, d + yw.w / 2],
				[s, d + sw.w + 1 + yw.w / 2]
			]) {
				const y = at('yard', ys, yd)
				if (fits(y, [st])) return [st, y]
			}
		}
	return null
}

// ── 길·물·배수 ────────────────────────────────────────

export function corridor(a: P, b: P, w: number): Ring {
	const l = dist(a, b) || 1
	const nx = (-(b[1] - a[1]) / l) * (w / 2)
	const ny = ((b[0] - a[0]) / l) * (w / 2)
	return [
		[a[0] + nx, a[1] + ny],
		[a[0] - nx, a[1] - ny],
		[b[0] - nx, b[1] - ny],
		[b[0] + nx, b[1] + ny]
	]
}

/** 진입로: 길 변에서 가장 가까운 길 쪽 시설(창고·작업 공간·농막)까지. 없으면 길 변 가운데에서 짧게 */
function entryOf(site: Site, layout: Layout): { a: P; b: P } | null {
	const roadIdx = site.tags.map((t, i) => (t === 'road' ? i : -1)).filter((i) => i >= 0)
	if (!roadIdx.length) return null
	const hubs = layout.pieces.filter((p) => ['yard', 'storage', 'shed'].includes(p.k))
	const target: P | null = hubs.length
		? hubs.map((p) => [p.x, p.y] as P).sort((u, v) => roadDist(site, u) - roadDist(site, v))[0]
		: null
	if (!target) {
		const i = roadEdge(site)
		const a = site.ring[i]
		const b = site.ring[(i + 1) % site.ring.length]
		const m: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
		const n = outward(site.ring, i)
		return { a: m, b: [m[0] - n[0] * 6, m[1] - n[1] * 6] }
	}
	let best: P = site.ring[0]
	let bd = Infinity
	for (const i of roadIdx) {
		const q = nearestOnSeg(target, site.ring[i], site.ring[(i + 1) % site.ring.length])
		const d = dist(q, target)
		if (d < bd) {
			bd = d
			best = q
		}
	}
	// 시설 가장자리까지만
	const hub = hubs.find((p) => p.x === target[0] && p.y === target[1])!
	const r = rectOf(hub)
	const end = nearestOnRing(best, r).pt
	return { a: best, b: end }
}

function roadDist(site: Site, p: P) {
	let d = Infinity
	site.tags.forEach((t, i) => {
		if (t === 'road')
			d = Math.min(d, dist(p, nearestOnSeg(p, site.ring[i], site.ring[(i + 1) % site.ring.length])))
	})
	return d
}

/** 기본 물 인입 위치: 길 변 위, 진입로 옆 */
export function defaultWell(site: Site, layout: Layout): P {
	const e = entryOf(site, layout)
	const i = roadEdge(site)
	const a = site.ring[i]
	const b = site.ring[(i + 1) % site.ring.length]
	const n = outward(site.ring, i)
	const along: P = [
		(b[0] - a[0]) / (edgeLen(site.ring, i) || 1),
		(b[1] - a[1]) / (edgeLen(site.ring, i) || 1)
	]
	const base = e?.a ?? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
	const p: P = [base[0] + along[0] * 4 - n[0] * 1.2, base[1] + along[1] * 4 - n[1] * 1.2]
	return inPoly(p, site.ring) ? p : [base[0] - n[0] * 1.2, base[1] - n[1] * 1.2]
}

/** 기본 배수구: 구거·하천에 닿은 가장 긴 변 가운데. 없으면 길 변 끝 (길 옆 측구로) */
export function defaultOutlet(site: Site): P {
	let best = -1
	site.tags.forEach((t, i) => {
		if (
			(t === 'ditch' || t === 'river') &&
			(best < 0 || edgeLen(site.ring, i) > edgeLen(site.ring, best))
		)
			best = i
	})
	if (best >= 0) {
		const a = site.ring[best]
		const b = site.ring[(best + 1) % site.ring.length]
		return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
	}
	const i = roadEdge(site)
	return site.ring[i]
}

/** 고리를 안쪽으로 d 만큼 (꼭짓점 이등분선 근사, 작은 d 용) */
function insetRing(r: Ring, d: number): Ring {
	const n = r.length
	return r.map((p, i) => {
		const n1 = outward(r, (i - 1 + n) % n)
		const n2 = outward(r, i)
		let bx = n1[0] + n2[0]
		let by = n1[1] + n2[1]
		const bl = Math.hypot(bx, by) || 1
		bx /= bl
		by /= bl
		const cos = Math.max(0.35, bx * n2[0] + by * n2[1])
		return [p[0] - (bx * d) / cos, p[1] - (by * d) / cos] as P
	})
}

export type PlanPiece = {
	piece: Piece
	rect: Ring
	w: number
	l: number
	h: number
	area: number
	outside: boolean
	overlap: boolean
	tooBig: boolean
}

export type Zone = { kind: 'field'; area: number; at: P }

export type Plan = {
	pieces: PlanPiece[]
	entry: { a: P; b: P; w: number } | null
	/** 급수관 (꺾은선들) */
	pipes: P[][]
	/** 배수로 (꺾은선들) */
	drains: P[][]
	well: P
	outlet: P
	zones: Zone[]
	totals: {
		facility: number
		greenhouse: number
		houses: number
		field: number
		pipe: number
		drain: number
	}
}

/** 배치 → 그릴 것과 숫자 */
export function computePlan(site: Site, layout: Layout): Plan {
	const ring = site.ring
	const pieces: PlanPiece[] = layout.pieces.map((p) => {
		const { w, l, h } = pieceSize(p)
		const rect = rectOf(p)
		const spec = KINDS[p.k]
		return {
			piece: p,
			rect,
			w,
			l,
			h,
			area: w * l,
			outside: !rectInside(rect, ring),
			overlap: false,
			tooBig: !!spec.maxArea && w * l > spec.maxArea + 1e-6
		}
	})
	for (let i = 0; i < pieces.length; i++)
		for (let j = i + 1; j < pieces.length; j++)
			if (rectsOverlap(pieces[i].rect, pieces[j].rect)) pieces[i].overlap = pieces[j].overlap = true

	const e = layout.pieces.length ? entryOf(site, layout) : null
	const entry = e && dist(e.a, e.b) > 0.5 ? { ...e, w: ROAD_W } : null

	// 노지 밭: 시설·진입로를 뺀 칸들을 이어진 덩어리로 묶는다
	const cell = Math.max(1, Math.sqrt(site.area) / 60)
	const blocks = pieces.map((p) => rectOf(p.piece, 0.8))
	if (entry) blocks.push(corridor(entry.a, entry.b, entry.w + 0.6))
	const xs = ring.map((p) => p[0])
	const ys = ring.map((p) => p[1])
	const x0 = Math.min(...xs)
	const y0 = Math.min(...ys)
	const nx = Math.ceil((Math.max(...xs) - x0) / cell)
	const ny = Math.ceil((Math.max(...ys) - y0) / cell)
	const open = new Uint8Array(nx * ny)
	for (let i = 0; i < nx; i++)
		for (let j = 0; j < ny; j++) {
			const c: P = [x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell]
			if (inPoly(c, ring) && !blocks.some((b) => inPoly(c, b))) open[i * ny + j] = 1
		}
	const seen = new Uint8Array(nx * ny)
	const zones: Zone[] = []
	const minZone = Math.max(20, site.area * 0.01)
	for (let s = 0; s < open.length; s++) {
		if (!open[s] || seen[s]) continue
		const stack = [s]
		seen[s] = 1
		let n = 0
		let sx = 0
		let sy = 0
		const members: number[] = []
		while (stack.length) {
			const k = stack.pop()!
			n++
			members.push(k)
			const i = Math.floor(k / ny)
			const j = k % ny
			sx += i
			sy += j
			for (const [di, dj] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const a = i + di
				const b = j + dj
				if (a < 0 || b < 0 || a >= nx || b >= ny) continue
				const kk = a * ny + b
				if (open[kk] && !seen[kk]) {
					seen[kk] = 1
					stack.push(kk)
				}
			}
		}
		const area = n * cell * cell
		if (area < minZone) continue
		// 라벨 자리: 무게중심에 가장 가까운 칸 (오목한 덩어리에서도 덩어리 안에 오게)
		const ci = sx / n
		const cj = sy / n
		let bestK = members[0]
		let bd = Infinity
		for (const k of members) {
			const d = (Math.floor(k / ny) - ci) ** 2 + ((k % ny) - cj) ** 2
			if (d < bd) {
				bd = d
				bestK = k
			}
		}
		zones.push({
			kind: 'field',
			area,
			at: [x0 + (Math.floor(bestK / ny) + 0.5) * cell, y0 + ((bestK % ny) + 0.5) * cell]
		})
	}
	zones.sort((a, b) => b.area - a.area)

	const well = layout.well ?? defaultWell(site, layout)
	const outlet = layout.outlet ?? defaultOutlet(site)

	// 급수: 물 대는 시설과 밭 덩어리를 최소 신장 트리로 잇고, 긴 변 방향에 맞춰 ㄱ자로 꺾는다
	const t = site.theta
	const targets: P[] = []
	for (const p of pieces)
		if (KINDS[p.piece.k].water && !p.outside) targets.push(nearestOnRing(well, p.rect).pt)
	for (const z of zones) targets.push(z.at)
	const nodes: P[] = [well, ...targets]
	const manhattan = (a: P, b: P) => {
		const ra = rot(a, -t)
		const rb = rot(b, -t)
		return Math.abs(ra[0] - rb[0]) + Math.abs(ra[1] - rb[1])
	}
	const inTree = new Set([0])
	const pipes: P[][] = []
	while (inTree.size < nodes.length) {
		let best: [number, number, number] = [-1, -1, Infinity]
		for (const i of inTree)
			for (let j = 0; j < nodes.length; j++) {
				if (inTree.has(j)) continue
				const d = manhattan(nodes[i], nodes[j])
				if (d < best[2]) best = [i, j, d]
			}
		inTree.add(best[1])
		pipes.push(ell(nodes[best[0]], nodes[best[1]], t, ring))
	}

	// 배수: 길에 닿지 않은 변을 따라 둘레 배수로 (길 쪽은 길 옆 측구로 빠진다고 본다) + 하우스마다 옆 도랑
	const inner = insetRing(ring, 0.6)
	const drains: P[][] = []
	const n = ring.length
	const start = site.tags.findIndex((tg) => tg === 'road')
	let cur: P[] = []
	for (let k = 0; k < n; k++) {
		const i = (start + 1 + k) % n
		if (site.tags[i] === 'road') {
			if (cur.length > 1) drains.push(cur)
			cur = []
			continue
		}
		if (!cur.length) cur.push(inner[i])
		cur.push(inner[(i + 1) % n])
	}
	if (cur.length > 1) drains.push(cur)
	const perimeter = drains.slice()
	for (const p of pieces) {
		if (!KINDS[p.piece.k].greenhouse || p.outside) continue
		// 배수구 쪽 긴 변을 따라
		const [a, b, c, d] = p.rect
		const sideA: P[] = [a, b]
		const sideB: P[] = [d, c]
		const mid = (s: P[]): P => [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2]
		const side = dist(mid(sideA), outlet) < dist(mid(sideB), outlet) ? sideA : sideB
		const off = 0.5
		const cx = (a[0] + c[0]) / 2
		const cy = (a[1] + c[1]) / 2
		const push = (q: P): P => {
			const m = mid(side)
			const l = Math.hypot(m[0] - cx, m[1] - cy) || 1
			return [q[0] + ((m[0] - cx) / l) * off, q[1] + ((m[1] - cy) / l) * off]
		}
		const s0 = push(side[0])
		const s1 = push(side[1])
		const [from, to] = dist(s0, outlet) < dist(s1, outlet) ? [s1, s0] : [s0, s1]
		// 끝에서 가장 가까운 둘레 배수로까지
		let joint: P | null = null
		let jd = Infinity
		for (const line of perimeter)
			for (let i = 1; i < line.length; i++) {
				const q = nearestOnSeg(to, line[i - 1], line[i])
				const dd = dist(q, to)
				if (dd < jd) {
					jd = dd
					joint = q
				}
			}
		drains.push(joint && jd < site.area ** 0.5 ? [from, to, joint] : [from, to])
	}

	const facility = pieces.reduce((s, p) => s + polyArea(clipConvex(ring, p.rect)), 0)
	const greenhouse = pieces
		.filter((p) => KINDS[p.piece.k].greenhouse)
		.reduce((s, p) => s + polyArea(clipConvex(ring, p.rect)), 0)
	const entryArea = entry ? polyArea(clipConvex(ring, corridor(entry.a, entry.b, entry.w))) : 0
	return {
		pieces,
		entry,
		pipes,
		drains,
		well,
		outlet,
		zones,
		totals: {
			facility,
			greenhouse,
			houses: pieces.filter((p) => KINDS[p.piece.k].greenhouse).length,
			field: Math.max(0, site.area - facility - entryArea),
			pipe: pipes.reduce((s, l) => s + pathLength(l), 0),
			drain: drains.reduce((s, l) => s + pathLength(l), 0)
		}
	}
}

/** a → b 를 긴 변 방향 기준 ㄱ자로. 꺾는 점이 땅 밖이면 반대로 꺾는다 */
function ell(a: P, b: P, t: number, ring: Ring): P[] {
	const ra = rot(a, -t)
	const rb = rot(b, -t)
	const c1 = rot([rb[0], ra[1]], t)
	const c2 = rot([ra[0], rb[1]], t)
	if (dist(a, b) < 0.05) return [a, b]
	return inPoly(c1, ring) || !inPoly(c2, ring) ? [a, c1, b] : [a, c2, b]
}

// ── 주소창 저장 (공유·PDF 용) ────────────────────────────

/** 배치 → 짧은 글자 (주소 # 뒤). 좌표는 10cm 단위 */
export function encodeLayout(layout: Layout): string {
	const r = (v: number) => Math.round(v * 10)
	const o = {
		v: 1,
		p: layout.pieces.map((p) => [
			KIND_ORDER.indexOf(p.k),
			r(p.x),
			r(p.y),
			Math.round(p.a),
			r(p.len),
			p.n
		]),
		w: layout.well ? [r(layout.well[0]), r(layout.well[1])] : 0,
		o: layout.outlet ? [r(layout.outlet[0]), r(layout.outlet[1])] : 0
	}
	const s = JSON.stringify(o)
	const b64 = typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64')
	return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeLayout(code: string): Layout | null {
	try {
		const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
		const s = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
		const o = JSON.parse(s) as {
			v: number
			p: [number, number, number, number, number, number][]
			w: [number, number] | 0
			o: [number, number] | 0
		}
		if (o.v !== 1 || !Array.isArray(o.p)) return null
		const pieces: Piece[] = []
		let id = 1
		for (const [ki, x, y, a, len, n] of o.p.slice(0, 200)) {
			const k = KIND_ORDER[ki]
			if (!k || ![x, y, a, len, n].every(Number.isFinite)) continue
			const s = KINDS[k]
			pieces.push({
				id: id++,
				k,
				x: x / 10,
				y: y / 10,
				a,
				len: Math.max(s.minLen, Math.min(s.maxLen, len / 10)),
				n: s.n ? Math.max(s.n.min, Math.min(s.n.max, Math.round(n))) : 1
			})
		}
		const pt = (v: [number, number] | 0): P | null =>
			Array.isArray(v) && v.every(Number.isFinite) ? [v[0] / 10, v[1] / 10] : null
		return { pieces, well: pt(o.w), outlet: pt(o.o) }
	} catch {
		return null
	}
}

/** 3단계(PDF 배치도)가 읽을 평범한 자료. 숫자는 m·㎡, 좌표는 필지 무게중심 기준 (x 동, y 북) */
export type PlanExport = {
	version: 1
	parcel: {
		ring: Ring
		area: number
		edges: EdgeTag[]
		roadGuessed: boolean
		roadFrom: Site['roadFrom']
	}
	pieces: {
		kind: PieceKind
		name: { ko: string; en: string }
		center: P
		angle: number
		width: number
		length: number
		height: number
		bays: number
		area: number
		corners: Ring
		issues: ('outside' | 'overlap' | 'too-big')[]
	}[]
	entry: { from: P; to: P; width: number } | null
	pipes: P[][]
	drains: P[][]
	well: P
	outlet: P
	fieldZones: { area: number; at: P }[]
	totals: Plan['totals']
}

export function exportPlan(site: Site, plan: Plan): PlanExport {
	return {
		version: 1,
		parcel: {
			ring: site.ring,
			area: site.area,
			edges: site.tags,
			roadGuessed: site.roadGuessed,
			roadFrom: site.roadFrom
		},
		pieces: plan.pieces.map((p) => ({
			kind: p.piece.k,
			name: { ko: KINDS[p.piece.k].ko, en: KINDS[p.piece.k].en },
			center: [p.piece.x, p.piece.y],
			angle: p.piece.a,
			width: p.w,
			length: p.l,
			height: p.h,
			bays: p.piece.n,
			area: p.area,
			corners: p.rect,
			issues: [
				...(p.outside ? (['outside'] as const) : []),
				...(p.overlap ? (['overlap'] as const) : []),
				...(p.tooBig ? (['too-big'] as const) : [])
			]
		})),
		entry: plan.entry ? { from: plan.entry.a, to: plan.entry.b, width: plan.entry.w } : null,
		pipes: plan.pipes,
		drains: plan.drains,
		well: plan.well,
		outlet: plan.outlet,
		fieldZones: plan.zones.map((z) => ({ area: z.area, at: z.at })),
		totals: plan.totals
	}
}
