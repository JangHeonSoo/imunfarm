/**
 * 내 땅 3D 미리보기 (/tools/farmland-crop-finder/). 필지 경계를 흰 모형 판으로 세우고 고른 작물을 이랑에 심어 보여 준다.
 * three.js 는 이 화면에서만 동적 import 로 불러온다 (다른 페이지 번들에 들어가지 않게).
 * 좌표: 필지 무게중심 기준 미터 (x 동쪽, y 북쪽) → three (x, 높이, -y).
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
	KINDS,
	corridor,
	localFrame,
	rectOf,
	type Plan,
	type PlanPiece
} from '@/data/farmland-layout'

export type Ring = [number, number][]

type Form = 'bush' | 'tall' | 'tuft' | 'mound' | 'head' | 'shrub' | 'tree' | 'paddy' | 'greenhouse'
type Look = {
	form: Form
	/** 이랑(줄) 간격 m */
	row: number
	/** 포기 간격 m */
	step: number
	/** 포기 높이·폭 m */
	h: number
	w: number
}

// 농사로 재배 일반 기준을 모형용으로 줄인 값 (정확한 재식 거리 안내가 아니다)
const LOOK: Record<string, Look> = {
	peanut: { form: 'bush', row: 0.6, step: 0.3, h: 0.35, w: 0.45 },
	'perilla-seed': { form: 'bush', row: 0.9, step: 0.45, h: 1.1, w: 0.6 },
	sesame: { form: 'tall', row: 0.6, step: 0.25, h: 1.3, w: 0.28 },
	ginger: { form: 'tall', row: 0.6, step: 0.25, h: 0.9, w: 0.32 },
	'mung-bean': { form: 'bush', row: 0.6, step: 0.3, h: 0.6, w: 0.42 },
	'red-bean': { form: 'bush', row: 0.6, step: 0.3, h: 0.6, w: 0.42 },
	soybean: { form: 'bush', row: 0.7, step: 0.3, h: 0.7, w: 0.48 },
	'sweet-potato': { form: 'mound', row: 0.9, step: 0.3, h: 0.28, w: 0.62 },
	potato: { form: 'mound', row: 0.75, step: 0.3, h: 0.5, w: 0.5 },
	garlic: { form: 'tuft', row: 0.3, step: 0.15, h: 0.55, w: 0.16 },
	onion: { form: 'tuft', row: 0.3, step: 0.15, h: 0.45, w: 0.16 },
	'greenonion-2': { form: 'tuft', row: 0.3, step: 0.15, h: 0.45, w: 0.14 },
	cabbage: { form: 'head', row: 0.65, step: 0.45, h: 0.38, w: 0.52 },
	radish: { form: 'head', row: 0.6, step: 0.3, h: 0.35, w: 0.36 },
	'red-chili-pepper': { form: 'bush', row: 1.0, step: 0.45, h: 0.9, w: 0.5 },
	corn: { form: 'tall', row: 0.75, step: 0.35, h: 2.2, w: 0.4 },
	buckwheat: { form: 'bush', row: 0.5, step: 0.25, h: 0.8, w: 0.32 },
	blueberry: { form: 'shrub', row: 2.5, step: 1.2, h: 1.4, w: 1.1 },
	apple: { form: 'tree', row: 4, step: 2.5, h: 3.6, w: 2.2 },
	pear: { form: 'tree', row: 6, step: 4.5, h: 3, w: 3.4 },
	'sweet-persimmon': { form: 'tree', row: 6, step: 5, h: 3.6, w: 3.4 },
	rice: { form: 'paddy', row: 0.3, step: 0.15, h: 0.7, w: 0.12 },
	strawberry: { form: 'greenhouse', row: 1.2, step: 0.25, h: 0.25, w: 0.3 },
	'cherry-tomato': { form: 'greenhouse', row: 1.2, step: 0.45, h: 1.8, w: 0.45 },
	lettuce: { form: 'greenhouse', row: 1.2, step: 0.25, h: 0.22, w: 0.28 },
	'tomato-hydro': { form: 'greenhouse', row: 1.6, step: 0.33, h: 2.6, w: 0.5 },
	'strawberry-hydro': { form: 'greenhouse', row: 1.27, step: 0.2, h: 0.3, w: 0.3 },
	'cucumber-hydro': { form: 'greenhouse', row: 2, step: 0.2, h: 2.2, w: 0.45 },
	paprika: { form: 'greenhouse', row: 1.5, step: 0.33, h: 2.2, w: 0.5 }
}

// 이랑 높이 (모양별). 0 이면 이랑을 세우지 않는다
const RIDGE: Record<Form, number> = {
	bush: 0.16,
	tall: 0.14,
	tuft: 0.12,
	mound: 0.32,
	head: 0.16,
	shrub: 0,
	tree: 0,
	paddy: 0,
	greenhouse: 0
}

// 휴대폰(손가락 화면)은 포기 수를 줄인다. 모형이라 느낌만 같으면 된다
const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const MAX_PLANTS = COARSE ? 2000 : 3600
// 처음 한 바퀴 보여 주는 시간. 계속 돌리면 휴대폰 GPU가 쉬지 못해 페이지 전체가 느려진다
const SPIN_MS = 8000
const MAX_RIDGES = 420
const SLAB = 0.6
const HEADLAND = 1.2
const GH_WIDTH = 7
const GH_GAP = 1.6
const GH_HEIGHT = 3

/** 경위도 고리 → 무게중심 기준 미터. 가장 넓은 고리 하나만 쓴다 */
export function toLocalMeters(rings: [number, number][][]): Ring | null {
	return localFrame(rings)?.ring ?? null
}

function signedArea(r: Ring) {
	let s = 0
	for (let i = 0; i < r.length; i++) {
		const [x1, y1] = r[i]
		const [x2, y2] = r[(i + 1) % r.length]
		s += x1 * y2 - x2 * y1
	}
	return s / 2
}

/** 가로줄 y 에서 다각형 안쪽 구간들 [x1, x2] */
function scan(ring: Ring, y: number): [number, number][] {
	const xs: number[] = []
	for (let i = 0; i < ring.length; i++) {
		const [x1, y1] = ring[i]
		const [x2, y2] = ring[(i + 1) % ring.length]
		if (y1 === y2) continue
		if ((y >= Math.min(y1, y2) && y < Math.max(y1, y2)) || false) {
			xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
		}
	}
	xs.sort((a, b) => a - b)
	const out: [number, number][] = []
	for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]])
	return out
}

/** 구간 목록 두 개의 겹치는 부분 */
function overlap(a: [number, number][], b: [number, number][]) {
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
 * 줄(이랑) 구간: 다각형을 -θ 돌려 가로줄로 자른다. 가장자리에서 margin 만큼 안쪽만.
 * 돌아오는 값은 돌린 좌표계의 [y, x1, x2]
 */
function rows(rot: Ring, spacing: number, margin: number) {
	let minY = Infinity
	let maxY = -Infinity
	for (const [, y] of rot) {
		minY = Math.min(minY, y)
		maxY = Math.max(maxY, y)
	}
	const out: [number, number, number][] = []
	const start = minY + margin + ((maxY - minY - 2 * margin) % spacing) / 2
	for (let y = start; y <= maxY - margin + 1e-6; y += spacing) {
		let seg = overlap(scan(rot, y), overlap(scan(rot, y - margin), scan(rot, y + margin)))
		seg = seg
			.map(([a, b]) => [a + margin, b - margin] as [number, number])
			.filter(([a, b]) => b - a > 0.2)
		for (const [a, b] of seg) out.push([y, a, b])
	}
	return out
}

/** 줄 구간에서 막힌 다각형(시설·진입로, 돌린 좌표)과 겹치는 부분을 뺀다. half = 줄 폭의 반 */
function cutRows(lines: [number, number, number][], blocks: Ring[], half: number) {
	if (!blocks.length) return lines
	const out: [number, number, number][] = []
	for (const [v, a, b] of lines) {
		let segs: [number, number][] = [[a, b]]
		for (const blk of blocks) {
			const cuts = [-half, 0, half].flatMap((d) => scan(blk, v + d))
			if (!cuts.length) continue
			const c1 = Math.min(...cuts.map((c) => c[0]))
			const c2 = Math.max(...cuts.map((c) => c[1]))
			segs = segs.flatMap(([s, e]) => {
				if (c2 <= s || c1 >= e) return [[s, e] as [number, number]]
				const keep: [number, number][] = []
				if (c1 - s > 0.3) keep.push([s, c1])
				if (e - c2 > 0.3) keep.push([c2, e])
				return keep
			})
		}
		for (const [s, e] of segs) out.push([v, s, e])
	}
	return out
}

/** 꺾은선 → 바닥에 까는 띠 (폭 w) */
function ribbon(pts: [number, number][], w: number, y: number, cap = true) {
	const pos: number[] = []
	const idx: number[] = []
	for (let i = 0; i + 1 < pts.length; i++) {
		const [x1, y1] = pts[i]
		const [x2, y2] = pts[i + 1]
		const l = Math.hypot(x2 - x1, y2 - y1)
		if (l < 1e-6) continue
		// 이음매가 비지 않게 양 끝을 반 폭만큼 늘린다
		const ux = (x2 - x1) / l
		const uy = (y2 - y1) / l
		const nx = -uy * (w / 2)
		const ny = ux * (w / 2)
		const ex = cap ? ux * (w / 2) : 0
		const ey = cap ? uy * (w / 2) : 0
		const b = pos.length / 3
		const ax = x1 - ex
		const ay = y1 - ey
		const bx = x2 + ex
		const by = y2 + ey
		pos.push(
			ax + nx,
			y,
			-(ay + ny),
			ax - nx,
			y,
			-(ay - ny),
			bx - nx,
			y,
			-(by - ny),
			bx + nx,
			y,
			-(by + ny)
		)
		idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
	}
	const g = new THREE.BufferGeometry()
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
	g.setIndex(idx)
	g.computeVertexNormals()
	return g
}

const lerp = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t)

