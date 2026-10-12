/**
 * 내 땅 3D 미리보기 (/tools/farmland-crop-finder/). 필지 경계를 흰 모형 판으로 세우고 고른 작물을 이랑에 심어 보여 준다.
 * three.js 는 이 화면에서만 동적 import 로 불러온다 (다른 페이지 번들에 들어가지 않게).
 * 좌표: 필지 무게중심 기준 미터 (x 동쪽, y 북쪽) → three (x, 높이, -y).
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

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
	lettuce: { form: 'greenhouse', row: 1.2, step: 0.25, h: 0.22, w: 0.28 }
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

const MAX_PLANTS = 3600
const MAX_RIDGES = 420
const SLAB = 0.6
const HEADLAND = 1.2
const GH_WIDTH = 7
const GH_GAP = 1.6
const GH_HEIGHT = 3

/** 경위도 고리 → 무게중심 기준 미터. 가장 넓은 고리 하나만 쓴다 */
export function toLocalMeters(rings: [number, number][][]): Ring | null {
	const pick = rings
		.filter((r) => r.length >= 3)
		.map((r) => ({ r, a: Math.abs(signedArea(r)) }))
		.sort((a, b) => b.a - a.a)[0]?.r
	if (!pick) return null
	const lon0 = pick.reduce((s, p) => s + p[0], 0) / pick.length
	const lat0 = pick.reduce((s, p) => s + p[1], 0) / pick.length
	const mx = 111320 * Math.cos((lat0 * Math.PI) / 180)
	const my = 110540
	const ring = pick.map(([x, y]) => [(x - lon0) * mx, (y - lat0) * my] as [number, number])
	return centre(ring)
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

/** 넓이 무게중심을 원점으로 옮기고 닫는 점(처음과 같은 끝 점)은 뺀다 */
function centre(ring: Ring): Ring {
	const r = ring.slice()
	const [fx, fy] = r[0]
	const [lx, ly] = r[r.length - 1]
	if (Math.hypot(fx - lx, fy - ly) < 1e-6) r.pop()
	const a = signedArea(r)
	let cx = 0
	let cy = 0
	for (let i = 0; i < r.length; i++) {
		const [x1, y1] = r[i]
		const [x2, y2] = r[(i + 1) % r.length]
		const f = x1 * y2 - x2 * y1
		cx += (x1 + x2) * f
		cy += (y1 + y2) * f
	}
	if (Math.abs(a) > 1e-6) {
		cx /= 6 * a
		cy /= 6 * a
	} else {
		cx = r.reduce((s, p) => s + p[0], 0) / r.length
		cy = r.reduce((s, p) => s + p[1], 0) / r.length
	}
	return r.map(([x, y]) => [x - cx, y - cy])
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

const lerp = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t)

function readColors() {
	const cs = getComputedStyle(document.documentElement)
	const get = (name: string, fallback: string) => {
		const v = cs.getPropertyValue(name).trim()
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
		glass: lerp(bg, ink, dark ? 0.12 : 0.02)
	}
}

type Instanced = {
	mesh: THREE.InstancedMesh
	pos: Float32Array
	scale: Float32Array
	rot: Float32Array
	delay: Float32Array
}

export type FieldView = {
	setParcel(ring: Ring, opts?: { label?: string }): void
	setCrop(cropId: string | null): void
	dispose(): void
}

export function createFieldView(host: HTMLElement): FieldView {
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
	let C = readColors()

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
	renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
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
	controls.autoRotate = !reduced
	controls.autoRotateSpeed = 0.55
	controls.addEventListener('start', () => {
		controls.autoRotate = false
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
	scene.add(world, cropGroup)

	let ring: Ring = []
	let radius = 30
	let theta = 0
	let instanced: Instanced[] = []
	let growStart = 0
	let growing = false
	let crop: string | null = null
	const mats: THREE.Material[] = []

	const mat = (color: THREE.Color, extra: THREE.MeshLambertMaterialParameters = {}) => {
		const m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra })
		mats.push(m)
		return m
	}

	function clearGroup(g: THREE.Group) {
		g.traverse((o) => {
			const m = o as THREE.Mesh
			if (m.geometry) m.geometry.dispose()
			const mt = (m as { material?: THREE.Material | THREE.Material[] }).material
			if (Array.isArray(mt)) mt.forEach((x) => x.dispose())
			else mt?.dispose()
			const sp = o as THREE.Sprite
			if (sp.isSprite) (sp.material.map as THREE.Texture | null)?.dispose()
		})
		g.clear()
	}

	function label(text: string, size: number) {
		const c = document.createElement('canvas')
		const px = 64
		const ctx = c.getContext('2d')!
		ctx.font = `700 ${px}px Pretendard, system-ui, sans-serif`
		const w = Math.ceil(ctx.measureText(text).width) + 16
		c.width = w
		c.height = px + 20
		ctx.font = `700 ${px}px Pretendard, system-ui, sans-serif`
		ctx.fillStyle = `#${C.ink.getHexString(THREE.SRGBColorSpace)}`
		ctx.textBaseline = 'middle'
		ctx.fillText(text, 8, c.height / 2)
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

		// 축척 막대: 땅 크기에 맞는 둥근 길이
		const want = radius * 0.4
		const L = [5, 10, 20, 50, 100, 200, 500, 1000].reduce((a, b) =>
			Math.abs(b - want) < Math.abs(a - want) ? b : a
		)
		let maxY = -Infinity
		for (const [, y] of ring) maxY = Math.max(maxY, -y)
		const minX = -L / 2
		const y0 = -SLAB + 0.02
		const z0 = maxY + radius * 0.07
		const t = radius * 0.04
		const bar = new THREE.LineSegments(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(minX, y0, z0),
				new THREE.Vector3(minX + L, y0, z0),
				new THREE.Vector3(minX, y0, z0 - t),
				new THREE.Vector3(minX, y0, z0 + t),
				new THREE.Vector3(minX + L, y0, z0 - t),
				new THREE.Vector3(minX + L, y0, z0 + t)
			]),
			new THREE.LineBasicMaterial({ color: C.ink })
		)
		world.add(bar)
		const tag = label(`${L}m`, radius * 0.055)
		tag.position.set(0, y0 + radius * 0.05, z0)
		world.add(tag)

		// 북쪽 표시
		const n = label('N', radius * 0.055)
		n.position.set(0, y0 + radius * 0.04, -(radius * 1.3))
		world.add(n)
	}

	function fitCamera() {
		// 세로·가로 시야 중 좁은 쪽에 땅이 다 들어오게 (모바일은 가로가 좁다)
		const vfov = (camera.fov * Math.PI) / 180
		const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (camera.aspect || 1))
		const d = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * (camera.aspect < 1 ? 1.02 : 0.86)
		const el = (42 * Math.PI) / 180
		const az = (-35 * Math.PI) / 180
		camera.position.set(
			d * Math.cos(el) * Math.sin(az),
			d * Math.sin(el),
			d * Math.cos(el) * Math.cos(az)
		)
		controls.target.set(0, 0, radius * 0.06)
		controls.minDistance = radius * 0.8
		controls.maxDistance = radius * 6
		camera.near = Math.max(0.05, radius / 200)
		camera.far = radius * 40
		camera.updateProjectionMatrix()
		controls.update()
		// 먼 바닥 격자만 배경색으로 흐려지게
		scene.fog = new THREE.Fog(C.bg, d + radius * 1.6, d + radius * 5.5)
	}

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

	function buildCrop() {
		clearGroup(cropGroup)
		instanced = []
		if (!crop || ring.length < 3) return
		const look = LOOK[crop] ?? LOOK['perilla-seed']
		const cos = Math.cos(-theta)
		const sin = Math.sin(-theta)
		const rot: Ring = ring.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
		// 돌린 좌표 → 세계 좌표
		const back = (u: number, v: number): [number, number] => [
			u * Math.cos(theta) - v * Math.sin(theta),
			u * Math.sin(theta) + v * Math.cos(theta)
		]
		const area = Math.abs(signedArea(ring))

		if (look.form === 'greenhouse') return buildGreenhouses(look, rot, back)

		// 포기가 너무 많으면 간격을 넓혀 그린다 (모형이라 같은 느낌만 나면 된다)
		const natural = area / (look.row * look.step)
		const k = Math.max(1, Math.sqrt(natural / MAX_PLANTS))
		const rowSp = look.row * k
		const step = look.step * k
		const margin = HEADLAND * Math.min(Math.sqrt(k), 1.6)
		let lines = rows(rot, rowSp, margin)
		if (lines.length > MAX_RIDGES)
			lines = lines.filter((_, i) => i % Math.ceil(lines.length / MAX_RIDGES) === 0)

		let count = 0
		for (const [, a, b] of lines) count += Math.max(1, Math.floor((b - a) / step) + 1)
		count = Math.floor(Math.min(count, MAX_PLANTS * 1.3))
		const plantScaleW = look.w * Math.min(k, 3.2)
		const plantScaleH = look.h * Math.min(Math.sqrt(k), 2.2)
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
				ridge.scale.set([b - a, rh * 2 * Math.min(Math.sqrt(k), 2), rowSp * 0.62], i * 3)
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
				rh > 0 ? rh * 2 * Math.min(Math.sqrt(k), 2) * 0.5 : look.form === 'paddy' ? 0.03 : 0
			let i = 0
			for (const [v, a, b] of lines) {
				const len = b - a
				const n = Math.max(1, Math.floor(len / step) + 1)
				const off = (len - (n - 1) * step) / 2
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
			plants.mesh.count = i
			instanced.push(plants)
		}
		for (const it of instanced) cropGroup.add(it.mesh)
		startGrow()
	}

	function buildGreenhouses(
		look: Look,
		rot: Ring,
		back: (u: number, v: number) => [number, number]
	) {
		const area = Math.abs(signedArea(ring))
		// 하우스가 너무 많으면 동을 넓게 (큰 땅)
		const k = Math.max(1, Math.sqrt(area / 25000))
		const width = GH_WIDTH * k
		const lines = rows(rot, width + GH_GAP * k, HEADLAND * k + width / 2).filter(
			([, a, b]) => b - a > 8
		)
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
		wake()
	}

	let raf = 0
	let visible = true
	let idleFrames = 0
	function frame() {
		raf = 0
		if (growing) growing = !applyGrow((performance.now() - growStart) / 1000)
		const moved = controls.update()
		renderer.render(scene, camera)
		idleFrames = growing || moved || controls.autoRotate ? 0 : idleFrames + 1
		if (visible && idleFrames < 30) raf = requestAnimationFrame(frame)
	}
	function wake() {
		idleFrames = 0
		if (!raf && visible) raf = requestAnimationFrame(frame)
	}
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
			buildWorld()
			fitCamera()
			controls.autoRotate = !reduced && !host.classList.contains('is-touched')
			buildCrop()
			wake()
		},
		setCrop(id: string | null) {
			crop = id
			buildCrop()
			wake()
		},
		dispose() {
			cancelAnimationFrame(raf)
			ro.disconnect()
			io.disconnect()
			mo.disconnect()
			clearGroup(cropGroup)
			clearGroup(world)
			mats.forEach((m) => m.dispose())
			controls.dispose()
			renderer.dispose()
			renderer.domElement.remove()
		}
	}
}