/** light = 화면이 다크 모드여도 종이(PDF)용 밝은 색으로 */
function readColors(light = false) {
	const cs = getComputedStyle(document.documentElement)
	const get = (name: string, fallback: string) => {
		const v = light ? '' : cs.getPropertyValue(name).trim()
		try {
			return new THREE.Color().setStyle(v || fallback, THREE.SRGBColorSpace)
		} catch {
			return new THREE.Color(fallback)
		}
	}
	const bg = get('--bg', '#faf8f6')
	const ink = get('--ink', '#1d1d1b')
	const dark = bg.getHSL({ h: 0, s: 0, l: 0 }).l < 0.5
	const warm = new THREE.Color(dark ? '#5b5248' : '#9a8b7a')
	return {
		dark,
		bg,
		ink,
		paper: lerp(bg, ink, dark ? 0.08 : 0.035),
		side: lerp(bg, ink, dark ? 0.16 : 0.13),
		soil: lerp(lerp(bg, ink, dark ? 0.1 : 0.05), warm, dark ? 0.35 : 0.3),
		ridge: lerp(bg, warm, dark ? 0.55 : 0.5),
		plant: lerp(ink, bg, dark ? 0.12 : 0.2),
		water: lerp(bg, ink, dark ? 0.2 : 0.12),
		grid: lerp(bg, ink, dark ? 0.14 : 0.1),
		glass: lerp(bg, ink, dark ? 0.12 : 0.02),
		// 시설 모형: 흰 모형 판, 길은 자갈빛, 배수로는 젖은 흙빛
		model: lerp(bg, ink, dark ? 0.1 : 0.0),
		roof: lerp(bg, ink, dark ? 0.2 : 0.08),
		road: lerp(bg, ink, dark ? 0.24 : 0.17),
		drain: lerp(lerp(bg, ink, dark ? 0.5 : 0.58), warm, 0.2)
	}
}

type Instanced = {
	mesh: THREE.InstancedMesh
	pos: Float32Array
	scale: Float32Array
	rot: Float32Array
	delay: Float32Array
}

export type PlanHandlers = {
	/** 시설을 눌렀다 (null = 빈 땅) */
	pick?(id: number | null): void
	/** 시설을 끌어 놓았다 */
	move?(id: number, x: number, y: number): void
	/** 물·배수 표시를 끌어 놓았다 */
	marker?(kind: 'well' | 'outlet', x: number, y: number): void
}

/** 심는 간격 (m). 농사로 표준 재식거리에서 온 값 */
export type CropSpacing = {
	/** 이랑 간격 (두둑 + 고랑) */
	pitch: number
	/** 두둑 폭 (없으면 이랑을 세우지 않는 줄뿌림·평이랑) */
	bed: number | null
	/** 한 이랑에 심는 줄 수 */
	lines: number
	/** 같은 이랑 안 줄 간격 */
	lineGap: number
	/** 포기 간격 */
	step: number
	/** 3D 밭 위에 붙일 간격 글 (화면 표와 같은 말) */
	label: string
}

export type FieldView = {
	setParcel(ring: Ring, opts?: { label?: string }): void
	/** spacing 을 주면 이랑·포기를 그 간격으로 심고 치수 글씨를 단다 */
	setCrop(cropId: string | null, spacing?: CropSpacing | null): void
	/** 남은 밭에 함께 심는 노지 작물 (하우스·온실 작물일 때만 그린다). null 이면 비운다 */
	setSide(cropId: string | null, spacing?: CropSpacing | null): void
	/** 시설 배치. edit = 배치 화면 (끌기·배관·배수·밭 넓이 표시) */
	setPlan(
		plan: Plan | null,
		opts: {
			edit: boolean
			selected: number | null
			/** true 면 작물은 다시 심지 않는다 (끄는 중) */
			light?: boolean
		}
	): void
	onPlan(h: PlanHandlers): void
	/** 지금 보는 각도 그대로 밝은 색으로 한 장 (PDF 표지용). 고른 시설 표시는 뺀다. JPEG data URL */
	snapshot(width: number, height: number): string
	dispose(): void
}

/** 꺾임이 작은(12° 미만) 이웃 변을 합친 변 목록 [시작, 끝] */
export function mergedSides(r: Ring): [[number, number], [number, number]][] {
	const n = r.length
	if (n < 3) return []
	const dir = (i: number) => {
		const [x1, y1] = r[i]
		const [x2, y2] = r[(i + 1) % n]
		return Math.atan2(y2 - y1, x2 - x1)
	}
	const bend = (i: number) => {
		const d = dir(i) - dir((i - 1 + n) % n)
		return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)))
	}
	const LIM = (12 * Math.PI) / 180
	// 진짜 모서리 (꺾임이 큰 꼭짓점)
	const corners: number[] = []
	for (let i = 0; i < n; i++) if (bend(i) >= LIM) corners.push(i)
	if (corners.length < 3) for (let i = 0; i < n; i++) if (!corners.includes(i)) corners.push(i)
	corners.sort((a, b) => a - b)
	return corners.map((c, k) => [r[c], r[corners[(k + 1) % corners.length]]])
}

export function createFieldView(host: HTMLElement): FieldView {
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
	let C = readColors()

	// 느린 원인은 모형이 아니라 화소 수다 (그리기 11번, 삼각형 6만 개뿐).
	// 고해상도 화면은 1.5배까지만 그리고 계단 현상 보정(안티앨리어싱)은 끈다. 화소가 촘촘해 티가 거의 안 난다
	const dpr = devicePixelRatio || 1
	const renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true })
	let quality = Math.min(dpr, 1.5)
	renderer.setPixelRatio(quality)
	renderer.outputColorSpace = THREE.SRGBColorSpace
	renderer.domElement.className = 'im-farm-canvas'
	host.append(renderer.domElement)

	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 5000)
	const controls = new OrbitControls(camera, renderer.domElement)
	controls.enableDamping = true
	controls.dampingFactor = 0.08
	controls.enablePan = false
	controls.maxPolarAngle = (80 * Math.PI) / 180
	controls.minPolarAngle = (12 * Math.PI) / 180
	controls.autoRotateSpeed = 0.55
	let spinUntil = 0
	function spin(on: boolean) {
		controls.autoRotate = on && !reduced
		if (controls.autoRotate) spinUntil = performance.now() + SPIN_MS
	}
	spin(true)
	controls.addEventListener('start', () => {
		spin(false)
		host.classList.add('is-touched')
	})
	// 휠은 페이지 스크롤에 양보하고 Ctrl/⌘ 휠(트랙패드 핀치)만 확대로 넘긴다.
	// 터치는 세로로 밀면 페이지가 내려가고, 가로로 끌면 돌아간다 (두 손가락은 확대)
	host.addEventListener(
		'wheel',
		(e) => {
			if (!(e.ctrlKey || e.metaKey)) e.stopPropagation()
		},
		{ capture: true }
	)
	renderer.domElement.style.touchAction = 'pan-y'

	const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.5)
	const sun = new THREE.DirectionalLight(0xffffff, 1.6)
	sun.position.set(0.6, 1.4, 0.9)
	scene.add(hemi, sun)

	const world = new THREE.Group()
	const cropGroup = new THREE.Group()
	const planGroup = new THREE.Group()
	// 치수 글씨 (하우스 크기·동 사이·이랑 간격). 끄는 동안은 숨기고 놓으면 다시 단다
	const dimGroup = new THREE.Group()
	scene.add(world, cropGroup, planGroup, dimGroup)
	let spacing: CropSpacing | null = null
	/** 나눠 짓기: 하우스·온실 밖 남은 밭에 심는 둘째 작물 */
	let side: { id: string; spacing: CropSpacing | null } | null = null

	let plan: Plan | null = null
	let editing = false
	let selected: number | null = null
	let handlers: PlanHandlers = {}
	/** 작물을 심지 않을 곳 (시설·진입로, 세계 좌표 xy) */
	let blocks: Ring[] = []
	let blockSig = ''
	const pickables: THREE.Object3D[] = []

	let ring: Ring = []
	let radius = 30
	let theta = 0
	let instanced: Instanced[] = []
	let growStart = 0
	let growing = false
	/** false 면 작물을 자라는 움직임 없이 바로 놓는다 (시설을 옮길 때) */
	let animateCrop = true
	let crop: string | null = null
	const mats: THREE.Material[] = []

	const mat = (color: THREE.Color, extra: THREE.MeshLambertMaterialParameters = {}) => {
		const m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra })
		mats.push(m)
		return m
	}

	// 재질은 새 장면을 한 번 그린 뒤에 버린다. 바로 버리면 셰이더가 함께 지워져
	// 다시 지을 때마다 4–6개를 새로 컴파일한다 (휴대폰에서 한 번에 수백 ms)
	const retired = new Set<THREE.Material>()
	function flushRetired() {
		for (const m of retired) m.dispose()
		retired.clear()
	}

	function clearGroup(g: THREE.Group) {
		const gone = new Set<THREE.Material>()
		g.traverse((o) => {
			const m = o as THREE.Mesh
			if (m.geometry) m.geometry.dispose()
			const mt = (m as { material?: THREE.Material | THREE.Material[] }).material
			for (const x of Array.isArray(mt) ? mt : mt ? [mt] : []) {
				retired.add(x)
				gone.add(x)
			}
			const sp = o as THREE.Sprite
			if (sp.isSprite) (sp.material.map as THREE.Texture | null)?.dispose()
		})
		g.clear()
		// 다시 짓기를 거듭해도 재질 목록이 쌓이지 않게
		for (let i = mats.length - 1; i >= 0; i--) if (gone.has(mats[i])) mats.splice(i, 1)
	}

	/** 글자 표 (boxed = 종이색 바탕에 먹선 테두리, 작물 위에서도 읽히게) */
	function label(text: string, size: number, boxed = false) {
		const c = document.createElement('canvas')
		const px = 64
		const pad = boxed ? 22 : 8
		const ctx = c.getContext('2d')!
		ctx.font = `700 ${px}px Pretendard, system-ui, sans-serif`
		const w = Math.ceil(ctx.measureText(text).width) + pad * 2
		c.width = w
		c.height = px + (boxed ? 36 : 20)
		const ink = `#${C.ink.getHexString(THREE.SRGBColorSpace)}`
		if (boxed) {
			ctx.fillStyle = `#${C.bg.getHexString(THREE.SRGBColorSpace)}`
			ctx.fillRect(0, 0, c.width, c.height)
			ctx.strokeStyle = ink
			ctx.lineWidth = 5
			ctx.strokeRect(2.5, 2.5, c.width - 5, c.height - 5)
		}
		ctx.font = `700 ${px}px Pretendard, system-ui, sans-serif`
		ctx.fillStyle = ink
		ctx.textBaseline = 'middle'
		ctx.fillText(text, pad, c.height / 2 + 2)
		const tex = new THREE.CanvasTexture(c)
		tex.colorSpace = THREE.SRGBColorSpace
		tex.anisotropy = 4
		const s = new THREE.Sprite(
			new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
		)
		s.scale.set((size * c.width) / c.height, size, 1)
		s.renderOrder = 10
		return s
	}

	function buildWorld() {
		clearGroup(world)
		if (ring.length < 3) return
		const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)))
		const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false })
		geo.rotateX(-Math.PI / 2)
		geo.translate(0, -SLAB, 0)
		// 윗면은 종이색, 옆면은 한 단 어둡게 (ExtrudeGeometry 그룹 0 = 앞뒷면, 1 = 옆면)
		const slab = new THREE.Mesh(geo, [mat(C.paper), mat(C.side)])
		world.add(slab)

		const pts = ring.map(([x, y]) => new THREE.Vector3(x, 0.02, -y))
		const edge = new THREE.LineLoop(
			new THREE.BufferGeometry().setFromPoints(pts),
			new THREE.LineBasicMaterial({ color: C.ink })
		)
		world.add(edge)
		const base = new THREE.LineLoop(
			new THREE.BufferGeometry().setFromPoints(
				ring.map(([x, y]) => new THREE.Vector3(x, -SLAB, -y))
			),
			new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.35 })
		)
		world.add(base)

		// 바닥 격자 (종이 위 연필선 느낌)
		const size = Math.max(40, Math.ceil((radius * 7) / 10) * 10)
		const step = radius > 120 ? 20 : radius > 40 ? 10 : 5
		const grid = new THREE.GridHelper(size, Math.round(size / step), C.grid, C.grid)
		grid.position.y = -SLAB - 0.01
		;(grid.material as THREE.Material).transparent = true
		;(grid.material as THREE.Material).opacity = 0.9
		world.add(grid)

		// 변 길이 (m). 거의 일직선으로 이어진 짧은 변은 하나로 합쳐 잰다. 너무 짧은 변은 글자가 겹치니 뺀다
		const sides = mergedSides(ring)
		const ccw = signedArea(ring) > 0
		const cut = Math.max(3, radius * 0.18)
		for (const [a, b] of sides) {
			const len = Math.hypot(b[0] - a[0], b[1] - a[1])
			if (len < cut) continue
			// 바깥쪽 법선 (반시계 고리면 오른쪽이 바깥)
			const nx = ((b[1] - a[1]) / len) * (ccw ? 1 : -1)
			const ny = (-(b[0] - a[0]) / len) * (ccw ? 1 : -1)
			const off = radius * 0.085
			const tag = label(`${len.toFixed(1)}m`, radius * 0.066)
			tag.position.set((a[0] + b[0]) / 2 + nx * off, radius * 0.02, -((a[1] + b[1]) / 2 + ny * off))
			world.add(tag)
		}

		// 북쪽 표시: 땅 가장 북쪽 점보다 조금 더 북쪽
		let north = Infinity
		for (const [, y] of ring) north = Math.min(north, -y)
		const n = label('N', radius * 0.055)
		n.position.set(viewFrame().cx, -SLAB + 0.02 + radius * 0.04, north - radius * 0.22)
		world.add(n)
	}

	/** 보는 방향과 땅의 축 기준 상자 (카메라·북쪽 표시 공용) */
	function viewFrame() {
		// 긴 땅은 긴 쪽이 화면 가로로 눕게 본다 (기본 방향 -35°에 가까운 쪽, 비스듬히 20°). 세로 화면은 세워서.
		// 축은 가장 긴 변이 아니라 땅 전체의 주축 (꼭짓점 분산, 둘레 길이로 가중)
		let sxx = 0
		let syy = 0
		let sxy = 0
		ring.forEach(([x, y], i) => {
			const [x2, y2] = ring[(i + 1) % ring.length]
			const w = Math.hypot(x2 - x, y2 - y)
			const mx = (x + x2) / 2
			const my = (y + y2) / 2
			sxx += w * mx * mx
			syy += w * my * my
			sxy += w * mx * my
		})
		const ax = ring.length > 2 ? 0.5 * Math.atan2(2 * sxy, sxx - syy) : theta
		// 세로로 긴 화면(휴대폰)은 긴 쪽이 화면 위아래로 서게 본다
		const base = (camera.aspect || 1) < 0.9 ? ax + Math.PI / 2 : ax
		const pick = [base, base + Math.PI].map((a) => a - (20 * Math.PI) / 180)
		const near = (a: number) => Math.abs(Math.atan2(Math.sin(a + 0.61), Math.cos(a + 0.61)))
		const az = near(pick[0]) <= near(pick[1]) ? pick[0] : pick[1]
		const us = ring.map(([x, y]) => x * Math.cos(ax) + y * Math.sin(ax))
		const vs = ring.map(([x, y]) => -x * Math.sin(ax) + y * Math.cos(ax))
		const uc = (Math.min(...us) + Math.max(...us)) / 2
		const vc = (Math.min(...vs) + Math.max(...vs)) / 2
		return {
			ax,
			az,
			halfLen: Math.max(4, (Math.max(...us) - Math.min(...us)) / 2),
			halfWid: Math.max(4, (Math.max(...vs) - Math.min(...vs)) / 2),
			cx: uc * Math.cos(ax) - vc * Math.sin(ax),
			cy: uc * Math.sin(ax) + vc * Math.cos(ax)
		}
	}

	function fitCamera() {
		// 땅 꼭짓점(바닥과 하우스 높이)을 실제로 화면에 투영해 보고, 가운데로 옮기고 거리를 맞추기를 몇 번 되풀이한다.
		// 어림 공식은 길쭉한 땅에서 화면 밖으로 잘렸다
		camera.updateProjectionMatrix()
		const vfov = (camera.fov * Math.PI) / 180
		const ty = Math.tan(vfov / 2)
		const tx = ty * (camera.aspect || 1)
		const el = (42 * Math.PI) / 180
		const { az, cx, cy } = viewFrame()
		const dir = new THREE.Vector3(
			Math.cos(el) * Math.sin(az),
			Math.sin(el),
			Math.cos(el) * Math.cos(az)
		)
		const pts = ring.flatMap(([x, y]) => [new THREE.Vector3(x, 0, -y), new THREE.Vector3(x, 4, -y)])
		// 변 길이 글씨도 화면 안에 (buildWorld 와 같은 자리, 글씨 폭만큼 조금 더 바깥)
		const ccw = signedArea(ring) > 0
		for (const [a, b] of mergedSides(ring)) {
			const len = Math.hypot(b[0] - a[0], b[1] - a[1])
			if (len < Math.max(3, radius * 0.18)) continue
			const nx = ((b[1] - a[1]) / len) * (ccw ? 1 : -1)
			const ny = (-(b[0] - a[0]) / len) * (ccw ? 1 : -1)
			const off = radius * 0.2
			pts.push(new THREE.Vector3((a[0] + b[0]) / 2 + nx * off, 0, -((a[1] + b[1]) / 2 + ny * off)))
		}
		const q = new THREE.Vector3()
		// 변 길이 글씨와 북쪽 표시가 들어갈 여백 (화면 가로 84%, 세로 76% 안에)
		const mx = 0.84
		const my = 0.76
		let gx = cx
		let gz = -cy
		let d = radius * 2.5
		for (let k = 0; k < 10; k++) {
			camera.position.set(gx + d * dir.x, d * dir.y, gz + d * dir.z)
			camera.lookAt(gx, 0, gz)
			camera.updateMatrixWorld()
			let x0 = Infinity
			let x1 = -Infinity
			let y0 = Infinity
			let y1 = -Infinity
			for (const p of pts) {
				q.copy(p).project(camera)
				x0 = Math.min(x0, q.x)
				x1 = Math.max(x1, q.x)
				y0 = Math.min(y0, q.y)
				y1 = Math.max(y1, q.y)
			}
			const ox = (x0 + x1) / 2
			const oy = (y0 + y1) / 2
			// 화면 가로는 카메라 오른쪽, 세로는 바닥 위 먼 쪽으로 (비스듬히 보므로 1/sin(el) 만큼 늘어난다)
			gx += Math.cos(az) * ox * d * tx - (Math.sin(az) * oy * d * ty) / Math.sin(el)
			gz += -Math.sin(az) * ox * d * tx - (Math.cos(az) * oy * d * ty) / Math.sin(el)
			d *= Math.max((x1 - x0) / 2 / mx, (y1 - y0) / 2 / my)
		}
		camera.position.set(gx + d * dir.x, d * dir.y, gz + d * dir.z)
		controls.target.set(gx, 0, gz)
		fitAspect = camera.aspect
		controls.minDistance = radius * 0.8
		controls.maxDistance = radius * 6
		camera.near = Math.max(0.05, radius / 200)
		camera.far = radius * 40
		camera.updateProjectionMatrix()
		controls.update()
		// 먼 바닥 격자만 배경색으로 흐려지게
		scene.fog = new THREE.Fog(C.bg, d + radius * 1.6, d + radius * 5.5)
	}
	let fitAspect = 0

	// 이랑 방향: 가장 긴 변을 따라 (실제 밭도 긴 변을 따라 이랑을 낸다)
	function mainAngle(r: Ring) {
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

	const unit = {
		bush: () => new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.5, 0),
		tall: () => new THREE.ConeGeometry(0.5, 1, 5).translate(0, 0.5, 0),
		tuft: () => new THREE.ConeGeometry(0.5, 1, 3).translate(0, 0.5, 0),
		mound: () => new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.35, 0),
		head: () => new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0),
		shrub: () => new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.5, 0),
		paddy: () => new THREE.ConeGeometry(0.5, 1, 3).translate(0, 0.5, 0)
	}

	function makeInstanced(
		geo: THREE.BufferGeometry,
		material: THREE.Material,
		n: number
	): Instanced {
		const mesh = new THREE.InstancedMesh(geo, material, n)
		mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
		mesh.frustumCulled = false
		return {
			mesh,
			pos: new Float32Array(n * 3),
			scale: new Float32Array(n * 3),
			rot: new Float32Array(n),
			delay: new Float32Array(n)
		}
	}

	function buildCrop(animate = true) {
		animateCrop = animate
		clearGroup(cropGroup)
		instanced = []
		if (!crop || ring.length < 3) return
		let look = LOOK[crop] ?? LOOK['perilla-seed']
		let sp = spacing
		// 하우스·온실 작물 + 남은 밭 작물 (나눠 짓기)이면 밭 쪽은 둘째 작물로 심는다
		let fieldOnly = false
		const cos = Math.cos(-theta)
		const sin = Math.sin(-theta)
		const rot: Ring = ring.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
		// 돌린 좌표 → 세계 좌표
		const back = (u: number, v: number): [number, number] => [
			u * Math.cos(theta) - v * Math.sin(theta),
			u * Math.sin(theta) + v * Math.cos(theta)
		]
		// 시설·진입로 자리 (작물 좌표계로 돌린 것)
		const rotB: Ring[] = blocks.map((b) =>
			b.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
		)
		const houses = plan ? plan.pieces.filter((p) => KINDS[p.piece.k].greenhouse && !p.outside) : []

		if (look.form === 'greenhouse') {
			// 배치한 하우스가 있으면 그 안에만 심는다
			if (houses.length) {
				plantInHouses(look, houses)
				const sideLook = side ? LOOK[side.id] : null
				if (!side || !sideLook || sideLook.form === 'greenhouse') {
					for (const it of instanced) cropGroup.add(it.mesh)
					startGrow()
					return
				}
				look = sideLook
				sp = side.spacing
				fieldOnly = true
			} else return buildGreenhouses(look, rot, back, rotB)
		}

		// 이랑은 실제 간격으로 놓는다 (너무 많으면 몇 줄마다 하나). 포기는 줄 위에서 솎아 그린다
		const pitch = sp?.pitch ?? look.row
		const stepT = sp?.step ?? look.step
		const linesPer = sp && look.form !== 'tree' ? Math.max(1, sp.lines) : 1
		const lineGap = sp?.lineGap ?? 0
		const vs = rot.map((q) => q[1])
		const kRow = Math.max(1, (Math.max(...vs) - Math.min(...vs)) / pitch / MAX_RIDGES)
		const rowSp = pitch * kRow
		const margin = HEADLAND
		const lines = cutRows(rows(rot, rowSp, margin), rotB, rowSp * 0.3)
		let natural = 0
		for (const [, a, b] of lines) natural += ((b - a) / stepT) * linesPer
		const kStep = Math.max(1, natural / MAX_PLANTS)
		const step = stepT * kStep
		const k = Math.sqrt(kRow * kStep)

		let count = 0
		for (const [, a, b] of lines) count += Math.max(1, Math.floor((b - a) / step) + 1) * linesPer
		count = Math.floor(Math.min(count, MAX_PLANTS * 1.3))
		// 솎아 그린 만큼 포기를 조금 키우되 이웃 이랑을 넘지 않게
		const plantScaleW = Math.min(look.w * Math.min(kStep, 2.5), (rowSp * 0.9) / linesPer)
		const plantScaleH = look.h * Math.min(Math.sqrt(kStep), 1.4)
		const bedW = (sp?.bed ?? pitch * 0.62) * kRow
		const spread = rot.reduce((m, [u]) => Math.max(m, Math.abs(u)), 1)

		// 논: 물 댄 면을 먼저 깐다
		if (look.form === 'paddy') {
			const inset = rows(rot, Math.max(0.5, rowSp), margin)
			if (inset.length) {
				const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)))
				const water = new THREE.Mesh(
					new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
					mat(C.water, { transparent: true, opacity: 0.9 })
				)
				water.position.y = 0.03
				water.scale.set(0.96, 1, 0.96)
				cropGroup.add(water)
			}
		}

		// 일군 흙: 가장자리(두렁)를 남기고 안쪽만 흙색으로
		if (look.form !== 'paddy' && look.form !== 'tree') {
			const shrink = Math.max(0.5, 1 - (margin * 0.9) / radius)
			const soil = new THREE.Mesh(
				new THREE.ShapeGeometry(
					new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x * shrink, y * shrink)))
				).rotateX(-Math.PI / 2),
				mat(C.soil)
			)
			soil.position.y = 0.012
			cropGroup.add(soil)
		}

		// 이랑
		const rh = RIDGE[look.form]
		if (rh > 0 && lines.length) {
			const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 7, 1, false, 0, Math.PI)
			// 원통 축을 x(줄 방향)로 눕히면 반쪽이 위로 볼록한 이랑이 된다
			g.rotateZ(Math.PI / 2)
			const ridge = makeInstanced(g, mat(C.ridge), lines.length)
			lines.forEach(([v, a, b], i) => {
				const [x, y] = back((a + b) / 2, v)
				ridge.pos.set([x, 0, -y], i * 3)
				ridge.scale.set([b - a, rh * 2 * Math.min(Math.sqrt(kRow), 2), bedW], i * 3)
				ridge.rot[i] = theta
				ridge.delay[i] = ((b + a) / 2 / spread + 1) * 0.15
			})
			instanced.push(ridge)
		}

		// 포기
		if (look.form === 'tree') {
			const trunkGeo = new THREE.CylinderGeometry(0.5, 0.6, 1, 6).translate(0, 0.5, 0)
			const crownGeo = new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0)
			const trunk = makeInstanced(trunkGeo, mat(lerp(C.plant, C.ridge, 0.35)), count)
			const crownM = makeInstanced(crownGeo, mat(C.plant), count)
			let i = 0
			for (const [v, a, b] of lines) {
				for (let u = a + step / 2; u <= b - step / 2 + 1e-6 && i < count; u += step, i++) {
					const [x, y] = back(u, v)
					const j = (Math.sin(i * 12.9898) * 43758.5453) % 1
					const h = plantScaleH * (0.92 + 0.12 * j)
					trunk.pos.set([x, 0, -y], i * 3)
					trunk.scale.set([0.16 * Math.min(k, 3), h * 0.42, 0.16 * Math.min(k, 3)], i * 3)
					crownM.pos.set([x, h * 0.3, -y], i * 3)
					crownM.scale.set([plantScaleW, h * 0.72, plantScaleW], i * 3)
					trunk.rot[i] = crownM.rot[i] = j * Math.PI
					trunk.delay[i] = crownM.delay[i] = 0.25 + (u / spread + 1) * 0.35 + Math.abs(j) * 0.1
				}
			}
			trunk.mesh.count = crownM.mesh.count = i
			instanced.push(trunk, crownM)
		} else {
			const geo = (unit as Record<string, () => THREE.BufferGeometry>)[look.form]?.() ?? unit.bush()
			const plants = makeInstanced(geo, mat(C.plant), count)
			const lift =
				rh > 0 ? rh * 2 * Math.min(Math.sqrt(kRow), 2) * 0.5 : look.form === 'paddy' ? 0.03 : 0
			let i = 0
			for (const [v0, a, b] of lines) {
				const len = b - a
				const n = Math.max(1, Math.floor(len / step) + 1)
				const off = (len - (n - 1) * step) / 2
				for (let ln = 0; ln < linesPer; ln++) {
					// 한 이랑에 두 줄 이상이면 두둑 위에 줄 간격만큼 벌려 심는다
					const v = v0 + (ln - (linesPer - 1) / 2) * lineGap * kRow
					for (let s = 0; s < n && i < count; s++, i++) {
						const u = a + off + s * step
						const [x, y] = back(u, v)
						const j = Math.abs((Math.sin(i * 12.9898 + v) * 43758.5453) % 1)
						plants.pos.set([x, lift, -y], i * 3)
						const sw = plantScaleW * (0.85 + 0.3 * j)
						plants.scale.set(
							[sw, plantScaleH * (0.85 + 0.3 * j), sw * (look.form === 'mound' ? 1.4 : 1)],
							i * 3
						)
						plants.rot[i] = j * Math.PI * 2
						plants.delay[i] = 0.3 + (u / spread + 1) * 0.35 + j * 0.12
					}
				}
			}
			plants.mesh.count = i
			instanced.push(plants)
		}
		// 배치한 하우스 안에도 같은 작물을 심는다 (나무·논 작물은 빼고)
		if (!fieldOnly && houses.length && look.form !== 'tree' && look.form !== 'paddy')
			plantInHouses(look, houses)
		for (const it of instanced) cropGroup.add(it.mesh)
		startGrow()
	}

	/** 배치한 하우스 안에 길이 방향으로 줄지어 심는다. 간격 자료가 있으면 그 이랑 간격·줄 수로 */
	function plantInHouses(look: Look, houses: PlanPiece[]) {
		const pitch = spacing?.pitch ?? Math.max(1.2, look.row)
		const stepT = spacing?.step ?? look.step
		const linesPer = spacing ? Math.max(1, spacing.lines) : 1
		const lineGap = spacing?.lineGap ?? 0
		// 하우스 안 이랑: 폭에서 양옆 0.3m 를 빼고 이랑 간격으로 나눈다
		const ridgesOf = (w: number) => Math.max(1, Math.floor((w - 0.6) / pitch))
		let natural = 0
		for (const h of houses) natural += ((h.l - 2) / stepT) * ridgesOf(h.w) * linesPer
		const kStep = Math.max(1, natural / MAX_PLANTS)
		const step = stepT * kStep
		type Spot = [number, number, number]
		const spots: Spot[] = []
		const beds: { x: number; y: number; l: number; a: number }[] = []
		for (const h of houses) {
			const n = ridgesOf(h.w)
			const t = (h.piece.a * Math.PI) / 180
			const c = Math.cos(t)
			const s = Math.sin(t)
			for (let r = 0; r < n; r++) {
				const v0 = (r - (n - 1) / 2) * pitch
				beds.push({ x: h.piece.x - v0 * s, y: h.piece.y + v0 * c, l: h.l - 2, a: t })
				for (let ln = 0; ln < linesPer; ln++) {
					const v = v0 + (ln - (linesPer - 1) / 2) * lineGap
					for (let u = -h.l / 2 + 1; u <= h.l / 2 - 1 && spots.length < MAX_PLANTS; u += step)
						spots.push([h.piece.x + u * c - v * s, h.piece.y + u * s + v * c, h.h])
				}
			}
		}
		if (!spots.length) return
		// 두둑 (흙에 심는 하우스·온실만, 낮게)
		if (spacing?.bed && beds.length <= MAX_RIDGES) {
			const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 7, 1, false, 0, Math.PI)
			g.rotateZ(Math.PI / 2)
			const ridge = makeInstanced(g, mat(C.ridge), beds.length)
			beds.forEach((b, i) => {
				ridge.pos.set([b.x, 0.02, -b.y], i * 3)
				ridge.scale.set([b.l, 0.24, spacing!.bed!], i * 3)
				ridge.rot[i] = b.a
				ridge.delay[i] = 0.2
			})
			instanced.push(ridge)
		}
		const geo = look.h > 1 ? unit.tall() : look.form === 'tuft' ? unit.tuft() : unit.head()
		const plants = makeInstanced(geo, mat(C.plant), spots.length)
		const lift = spacing?.bed ? 0.12 : 0.03
		spots.forEach(([x, y, hh], i) => {
			const j = Math.abs((Math.sin(i * 7.31) * 43758.5453) % 1)
			const h = Math.min(look.h * Math.min(Math.sqrt(kStep), 1.4), hh * 0.7)
			const w = Math.min(look.w * Math.min(kStep, 2), (pitch * 0.9) / linesPer, 1.2)
			plants.pos.set([x, lift, -y], i * 3)
			plants.scale.set([w * (0.85 + 0.3 * j), h * (0.85 + 0.3 * j), w], i * 3)
			plants.rot[i] = j * Math.PI * 2
			plants.delay[i] = 0.4 + j * 0.5
		})
		instanced.push(plants)
	}

	function buildGreenhouses(
		look: Look,
		rot: Ring,
		back: (u: number, v: number) => [number, number],
		rotB: Ring[] = []
	) {
		const area = Math.abs(signedArea(ring))
		// 하우스가 너무 많으면 동을 넓게 (큰 땅)
		const k = Math.max(1, Math.sqrt(area / 25000))
		const width = GH_WIDTH * k
		const lines = cutRows(
			rows(rot, width + GH_GAP * k, HEADLAND * k + width / 2),
			rotB,
			width / 2
		).filter(([, a, b]) => b - a > 8)
		if (!lines.length) return
		const spread = rot.reduce((m, [u]) => Math.max(m, Math.abs(u)), 1)

		// 덮개: 반원통
		const coverGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 18, 1, true, 0, Math.PI)
		coverGeo.rotateZ(Math.PI / 2)
		const cover = makeInstanced(
			coverGeo,
			mat(C.glass, {
				transparent: true,
				opacity: C.dark ? 0.32 : 0.55,
				side: THREE.DoubleSide,
				depthWrite: false
			}),
			lines.length
		)
		lines.forEach(([v, a, b], i) => {
			const [x, y] = back((a + b) / 2, v)
			cover.pos.set([x, 0, -y], i * 3)
			cover.scale.set([b - a, GH_HEIGHT * 2 * Math.min(k, 1.6), width], i * 3)
			cover.rot[i] = theta
			cover.delay[i] = ((a + b) / 2 / spread + 1) * 0.3
		})

		// 뼈대: 2m 마다 반원 (갈빗대)
		let ribs = 0
		const ribStep = 2.2 * k
		for (const [, a, b] of lines) ribs += Math.floor((b - a) / ribStep) + 1
		ribs = Math.min(ribs, 3000)
		const ribGeo = new THREE.TorusGeometry(0.5, 0.012, 3, 16, Math.PI).rotateY(Math.PI / 2)
		const rib = makeInstanced(ribGeo, mat(C.plant), ribs)
		let r = 0
		for (const [v, a, b] of lines) {
			const n = Math.floor((b - a) / ribStep) + 1
			const off = (b - a - (n - 1) * ribStep) / 2
			for (let s = 0; s < n && r < ribs; s++, r++) {
				const u = a + off + s * ribStep
				const [x, y] = back(u, v)
				rib.pos.set([x, 0, -y], r * 3)
				rib.scale.set([1, GH_HEIGHT * 2 * Math.min(k, 1.6), width], r * 3)
				rib.rot[r] = theta
				rib.delay[r] = (u / spread + 1) * 0.3
			}
		}
		rib.mesh.count = r

		// 하우스 안 작물: 동마다 세 줄
		const step = look.step * Math.max(1, k * 1.5)
		let total = 0
		for (const [, a, b] of lines) total += 3 * (Math.floor((b - a - 2) / step) + 1)
		total = Math.min(total, MAX_PLANTS)
		const geo = look.h > 1 ? unit.tall() : unit.head()
		const plants = makeInstanced(geo, mat(C.plant), total)
		let i = 0
		for (const [v, a, b] of lines) {
			for (const dv of [-width * 0.28, 0, width * 0.28]) {
				for (let u = a + 1; u <= b - 1 && i < total; u += step, i++) {
					const [x, y] = back(u, v + dv)
					plants.pos.set([x, 0, -y], i * 3)
					plants.scale.set([look.w * k, look.h * Math.min(k, 1.5), look.w * k], i * 3)
					plants.rot[i] = i
					plants.delay[i] = 0.6 + (u / spread + 1) * 0.3
				}
			}
		}
		plants.mesh.count = i
		instanced.push(plants, rib, cover)
		for (const it of instanced) cropGroup.add(it.mesh)
		startGrow()
	}

	// ── 시설 배치 ───────────────────────────────────────

	const scaleK = () => Math.max(1, radius / 40)

	/** 반타원 아치 (길이 x 방향, 폭 w, 높이 h, 바닥 y0) */
	function archGeo(l: number, w: number, h: number) {
		const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 22, 1, true, 0, Math.PI)
		g.rotateZ(Math.PI / 2)
		g.scale(l, 2 * h, w)
		return g
	}

	/** 아치 단면 선 (갈빗대) 여러 개를 한 덩어리로 */
	function ribsGeo(l: number, w: number, h: number, y0: number, z0: number, every: number) {
		const pts: THREE.Vector3[] = []
		const n = Math.max(2, Math.round(l / every) + 1)
		for (let i = 0; i < n; i++) {
			const x = -l / 2 + (l * i) / (n - 1)
			for (let s = 0; s < 14; s++) {
				const a1 = (Math.PI * s) / 14
				const a2 = (Math.PI * (s + 1)) / 14
				pts.push(
					new THREE.Vector3(x, y0 + Math.sin(a1) * h, z0 + (Math.cos(a1) * w) / 2),
					new THREE.Vector3(x, y0 + Math.sin(a2) * h, z0 + (Math.cos(a2) * w) / 2)
				)
			}
		}
		// 마룻대 (꼭대기 긴 선)
		pts.push(new THREE.Vector3(-l / 2, y0 + h, z0), new THREE.Vector3(l / 2, y0 + h, z0))
		return new THREE.BufferGeometry().setFromPoints(pts)
	}

	/** 삼각 지붕 (길이 x 방향, 폭 w, 솟음 rise) */
	function gableGeo(l: number, w: number, rise: number) {
		const s = new THREE.Shape([
			new THREE.Vector2(-w / 2, 0),
			new THREE.Vector2(w / 2, 0),
			new THREE.Vector2(0, rise)
		])
		const g = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false })
		// 단면(z-y 평면 → 폭이 z) 을 x 방향으로 늘린다
		g.translate(0, 0, -l / 2)
		g.rotateY(Math.PI / 2)
		return g
	}

	function rectLine(
		l: number,
		w: number,
		y: number,
		grow: number,
		m: THREE.LineBasicMaterial | THREE.LineDashedMaterial
	) {
		const hl = l / 2 + grow
		const hw = w / 2 + grow
		const line = new THREE.LineLoop(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(-hl, y, -hw),
				new THREE.Vector3(hl, y, -hw),
				new THREE.Vector3(hl, y, hw),
				new THREE.Vector3(-hl, y, hw)
			]),
			m
		)
		line.computeLineDistances()
		return line
	}

	function pieceModel(pp: PlanPiece) {
		const g = new THREE.Group()
		const { w, l, h } = pp
		const p = pp.piece
		const k = scaleK()
		const ink = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.8 })
		const faint = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.35 })
		const glass = mat(C.glass, {
			transparent: true,
			opacity: C.dark ? 0.28 : 0.5,
			side: THREE.DoubleSide,
			depthWrite: false
		})
		// 면과 테두리 선을 한 묶음으로 (같이 옮기고 돌리게)
		const solid = (geo: THREE.BufferGeometry, color: THREE.Color, y = 0) => {
			const box = new THREE.Group()
			box.add(new THREE.Mesh(geo, mat(color)))
			box.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), ink))
			box.position.y = y
			g.add(box)
			return box
		}
		const clear = (geo: THREE.BufferGeometry, y = 0) => {
			const m = new THREE.Mesh(geo, glass)
			m.position.y = y
			m.renderOrder = 2
			g.add(m)
			return m
		}
		// 바닥
		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(l, w).rotateX(-Math.PI / 2),
			mat(p.k === 'yard' || p.k === 'compost' ? C.road : C.paper)
		)
		floor.position.y = 0.022
		g.add(floor)

		if (p.k === 'single') {
			clear(archGeo(l, w, h))
			g.add(new THREE.LineSegments(ribsGeo(l, w, h, 0, 0, 2.4 * Math.min(k, 2)), ink))
		} else if (p.k === 'multi' || p.k === 'smart') {
			const bay = KINDS[p.k].w
			const n = Math.max(1, Math.round(w / bay))
			// 연동: 낮은 벽 위 아치 / 벤로형 온실: 높은 유리벽 위 뾰족 지붕 (한 칸에 마루 둘)
			const rise = p.k === 'multi' ? Math.min(1.6, h * 0.42) : 0.9
			const wall = h - rise
			clear(new THREE.BoxGeometry(l, wall, w), wall / 2)
			g.add(
				new THREE.LineSegments(
					new THREE.EdgesGeometry(new THREE.BoxGeometry(l, wall, w)).translate(0, wall / 2, 0),
					ink
				)
			)
			for (let i = 0; i < n; i++) {
				const z0 = -w / 2 + bay * (i + 0.5)
				if (p.k === 'multi') {
					const roof = clear(archGeo(l, bay, rise), wall)
					roof.position.z = z0
					const ribs = new THREE.LineSegments(
						ribsGeo(l, bay, rise, wall, z0, 3 * Math.min(k, 2)),
						ink
					)
					g.add(ribs)
				} else {
					for (const dz of [-bay / 4, bay / 4]) {
						const geo = gableGeo(l, bay / 2, rise)
						const roof = clear(geo, wall)
						roof.position.z = z0 + dz
						const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), ink)
						e.position.set(0, wall, z0 + dz)
						g.add(e)
					}
				}
			}
			// 벽 기둥 선 (4m 마다)
			const pts: THREE.Vector3[] = []
			for (let x = -l / 2; x <= l / 2 + 1e-6; x += 4 * Math.min(k, 2))
				for (const z of [-w / 2, w / 2])
					pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, wall, z))
			g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), faint))
		} else if (p.k === 'storage') {
			const body = h * 0.72
			solid(new THREE.BoxGeometry(l, body, w), C.model, body / 2)
			solid(gableGeo(l + 0.3, w + 0.3, h - body), C.roof, body)
			// 큰 문
			const dw = Math.min(3.2, l * 0.4)
			const door = new THREE.Mesh(
				new THREE.PlaneGeometry(dw, body * 0.78),
				mat(lerp(C.model, C.ink, 0.45), { side: THREE.DoubleSide })
			)
			door.position.set(0, (body * 0.78) / 2, w / 2 + 0.01)
			g.add(door)
		} else if (p.k === 'shed') {
			const body = h * 0.88
			solid(new THREE.BoxGeometry(l, body, w), C.model, body / 2)
			const roof = solid(new THREE.BoxGeometry(l + 0.5, 0.12, w + 0.5), C.roof, body + 0.08)
			roof.rotation.x = 0.08
			const win = new THREE.Mesh(
				new THREE.PlaneGeometry(Math.min(1.4, l * 0.3), 0.8),
				mat(lerp(C.model, C.ink, 0.35), { side: THREE.DoubleSide })
			)
			win.position.set(-l * 0.18, body * 0.62, w / 2 + 0.01)
			g.add(win)
			const door = new THREE.Mesh(
				new THREE.PlaneGeometry(0.9, body * 0.8),
				mat(lerp(C.model, C.ink, 0.5), { side: THREE.DoubleSide })
			)
			door.position.set(l * 0.25, (body * 0.8) / 2, w / 2 + 0.01)
			g.add(door)
		} else if (p.k === 'compost') {
			const t = 0.25
			solid(new THREE.BoxGeometry(l, h, t), C.model, h / 2).position.z = -w / 2 + t / 2
			for (const sx of [-1, 1]) {
				const m = solid(new THREE.BoxGeometry(t, h, w), C.model, h / 2)
				m.position.x = (sx * (l - t)) / 2
			}
			// 쌓인 퇴비
			const heap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mat(C.soil))
			heap.scale.set(l * 0.7, h * 0.9, w * 0.6)
			heap.position.set(0, 0.05, w * 0.08)
			g.add(heap)
		} else if (p.k === 'yard') {
			// 주차 칸 선 (2.5m 마다)
			const pts: THREE.Vector3[] = []
			for (let x = -l / 2 + 2.5; x < l / 2 - 0.5; x += 2.5)
				pts.push(
					new THREE.Vector3(x, 0.04, -w / 2),
					new THREE.Vector3(x, 0.04, -w / 2 + Math.min(5, w * 0.7))
				)
			g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), faint))
		}

		// 바닥 테두리: 문제 있으면 점선과 ×, 고른 것은 바깥에 한 줄 더
		const bad = pp.outside || pp.overlap || pp.tooBig
		if (bad) {
			const dash = new THREE.LineDashedMaterial({
				color: C.ink,
				dashSize: 0.7 * Math.min(k, 3),
				gapSize: 0.45 * Math.min(k, 3)
			})
			g.add(rectLine(l, w, 0.06, 0.25, dash))
			const x = new THREE.LineSegments(
				new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(-l / 2, 0.06, -w / 2),
					new THREE.Vector3(l / 2, 0.06, w / 2),
					new THREE.Vector3(-l / 2, 0.06, w / 2),
					new THREE.Vector3(l / 2, 0.06, -w / 2)
				]),
				ink
			)
			g.add(x)
		} else {
			g.add(rectLine(l, w, 0.05, 0, ink))
		}
		if (selected === p.id) {
			const sel = new THREE.LineBasicMaterial({ color: C.ink })
			const off = 0.6 * Math.min(k, 3)
			g.add(rectLine(l, w, 0.07, off, sel), rectLine(l, w, 0.07, off * 1.25, sel))
			// 모서리 세움선
			const pts: THREE.Vector3[] = []
			for (const sx of [-1, 1])
				for (const sz of [-1, 1]) {
					const x = sx * (l / 2 + off)
					const z = sz * (w / 2 + off)
					pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, Math.max(1.2, h) * 1.05, z))
				}
			g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), sel))
		}

		// 누르기 쉬운 투명 상자
		const hit = new THREE.Mesh(
			new THREE.BoxGeometry(l + 0.6, Math.max(1, h), w + 0.6),
			new THREE.MeshBasicMaterial({ visible: false })
		)
		hit.position.y = Math.max(1, h) / 2
		g.add(hit)

		g.position.set(p.x, 0, -p.y)
		g.rotation.y = (p.a * Math.PI) / 180
		g.userData = { pick: 'piece', id: p.id }
		return g
	}

	function buildPlan() {
		clearGroup(planGroup)
		pickables.length = 0
		if (!plan || ring.length < 3) return
		const inkLine = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.7 })

		if (plan.entry) {
			const road = new THREE.Mesh(
				ribbon([plan.entry.a, plan.entry.b], plan.entry.w, 0.03, false),
				mat(C.road)
			)
			planGroup.add(road)
			const [a, b] = [plan.entry.a, plan.entry.b]
			const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
			const nx = (-(b[1] - a[1]) / l) * (plan.entry.w / 2)
			const ny = ((b[0] - a[0]) / l) * (plan.entry.w / 2)
			planGroup.add(
				new THREE.LineSegments(
					new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(a[0] + nx, 0.05, -(a[1] + ny)),
						new THREE.Vector3(b[0] + nx, 0.05, -(b[1] + ny)),
						new THREE.Vector3(a[0] - nx, 0.05, -(a[1] - ny)),
						new THREE.Vector3(b[0] - nx, 0.05, -(b[1] - ny))
					]),
					inkLine
				)
			)
		}

		for (const pp of plan.pieces) {
			const m = pieceModel(pp)
			planGroup.add(m)
			pickables.push(m)
		}
	}
	/** 치수 글씨: 시설마다 폭 × 길이, 하우스 동 사이 간격, 밭의 이랑·포기 간격 */
	function buildDims() {
		clearGroup(dimGroup)
		if (!plan || ring.length < 3) return
		const size = Math.min(3.2, Math.max(0.9, radius * 0.042))
		const m1 = (v: number) => String(Math.round(v * 10) / 10)
		const en = document.documentElement.lang.startsWith('en')
		const L = (ko: string, eng: string) => (en ? eng : ko)
		const put = (text: string, x: number, y: number, h: number, boxed = false) => {
			const t = label(text, size, boxed)
			t.position.set(x, h, -y)
			dimGroup.add(t)
		}
		for (const pp of plan.pieces) {
			if (pp.outside) continue
			const p = pp.piece
			const top = pp.h + size * 0.9
			if (p.k === 'smart')
				put(
					`${m1(pp.w)} × ${m1(pp.l)}m · ${L(`${KINDS.smart.w}m ${p.n}칸`, `${p.n} × ${KINDS.smart.w}m bays`)}`,
					p.x,
					p.y,
					top,
					true
				)
			else if (KINDS[p.k].greenhouse) put(`${m1(pp.w)} × ${m1(pp.l)}m`, p.x, p.y, top, true)
			else if (p.k === 'storage')
				put(`${L('창고', 'Storage')} ${m1(pp.w)} × ${m1(pp.l)}m`, p.x, p.y, top)
			else if (p.k === 'yard')
				put(`${L('작업', 'Yard')} ${m1(pp.w)} × ${m1(pp.l)}m`, p.x, p.y, size)
		}
		// 동 사이 간격: 나란한 단동 하우스 한 쌍을 골라 그 사이에 적는다
		const houses = plan.pieces.filter((pp) => pp.piece.k === 'single' && !pp.outside)
		let gap: { x: number; y: number; g: number; nx: number; ny: number } | null = null
		for (let i = 0; i < houses.length && !gap; i++)
			for (let j = i + 1; j < houses.length && !gap; j++) {
				const a = houses[i]
				const b = houses[j]
				if (Math.abs(a.piece.a - b.piece.a) > 1) continue
				const t = (a.piece.a * Math.PI) / 180
				const ux = Math.cos(t)
				const uy = Math.sin(t)
				const dx = b.piece.x - a.piece.x
				const dy = b.piece.y - a.piece.y
				const along = dx * ux + dy * uy
				const across = -dx * uy + dy * ux
				const g = Math.abs(across) - (a.w + b.w) / 2
				const overlap = Math.min(a.l, b.l) / 2 - Math.abs(along) / 2
				if (g < 0.3 || g > 5 || overlap < 3) continue
				// 하우스 끝 가까이 (가운데는 지붕에 가려 안 보인다)
				const end = Math.max(0, Math.min(a.l, b.l) / 2 - Math.abs(along) / 2 - 1.5)
				const sgn = Math.sign(across)
				gap = {
					x: (a.piece.x + b.piece.x) / 2 + ux * end,
					y: (a.piece.y + b.piece.y) / 2 + uy * end,
					g,
					nx: -uy * sgn,
					ny: ux * sgn
				}
			}
		if (gap) {
			const { x, y, g, nx, ny } = gap
			dimGroup.add(
				new THREE.LineSegments(
					new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(x - (nx * g) / 2, 0.12, -(y - (ny * g) / 2)),
						new THREE.Vector3(x + (nx * g) / 2, 0.12, -(y + (ny * g) / 2))
					]),
					new THREE.LineBasicMaterial({ color: C.ink })
				)
			)
			put(`${m1(g)}m`, x, y, size * 0.8, true)
		}
		// 밭 작물: 가장 넓은 밭 덩어리에 이랑·포기 간격 (화면 표와 같은 글)
		const look = crop ? LOOK[crop] : null
		let sp = spacing
		// 하우스 작물 + 남은 밭 작물이면 남은 밭이 좁고 하우스 글씨와 겹쳐서 밭 글씨는 달지 않는다 (간격은 화면 표에)
		if (look?.form === 'greenhouse' && side) sp = null
		const z = plan.zones[0]
		if (sp?.label && look && look.form !== 'greenhouse' && z) {
			// 밭 전체를 덮는 글이라 다른 치수보다 크게
			const t = label(sp.label, size * 1.5, true)
			t.position.set(z.at[0], size * 2.4, -z.at[1])
			dimGroup.add(t)
		}
	}

	// 끌기: 배치 화면에서 시설·표시를 누르면 돌리기 대신 옮긴다
	const raycaster = new THREE.Raycaster()
	const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
	const ndc = new THREE.Vector2()
	function aim(cx: number, cy: number) {
		const r = renderer.domElement.getBoundingClientRect()
		ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
		raycaster.setFromCamera(ndc, camera)
	}
	function pickAt(cx: number, cy: number): THREE.Object3D | null {
		if (!editing || !pickables.length) return null
		aim(cx, cy)
		for (const h of raycaster.intersectObjects(pickables, true)) {
			let o: THREE.Object3D | null = h.object
			while (o && !o.userData.pick) o = o.parent
			if (o) return o
		}
		return null
	}
	function groundAt(cx: number, cy: number): [number, number] | null {
		aim(cx, cy)
		const v = new THREE.Vector3()
		return raycaster.ray.intersectPlane(groundPlane, v) ? [v.x, -v.z] : null
	}
	let drag: {
		obj: THREE.Object3D
		off: [number, number]
		start: [number, number]
		moved: boolean
		id: number
	} | null = null
	let down: [number, number] | null = null
	host.addEventListener(
		'pointerdown',
		(e) => {
			down = [e.clientX, e.clientY]
			const o = pickAt(e.clientX, e.clientY)
			if (!o) return
			const g = groundAt(e.clientX, e.clientY)
			if (!g) return
			e.stopPropagation()
			controls.enabled = false
			controls.autoRotate = false
			host.classList.add('is-touched', 'is-dragging')
			drag = {
				obj: o,
				off: [o.position.x - g[0], -o.position.z - g[1]],
				start: [e.clientX, e.clientY],
				moved: false,
				id: e.pointerId
			}
			try {
				renderer.domElement.setPointerCapture(e.pointerId)
			} catch {
				// 없어도 된다
			}
		},
		{ capture: true }
	)
	host.addEventListener(
		'pointermove',
		(e) => {
			if (!drag || e.pointerId !== drag.id) return
			if (Math.hypot(e.clientX - drag.start[0], e.clientY - drag.start[1]) > 4) drag.moved = true
			if (!drag.moved) return
			const g = groundAt(e.clientX, e.clientY)
			if (!g) return
			drag.obj.position.x = g[0] + drag.off[0]
			drag.obj.position.z = -(g[1] + drag.off[1])
			wake()
		},
		{ capture: true }
	)
	const endDrag = (e: PointerEvent) => {
		if (drag && e.pointerId === drag.id) {
			const d = drag
			drag = null
			controls.enabled = true
			host.classList.remove('is-dragging')
			const x = d.obj.position.x
			const y = -d.obj.position.z
			const kind = d.obj.userData.pick as string
			if (kind === 'piece') {
				if (d.moved) handlers.move?.(d.obj.userData.id, x, y)
				else handlers.pick?.(d.obj.userData.id)
			} else if (d.moved) handlers.marker?.(kind as 'well' | 'outlet', x, y)
			return
		}
		// 빈 땅을 톡 누르면 고른 것을 푼다
		if (
			editing &&
			down &&
			Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5 &&
			e.type === 'pointerup'
		)
			handlers.pick?.(null)
		down = null
	}
	host.addEventListener('pointerup', endDrag, { capture: true })
	host.addEventListener('pointercancel', endDrag, { capture: true })
	// 손가락으로 시설을 누르면 페이지가 내려가지 않게
	host.addEventListener(
		'touchstart',
		(e) => {
			const t = e.touches[0]
			if (t && e.touches.length === 1 && pickAt(t.clientX, t.clientY)) e.preventDefault()
		},
		{ capture: true, passive: false }
	)

	const dummy = new THREE.Object3D()
	function applyGrow(t: number) {
		let done = true
		for (const it of instanced) {
			const n = it.mesh.count
			for (let i = 0; i < n; i++) {
				let g = reduced ? 1 : (t - it.delay[i]) / 0.55
				if (g < 1) done = false
				g = Math.min(1, Math.max(0, g))
				// 살짝 넘쳤다가 자리 잡는 곡선 (easeOutBack 약하게)
				const e = g === 0 ? 0 : 1 + 1.4 * Math.pow(g - 1, 3) + 0.4 * Math.pow(g - 1, 2)
				dummy.position.set(it.pos[i * 3], it.pos[i * 3 + 1], it.pos[i * 3 + 2])
				dummy.rotation.set(0, it.rot[i], 0)
				dummy.scale.set(
					Math.max(1e-4, it.scale[i * 3] * (0.4 + 0.6 * e)),
					Math.max(1e-4, it.scale[i * 3 + 1] * e),
					Math.max(1e-4, it.scale[i * 3 + 2] * (0.4 + 0.6 * e))
				)
				dummy.updateMatrix()
				it.mesh.setMatrixAt(i, dummy.matrix)
			}
			it.mesh.instanceMatrix.needsUpdate = true
		}
		return done
	}

	function startGrow() {
		if (!animateCrop) {
			growing = false
			applyGrow(99)
			wake()
			return
		}
		growStart = performance.now()
		growing = true
		applyGrow(0)
		wake()
	}

	function resize() {
		const w = host.clientWidth
		const h = host.clientHeight
		if (!w || !h) return
		renderer.setSize(w, h, false)
		camera.aspect = w / h
		camera.updateProjectionMatrix()
		// 화면 비율이 바뀌면 (휴대폰 돌리기 등) 아직 손대지 않은 보기는 다시 맞춘다
		if (
			fitAspect &&
			Math.abs(camera.aspect / fitAspect - 1) > 0.05 &&
			!host.classList.contains('is-touched')
		)
			fitCamera()
		wake()
	}

	let raf = 0
	let visible = true
	let idleFrames = 0
	// 실제 프레임 간격을 재서 느린 기기는 화소를 더 줄인다 (1배까지). 그래도 느리면 돌기를 멈춘다
	let last = 0
	let slowSum = 0
	let slowN = 0
	function adapt(t: number) {
		const dt = last ? t - last : 0
		last = t
		if (!dt || dt > 250) return
		slowSum += dt
		if (++slowN < 20) return
		const avg = slowSum / slowN
		slowSum = slowN = 0
		if (avg < 26) return
		// 1배 밑으로 내리면 글자가 뭉개진다
		const floor = Math.min(dpr, 1)
		if (quality > floor) {
			quality = Math.max(floor, quality * 0.8)
			renderer.setPixelRatio(quality)
			resize()
		} else spin(false)
	}
	function frame(t: number) {
		raf = 0
		adapt(t)
		if (controls.autoRotate && performance.now() > spinUntil) controls.autoRotate = false
		if (growing) growing = !applyGrow((performance.now() - growStart) / 1000)
		const moved = controls.update()
		renderer.render(scene, camera)
		if (retired.size) flushRetired()
		idleFrames = growing || moved || controls.autoRotate ? 0 : idleFrames + 1
		if (raf) return
		if (visible && !document.hidden && idleFrames < 30) raf = requestAnimationFrame(frame)
		else last = 0
	}
	function wake() {
		idleFrames = 0
		if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame)
	}
	document.addEventListener('visibilitychange', wake)
	controls.addEventListener('change', wake)
	renderer.domElement.addEventListener('pointerdown', wake)

	const ro = new ResizeObserver(resize)
	ro.observe(host)
	const io = new IntersectionObserver(([e]) => {
		visible = e.isIntersecting
		if (visible) wake()
	})
	io.observe(host)

	// 다크 모드가 바뀌면 색을 다시 읽어 다시 짓는다
	const mo = new MutationObserver(() => {
		const next = readColors()
		if (next.dark === C.dark) return
		C = next
		if (scene.fog) (scene.fog as THREE.Fog).color = C.bg.clone()
		buildWorld()
		buildCrop()
		buildPlan()
		buildDims()
		growing = false
		applyGrow(99)
		wake()
	})
	mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

	resize()

	return {
		setParcel(r: Ring) {
			ring = r
			radius = Math.max(8, ...r.map(([x, y]) => Math.hypot(x, y)))
			theta = mainAngle(r)
			// 새 땅이면 앞 땅의 배치는 지운다 (부르는 쪽이 새 배치를 다시 준다)
			plan = null
			blocks = []
			blockSig = ''
			clearGroup(planGroup)
			clearGroup(dimGroup)
			pickables.length = 0
			buildWorld()
			fitCamera()
			spin(!editing && !host.classList.contains('is-touched'))
			buildCrop()
			wake()
		},
		setCrop(id: string | null, sp?: CropSpacing | null) {
			crop = id
			spacing = sp ?? null
			buildCrop()
			buildDims()
			wake()
		},
		setSide(id: string | null, sp?: CropSpacing | null) {
			side = id ? { id, spacing: sp ?? null } : null
			buildCrop(false)
			buildDims()
			wake()
		},
		setPlan(p, opts) {
			plan = p
			editing = opts.edit
			selected = opts.selected
			if (editing) spin(false)
			// 시설 자리가 바뀐 때만 작물을 다시 심는다 (고르기만 바꾸면 그대로)
			const next = p
				? [
						...p.pieces.map((pp) => rectOf(pp.piece, 1.1)),
						...(p.entry ? [corridor(p.entry.a, p.entry.b, p.entry.w + 0.6)] : [])
					]
				: []
			const sig = next
				.map((r) => r.map(([x, y]) => `${Math.round(x * 10)},${Math.round(y * 10)}`).join(';'))
				.join('|')
			buildPlan()
			if (opts.light) dimGroup.visible = false
			else {
				buildDims()
				dimGroup.visible = true
			}
			if (sig !== blockSig && !opts.light) {
				blocks = next
				blockSig = sig
				// 시설을 옮길 때는 자라는 움직임 없이 바로 다시 심는다
				buildCrop(false)
			}
			wake()
		},
		onPlan(h) {
			handlers = h
		},
		snapshot(width: number, height: number) {
			const keepSel = selected
			const keepC = C
			const keepRatio = renderer.getPixelRatio()
			const keepAspect = camera.aspect
			const relight = keepC.dark
			selected = null
			if (relight) {
				C = readColors(true)
				buildWorld()
				buildCrop()
			}
			buildPlan()
			buildDims()
			growing = false
			applyGrow(99)
			renderer.setPixelRatio(1)
			renderer.setSize(width, height, false)
			renderer.setClearColor(C.bg, 1)
			if (scene.fog) (scene.fog as THREE.Fog).color = C.bg.clone()
			// 손대지 않은 보기는 그림 비율에 맞춰 다시 맞추고, 돌려 본 보기는 그 각도를 그대로 담는다
			const keepFov = camera.fov
			const keepPos = camera.position.clone()
			const keepTarget = controls.target.clone()
			const aspect = width / height
			const touched = host.classList.contains('is-touched')
			camera.aspect = aspect
			if (!touched) fitCamera()
			else if (aspect < keepAspect)
				// 화면보다 좁은 비율이면 세로 화각을 넓혀 화면에서 보던 가로 범위를 그대로 담는다
				camera.fov =
					(2 * Math.atan(Math.tan((keepFov * Math.PI) / 360) * (keepAspect / aspect)) * 180) /
					Math.PI
			camera.updateProjectionMatrix()
			renderer.render(scene, camera)
			camera.fov = keepFov
			camera.position.copy(keepPos)
			controls.target.copy(keepTarget)
			// 같은 작업 안에서 바로 읽으면 preserveDrawingBuffer 없이도 그림이 남아 있다
			const url = renderer.domElement.toDataURL('image/jpeg', 0.9)
			selected = keepSel
			if (relight) {
				C = keepC
				buildWorld()
				buildCrop()
				applyGrow(99)
			}
			if (scene.fog) (scene.fog as THREE.Fog).color = C.bg.clone()
			renderer.setClearColor(0x000000, 0)
			buildPlan()
			buildDims()
			renderer.setPixelRatio(keepRatio)
			camera.aspect = keepAspect
			resize()
			wake()
			return url
		},
		dispose() {
			cancelAnimationFrame(raf)
			document.removeEventListener('visibilitychange', wake)
			ro.disconnect()
			io.disconnect()
			mo.disconnect()
			clearGroup(cropGroup)
			clearGroup(planGroup)
			clearGroup(world)
			flushRetired()
			mats.forEach((m) => m.dispose())
			controls.dispose()
			renderer.dispose()
			renderer.domElement.remove()
		}
	}
}
