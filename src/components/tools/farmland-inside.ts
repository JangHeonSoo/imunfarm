/**
 * 안에서 보기: 비닐하우스·유리온실 안, 노지 밭 한가운데를 사람 눈높이로 본다.
 * 바깥 3D(farmland-3d.ts)와 같은 간격 자료(CropSpacing)로 포기 하나하나를 실제 간격에 심는다 (솎지 않는다).
 * 좌표: 길이(통로) 방향 x, 폭 방향 z, 높이 y. 바닥 가운데가 원점.
 */
import * as THREE from 'three'
import { EQUIP_INFO, EQUIP_SET, type EquipId } from '../../data/farmland-equip'

export type InsideKind = 'house' | 'smart' | 'field'

export type InsideLook = {
	/** 포기 모양: 키 큰 줄기 작물 / 낮은 포기 / 나무 */
	shape: 'tall' | 'stalk' | 'blade' | 'low' | 'tree' | 'bush'
	/** 다 자란 포기 높이·폭 m */
	h: number
	w: number
}

export type InsideSpec = {
	kind: InsideKind
	/** 시설 크기 m (밭이면 무시하고 간격으로 정한다) */
	w: number
	l: number
	h: number
	/** 유리온실 칸 수 (8m 칸) */
	bays?: number
	look: InsideLook
	/** 간격 m (CropSpacing 과 같은 뜻) */
	pitch: number
	bed: number | null
	lines: number
	lineGap: number
	step: number
	/** 수경재배 (유리온실 작물): 흙 두둑 대신 걸이식 거터·슬라브 */
	hydro: 'gutter' | 'bench' | null
	/** 검은 비닐 멀칭을 덮는 노지 작물 */
	mulch: boolean
	/** 영어 화면 (시설 이름표) */
	en: boolean
	/** 치수 글씨 (cm 글은 부르는 쪽이 범위까지 맞춰 준다) */
	text: {
		size: string
		height?: string
		pitch?: string
		bed?: string
		furrow?: string
		step?: string
		lineGap?: string
	}
}

export type InsideCtx = {
	mat(color: THREE.Color, extra?: THREE.MeshLambertMaterialParameters): THREE.Material
	label(text: string, size: number, boxed?: boolean): THREE.Sprite
	C: {
		ink: THREE.Color
		bg: THREE.Color
		soil: THREE.Color
		ridge: THREE.Color
		plant: THREE.Color
		glass: THREE.Color
		model: THREE.Color
		roof: THREE.Color
		road: THREE.Color
		dark: boolean
	}
}

export type InsideScene = {
	group: THREE.Group
	/** 처음 눈 자리와 바라보는 점 */
	eye: THREE.Vector3
	target: THREE.Vector3
	/** 돌려 볼 때 눈이 멀어질 수 있는 거리 */
	reach: number
	/** 안개 거리 (먼 끝이 흐려지게) */
	far: number
	/** 그린 시설과 그 자리 (목록에서 누르면 그쪽을 본다) */
	equip: { id: EquipId; at: THREE.Vector3; from: THREE.Vector3 }[]
	/** 눌러서 고를 수 있는 시설 조각 (userData.equip) */
	pick: THREE.Object3D[]
}

/**
 * 설비 크기. 화면에 숫자로 적지 않는다 (치수 글씨는 간격·시설 크기만).
 * 하우스 뼈대는 표준도 값, 유리온실 거터·벤치 높이와 레일 파이프는 모형 값이다 (공식 규격을 찾지 못함).
 */
const EQUIP = {
	/**
	 * 단동 하우스 (폭 7.0m·동고 3.3m 내재해형 07-단동-3·10-단동-2 표준도: 측고 1.4m, 서까래 φ31.8 @600mm,
	 * 양옆 감는 측창, 치마 비닐 20–40cm. 농사로 내재해형 시설 표준도면)
	 */
	rib: 0.6,
	shoulder: 1.4,
	skirt: 0.3,
	/** 하우스 안 흙 두둑 높이 */
	bedH: 0.25,
	/** 두둑이 없는 평이랑 작물도 보이게 깔아 두는 낮은 흙 줄 높이 */
	flatH: 0.08,
	/** 유리온실 걸이식 재배 거터 높이(바닥에서 거터 윗면) */
	gutterY: 0.6,
	/** 딸기 고설 벤치 높이 */
	benchY: 1.0,
	/** 레일 파이프: 통로마다 두 줄, 그 사이 거리·높이·굵기 */
	railGap: 0.55,
	railY: 0.12,
	railR: 0.025,
	/** 유리온실 기둥 간격 (길이 방향) */
	post: 4,
	/** 벤로형 지붕 솟음 (바깥 모형과 같다) */
	rise: 0.9
}

/** 한 번에 그리는 포기 수·조각 수 한도 (휴대폰도 버티게) */
const MAX = 9000
// 휴대폰(손가락 화면)은 조각을 줄인다. 줄어드는 것은 심은 길이뿐, 간격은 그대로
const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const PARTS = COARSE ? 6000 : 9000

export function buildInside(s: InsideSpec, ctx: InsideCtx): InsideScene {
	const { mat, label, C } = ctx
	const g = new THREE.Group()
	const ink = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.75 })
	const faint = new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.3 })
	const glass = mat(C.glass, {
		transparent: true,
		opacity: C.dark ? 0.18 : 0.32,
		side: THREE.DoubleSide,
		depthWrite: false
	})
	const lines = (pts: THREE.Vector3[], m: THREE.LineBasicMaterial = ink) => {
		const o = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), m)
		g.add(o)
		return o
	}
	const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
	const equip: InsideScene['equip'] = []
	const pick: THREE.Object3D[] = []
	/** 장비 조각: 눌러서 고를 수 있게 표시해 둔다 */
	const part = <M extends THREE.Object3D>(id: EquipId, o: M) => {
		o.userData.equip = id
		pick.push(o)
		g.add(o)
		return o
	}

	// 보이는 크기: 시설은 그대로, 너무 크면 앞쪽 일부만 (포기를 솎지 않으려고)
	let L = s.l
	let W = s.w
	if (s.kind === 'field') {
		// 밭: 이랑 14줄쯤, 길이는 폭의 1.6배 (나무는 더 넓게)
		W = Math.min(60, Math.max(12, s.pitch * 14))
		L = Math.min(80, W * 1.6)
	} else if (s.kind === 'smart') {
		W = Math.min(s.w, 16)
		L = Math.min(s.l, 40)
	} else L = Math.min(s.l, 60)
	// 하우스: 폭에서 양옆 0.3m 를 빼고 이랑 간격으로 나눈다 (바깥 3D 와 같은 셈)
	const usable = s.kind === 'field' ? W : W - 0.6
	const nRows = Math.max(1, Math.floor(usable / s.pitch))
	// 그릴 조각(잎·포기)이 한도를 넘으면 심는 길이만 줄인다 (솎지 않고, 뒷줄이 비지 않게).
	// 하우스·온실 뼈대는 그대로 두고 앞쪽부터 심는다
	const parts = { tall: 11, stalk: 7, blade: 4, low: 5, tree: 2, bush: 1 }[s.look.shape]
	const perM = (nRows * Math.max(1, s.lines) * parts) / s.step
	let plantL = L
	if (perM * plantL > PARTS) plantL = Math.max(8, PARTS / perM)
	if (s.kind === 'field') L = plantL

	// 바닥
	const floorPad = s.kind === 'field' ? 6 : 0
	const floor = new THREE.Mesh(
		new THREE.PlaneGeometry(L + floorPad * 2, W + floorPad * 2).rotateX(-Math.PI / 2),
		mat(s.kind === 'smart' ? C.road : C.soil)
	)
	g.add(floor)

	// ── 줄(이랑·거터) 자리 ───────────────────────────────
	const rowsZ: number[] = []
	for (let r = 0; r < nRows; r++) rowsZ.push((r - (nRows - 1) / 2) * s.pitch)
	// 눈이 서는 가운데 통로 왼쪽 줄 (치수 글씨도 이 통로에 단다)
	const mid = Math.max(0, Math.floor(rowsZ.length / 2) - 1)
	// 입구 쪽은 비워 둔다 (하우스: 난방기·관수 자리, 온실: 양액기·온수관 자리)
	const x0 = -L / 2 + (s.kind === 'field' ? 0.4 : s.kind === 'smart' ? 3 : 1.6)
	const x1 = Math.min(L / 2 - (s.kind === 'field' ? 0.4 : 1), x0 + plantL - 1)
	const runL = x1 - x0

	// ── 시설 뼈대 ───────────────────────────────────────
	if (s.kind === 'house') {
		const h = s.h
		// 단면: 어깨(측고)까지 곧은 옆면, 그 위는 반타원 아치
		const sh = Math.min(EQUIP.shoulder, h * 0.5)
		const seg = 20
		const prof: [number, number][] = [[-W / 2, 0]]
		for (let i = 0; i <= seg; i++) {
			const a = Math.PI - (Math.PI * i) / seg
			prof.push([(Math.cos(a) * W) / 2, sh + Math.sin(a) * (h - sh)])
		}
		prof.push([W / 2, 0])
		// 덮개 비닐: 옆면 둘 + 아치
		const arch = new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1, true, 0, Math.PI)
		arch.rotateZ(Math.PI / 2)
		arch.scale(L, 2 * (h - sh), W)
		arch.translate(0, sh, 0)
		const cover = new THREE.Mesh(arch, glass)
		cover.renderOrder = 2
		g.add(cover)
		for (const z of [-W / 2, W / 2]) {
			const side = new THREE.Mesh(new THREE.PlaneGeometry(L, sh), glass)
			side.position.set(0, sh / 2, z)
			side.renderOrder = 2
			g.add(side)
		}
		// 서까래 (아치 파이프, 단면 그대로)
		const pts: THREE.Vector3[] = []
		for (let x = -L / 2; x <= L / 2 + 1e-6; x += EQUIP.rib)
			for (let i = 0; i < prof.length - 1; i++)
				pts.push(V(x, prof[i][1], prof[i][0]), V(x, prof[i + 1][1], prof[i + 1][0]))
		lines(pts)
		// 가로대 (길이 방향 파이프): 꼭대기와 아치 양쪽
		const purl: THREE.Vector3[] = []
		for (const i of [seg / 2, seg / 4, (seg * 3) / 4, 2, seg - 2]) {
			const [z, y] = prof[1 + i]
			purl.push(V(-L / 2, y, z), V(L / 2, y, z))
		}
		lines(purl)
		// 측창: 양옆 어깨 높이의 감는 축(말아 올린 비닐)과 아래 치마 비닐 끝선
		const shaft = mat(C.model)
		for (const z of [-W / 2 + 0.03, W / 2 - 0.03]) {
			const roll = new THREE.Mesh(
				new THREE.CylinderGeometry(0.035, 0.035, L, 8).rotateZ(Math.PI / 2),
				shaft
			)
			roll.position.set(0, sh, z)
			g.add(roll)
		}
		lines(
			[
				V(-L / 2, EQUIP.skirt, -W / 2),
				V(L / 2, EQUIP.skirt, -W / 2),
				V(-L / 2, EQUIP.skirt, W / 2),
				V(L / 2, EQUIP.skirt, W / 2)
			],
			faint
		)
		// 양 끝 마구리: 투명 막 + 문틀 (앞쪽)
		const endShape = new THREE.Shape(prof.map(([z, y]) => new THREE.Vector2(z, y)))
		for (const ex of [-L / 2, L / 2]) {
			const m = new THREE.Mesh(new THREE.ShapeGeometry(endShape), glass)
			m.rotation.y = Math.PI / 2
			m.position.x = ex
			m.renderOrder = 2
			g.add(m)
		}
		const dw = 1.6
		const dh = 2.1
		lines([
			V(-L / 2, 0, -dw / 2),
			V(-L / 2, dh, -dw / 2),
			V(-L / 2, dh, -dw / 2),
			V(-L / 2, dh, dw / 2),
			V(-L / 2, dh, dw / 2),
			V(-L / 2, 0, dw / 2)
		])
	} else if (s.kind === 'smart') {
		const wall = s.h - EQUIP.rise
		// 유리 벽 (보이는 부분의 네 벽)
		const box = new THREE.Mesh(new THREE.BoxGeometry(L, wall, W), glass)
		box.position.y = wall / 2
		box.renderOrder = 2
		g.add(box)
		const edges = new THREE.LineSegments(
			new THREE.EdgesGeometry(new THREE.BoxGeometry(L, wall, W)),
			ink
		)
		edges.position.y = wall / 2
		g.add(edges)
		// 지붕: 8m 칸마다 마루 둘 (벤로형)
		const bay = 8
		const nb = Math.max(1, Math.round(W / bay))
		const roofPts: THREE.Vector3[] = []
		const posts: THREE.Vector3[] = []
		for (let b = 0; b < nb; b++) {
			const z0 = -W / 2 + bay * b
			for (const q of [0, 0.5]) {
				const za = z0 + bay * q
				const zm = za + bay / 4
				const zb = za + bay / 2
				// 마루와 처마 선
				roofPts.push(V(-L / 2, s.h, zm), V(L / 2, s.h, zm))
				for (let x = -L / 2; x <= L / 2 + 1e-6; x += EQUIP.post)
					roofPts.push(V(x, wall, za), V(x, s.h, zm), V(x, s.h, zm), V(x, wall, zb))
			}
			// 칸 경계 거터·기둥
			const zg = z0
			roofPts.push(V(-L / 2, wall, zg), V(L / 2, wall, zg))
			for (let x = -L / 2; x <= L / 2 + 1e-6; x += EQUIP.post)
				posts.push(V(x, 0, zg), V(x, wall, zg))
		}
		roofPts.push(V(-L / 2, wall, W / 2), V(L / 2, wall, W / 2))
		for (let x = -L / 2; x <= L / 2 + 1e-6; x += EQUIP.post)
			posts.push(V(x, 0, W / 2), V(x, wall, W / 2))
		lines(roofPts, faint)
		lines(posts)
		// 지붕 유리: 반 칸(4m)마다 양쪽 경사면
		const quad: number[] = []
		const face = (za: number, zb: number, ya: number, yb: number) =>
			quad.push(
				-L / 2,
				ya,
				za,
				L / 2,
				ya,
				za,
				L / 2,
				yb,
				zb,
				-L / 2,
				ya,
				za,
				L / 2,
				yb,
				zb,
				-L / 2,
				yb,
				zb
			)
		for (let b = 0; b < nb * 2; b++) {
			const za = -W / 2 + (bay / 2) * b
			face(za, za + bay / 4, wall, s.h)
			face(za + bay / 4, za + bay / 2, s.h, wall)
		}
		const roofGeo = new THREE.BufferGeometry()
		roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(quad, 3))
		roofGeo.computeVertexNormals()
		const roof = new THREE.Mesh(roofGeo, glass)
		roof.renderOrder = 2
		g.add(roof)
	}

	// ── 줄마다 두둑·거터·멀칭 ─────────────────────────────
	const ridgeMat = mat(C.ridge)
	const mulchMat = mat(C.dark ? C.ink.clone().lerp(C.bg, 0.75) : C.ink.clone().lerp(C.bg, 0.18))
	const whiteMat = mat(C.model)
	let topY = 0.02
	if (s.hydro === 'gutter' || s.hydro === 'bench') {
		const y = s.hydro === 'gutter' ? EQUIP.gutterY : EQUIP.benchY
		const gw = s.hydro === 'gutter' ? Math.max(0.25, s.lineGap + 0.2) : 0.3
		topY = y
		const gutter = new THREE.InstancedMesh(
			new THREE.BoxGeometry(1, 0.12, 1),
			ridgeMat,
			rowsZ.length
		)
		const slab = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 1), whiteMat, rowsZ.length)
		const dm = new THREE.Object3D()
		rowsZ.forEach((z, i) => {
			dm.position.set((x0 + x1) / 2, y - 0.06, z)
			dm.scale.set(runL, 1, gw)
			dm.updateMatrix()
			gutter.setMatrixAt(i, dm.matrix)
			dm.position.y = y + 0.04
			dm.scale.set(runL, 1, gw * 0.8)
			dm.updateMatrix()
			slab.setMatrixAt(i, dm.matrix)
		})
		g.add(gutter, slab)
		// 거터를 거는 줄 (2m 마다) / 벤치 다리
		const hang: THREE.Vector3[] = []
		for (const z of rowsZ)
			for (let x = x0; x <= x1 + 1e-6; x += 2)
				hang.push(V(x, s.hydro === 'gutter' ? s.h - EQUIP.rise : 0, z), V(x, y - 0.12, z))
		lines(hang, faint)
	} else {
		const hasBed = s.bed !== null
		const bedW = s.bed ?? Math.min(s.pitch * 0.6, Math.max(0.3, s.lineGap * s.lines))
		const bh = hasBed
			? s.kind === 'house'
				? EQUIP.bedH
				: Math.max(0.15, EQUIP.bedH * 0.8)
			: EQUIP.flatH
		const isTree = s.look.shape === 'tree'
		if (!isTree) {
			// 두둑: 윗면이 좁은 사다리꼴 단면
			const sh = new THREE.Shape([
				new THREE.Vector2(-bedW / 2 - bh * 0.5, 0),
				new THREE.Vector2(bedW / 2 + bh * 0.5, 0),
				new THREE.Vector2(bedW / 2, bh),
				new THREE.Vector2(-bedW / 2, bh)
			])
			const geo = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false })
			geo.translate(0, 0, -0.5)
			geo.rotateY(Math.PI / 2)
			const beds = new THREE.InstancedMesh(geo, s.mulch ? mulchMat : ridgeMat, rowsZ.length)
			const dm = new THREE.Object3D()
			rowsZ.forEach((z, i) => {
				dm.position.set((x0 + x1) / 2, 0, z)
				dm.scale.set(runL, 1, 1)
				dm.updateMatrix()
				beds.setMatrixAt(i, dm.matrix)
			})
			g.add(beds)
			topY = bh
		}
		// 점적 호스: 하우스 흙 두둑에서 줄마다 한 가닥
		if (s.kind === 'house') {
			const drip: THREE.Vector3[] = []
			for (const z of rowsZ)
				for (let ln = 0; ln < s.lines; ln++) {
					const dz = (ln - (s.lines - 1) / 2) * s.lineGap
					drip.push(V(x0, topY + 0.01, z + dz + 0.06), V(x1, topY + 0.01, z + dz + 0.06))
				}
			lines(drip, ink)
		}
	}

	// ── 포기 (실제 간격, 솎지 않음) ──────────────────────
	type Spot = [number, number]
	const spots: Spot[] = []
	for (const z of rowsZ)
		for (let ln = 0; ln < s.lines; ln++) {
			const dz = (ln - (s.lines - 1) / 2) * s.lineGap
			const n = Math.max(1, Math.floor(runL / s.step) + 1)
			const off = (runL - (n - 1) * s.step) / 2
			for (let i = 0; i < n && spots.length < MAX; i++) spots.push([x0 + off + i * s.step, z + dz])
		}
	const leafMat = mat(C.plant.clone().lerp(C.bg, 0.12))
	const stemMat = mat(C.plant.clone().lerp(C.ridge, 0.35))
	const jit = (i: number) => Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1)
	// 잎 한 장: 납작한 마름모 (팔면체를 눌러서). 원점이 잎자루, +x 쪽으로 뻗는다
	const leafGeo = () =>
		new THREE.OctahedronGeometry(0.5, 0).scale(1, 0.1, 0.62).translate(0.5, 0, 0)
	const dm = new THREE.Object3D()
	const eul = new THREE.Euler()
	/** 인스턴스 하나를 위치·돌림(y, 기울기)·크기로 놓는다 */
	const place = (
		mesh: THREE.InstancedMesh,
		i: number,
		x: number,
		y: number,
		z: number,
		ry: number,
		tilt: number,
		sx: number,
		sy: number,
		sz: number
	) => {
		dm.position.set(x, y, z)
		eul.set(0, ry, tilt, 'YZX')
		dm.rotation.copy(eul)
		dm.scale.set(sx, sy, sz)
		dm.updateMatrix()
		mesh.setMatrixAt(i, dm.matrix)
	}
	const { shape, h: ph, w: pw } = s.look
	if (shape === 'tall' || shape === 'stalk') {
		// 줄기 + 돌아가며 달린 잎. 하우스·온실 덩굴 작물(tall)은 위로 유인줄을 맨다
		const per = shape === 'tall' ? 10 : 6
		const stem = new THREE.InstancedMesh(
			new THREE.CylinderGeometry(0.5, 0.5, 1, 5).translate(0, 0.5, 0),
			stemMat,
			spots.length
		)
		const leaf = new THREE.InstancedMesh(leafGeo(), leafMat, spots.length * per)
		const strings: THREE.Vector3[] = []
		const wireY = Math.min(topY + ph + 0.4, (s.kind === 'smart' ? s.h - EQUIP.rise : s.h) - 0.3)
		let li = 0
		spots.forEach(([x, z], i) => {
			const hh = ph * (0.88 + 0.24 * jit(i))
			place(stem, i, x, topY, z, 0, 0, 0.014, hh, 0.014)
			const r0 = jit(i + 7) * Math.PI * 2
			for (let j = 0; j < per; j++) {
				const t = (j + 0.5) / per
				// 아래 잎이 길고 위로 갈수록 짧게, 137.5° 씩 돌아가며
				const len = pw * 0.8 * (1.15 - t * 0.6)
				place(
					leaf,
					li++,
					x,
					topY + hh * (0.15 + t * 0.85),
					z,
					r0 + j * 2.4,
					-0.35 + t * 0.3,
					len,
					len,
					len
				)
			}
			if (shape === 'tall') strings.push(V(x, topY + hh, z), V(x, wireY, z))
		})
		stem.count = spots.length
		leaf.count = li
		g.add(stem, leaf)
		if (shape === 'tall') {
			lines(strings, faint)
			const wires: THREE.Vector3[] = []
			for (const z of rowsZ)
				for (let ln = 0; ln < s.lines; ln++) {
					const dz = (ln - (s.lines - 1) / 2) * s.lineGap
					wires.push(V(x0, wireY, z + dz), V(x1, wireY, z + dz))
				}
			lines(wires, faint)
		}
	} else if (shape === 'blade') {
		// 마늘·양파·쪽파: 곧게 선 가는 잎 넷
		const per = 4
		const leaf = new THREE.InstancedMesh(leafGeo(), leafMat, spots.length * per)
		let li = 0
		spots.forEach(([x, z], i) => {
			const r0 = jit(i) * Math.PI * 2
			const len = ph * (0.85 + 0.3 * jit(i + 3))
			for (let j = 0; j < per; j++)
				place(leaf, li++, x, topY, z, r0 + j * 1.7, 1.15 + 0.12 * j, len, len * 0.5, len * 0.12)
		})
		leaf.count = li
		g.add(leaf)
	} else if (shape === 'low') {
		// 낮은 포기 (딸기·상추): 잎 다섯 장이 둥글게 퍼진 모양
		const per = 5
		const leaf = new THREE.InstancedMesh(leafGeo(), leafMat, spots.length * per)
		let li = 0
		spots.forEach(([x, z], i) => {
			const r0 = jit(i) * Math.PI * 2
			const len = pw * 0.55 * (0.85 + 0.3 * jit(i + 3))
			for (let j = 0; j < per; j++)
				place(
					leaf,
					li++,
					x,
					topY + 0.02,
					z,
					r0 + (j * Math.PI * 2) / per,
					0.45,
					len,
					Math.max(len, ph),
					len
				)
		})
		leaf.count = li
		g.add(leaf)
	} else if (shape === 'tree') {
		const trunk = new THREE.InstancedMesh(
			new THREE.CylinderGeometry(0.5, 0.6, 1, 6).translate(0, 0.5, 0),
			stemMat,
			spots.length
		)
		const crown = new THREE.InstancedMesh(
			new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0),
			leafMat,
			spots.length
		)
		spots.forEach(([x, z], i) => {
			const hh = ph * (0.9 + 0.15 * jit(i))
			place(trunk, i, x, 0, z, 0, 0, 0.14, hh * 0.45, 0.14)
			place(crown, i, x, hh * 0.3, z, jit(i) * 6, 0, pw, hh * 0.72, pw)
		})
		trunk.count = crown.count = spots.length
		g.add(trunk, crown)
	} else {
		// 밭 포기 덩이 (콩·고추·블루베리 등)
		const m = new THREE.InstancedMesh(
			new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0),
			leafMat,
			spots.length
		)
		spots.forEach(([x, z], i) => {
			const k = 0.85 + 0.3 * jit(i)
			place(m, i, x, topY, z, jit(i) * 6, 0, pw * k, ph * k, pw * k)
		})
		m.count = spots.length
		g.add(m)
	}

	// ── 시설 장비 (모양·자리는 그림이고 숫자는 적지 않는다) ──────────
	const darkMat = mat(C.dark ? C.ink.clone().lerp(C.bg, 0.55) : C.ink.clone().lerp(C.bg, 0.3))
	const clearMat = mat(C.model, { transparent: true, opacity: 0.6, depthWrite: false })
	const ET = 0.15
	const tagAt: Partial<Record<EquipId, THREE.Vector3>> = {}
	/** 장비 이름표 (그 장비를 처음 그린 자리에 하나) */
	const name = (id: EquipId, x: number, y: number, z: number) => {
		if (tagAt[id]) return
		const t = label(EQUIP_INFO[id].name[s.en ? 'en' : 'ko'], ET, true)
		t.position.set(x, y, z)
		t.userData.tag = 'equip'
		t.userData.equip = id
		g.add(t)
		tagAt[id] = V(x, y, z)
	}
	/** 상자 (w 길이 방향 x, h 높이, d 폭 방향 z) */
	const box = (
		id: EquipId,
		w: number,
		h: number,
		d: number,
		x: number,
		y: number,
		z: number,
		m: THREE.Material = darkMat
	) => {
		const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
		o.position.set(x, y, z)
		return part(id, o)
	}
	/** 관 (axis 방향으로 len) */
	const tube = (
		id: EquipId,
		r: number,
		len: number,
		x: number,
		y: number,
		z: number,
		axis: 'x' | 'y' | 'z',
		m: THREE.Material = darkMat
	) => {
		const geo = new THREE.CylinderGeometry(r, r, len, 10)
		if (axis === 'x') geo.rotateZ(Math.PI / 2)
		else if (axis === 'z') geo.rotateX(Math.PI / 2)
		const o = new THREE.Mesh(geo, m)
		o.position.set(x, y, z)
		return part(id, o)
	}
	const ex = -L / 2
	const aisleOf = (i: number) =>
		rowsZ.length >= 2 ? (rowsZ[i] + rowsZ[i + 1]) / 2 : rowsZ[0] + s.pitch / 2
	const midZ = aisleOf(mid)
	const gx = x0 + Math.min(10, runL / 2)

	if (s.kind === 'house') {
		const h = s.h
		const sh = Math.min(EQUIP.shoulder, h * 0.5)
		// 측창 개폐기: 감는 축 끝 모터와 받침 파이프 (양옆)
		for (const z of [-W / 2 + 0.12, W / 2 - 0.12]) {
			box('vent', 0.24, 0.26, 0.16, ex + 2.5, sh, z)
			tube('vent', 0.016, sh - 0.13, ex + 2.5, (sh - 0.13) / 2, z, 'y', whiteMat)
		}
		name('vent', ex + 2.5, sh + 0.42, -W / 2 + 0.4)
		// 차광망: 지붕 위 윗부분을 덮는 망
		const net = new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1, true, Math.PI * 0.18, Math.PI * 0.64)
		net.rotateZ(Math.PI / 2)
		net.scale(L, 2 * (h - sh) * 1.03, W * 1.03)
		net.translate(0, sh, 0)
		part(
			'shade',
			new THREE.Mesh(
				net,
				mat(C.ink, {
					transparent: true,
					opacity: C.dark ? 0.35 : 0.22,
					side: THREE.DoubleSide,
					depthWrite: false
				})
			)
		).renderOrder = 3
		name('shade', ex + 7, h - 0.35, 0.9)
		// 관수: 입구 오른쪽 여과기 → 주관(폭 방향) → 줄마다 점적 호스
		const fz = W / 2 - 0.45
		tube('water', 0.03, 1.0, ex + 0.5, 0.5, fz, 'y')
		tube('water', 0.085, 0.36, ex + 0.5, 0.78, fz, 'y', whiteMat)
		tube('water', 0.03, x0 - 0.35 - (ex + 0.5), (ex + 0.5 + x0 - 0.35) / 2, 0.04, fz, 'x')
		tube('water', 0.03, W - 0.8, x0 - 0.35, 0.04, 0, 'z')
		name('water', ex + 0.5, 1.3, fz)
		// 순환팬: 마루 밑에 길이 방향으로
		for (let x = ex + 8; x < L / 2 - 2; x += 14) {
			tube('fan', 0.22, 0.32, x, h - 0.6, 0, 'x')
			lines([V(x, h - 0.38, 0), V(x, h, 0)], faint)
			name('fan', x, h - 1.05, 0)
		}
		// 보온커튼: 어깨 위 양옆에 말아 둔 커튼
		for (const z of [-W / 2 + 0.22, W / 2 - 0.22])
			tube('curtain', 0.07, L - 0.4, 0, sh + 0.3, z, 'x', whiteMat)
		name('curtain', ex + 5, sh + 0.62, -W / 2 + 0.55)
		// 온풍난방기: 입구 왼쪽 구석, 위로 올린 비닐 덕트가 안쪽 끝까지
		const hz = -W / 2 + 0.55
		box('heater', 0.9, 1.1, 0.62, ex + 0.75, 0.55, hz)
		tube('heater', 0.15, 0.9, ex + 0.75, 1.55, hz, 'y', clearMat)
		const dl = L / 2 - 1 - (ex + 0.75)
		tube('heater', 0.15, dl, ex + 0.75 + dl / 2, 2.0, hz, 'x', clearMat)
		name('heater', ex + 0.75, 1.4, hz + 0.1)
		// 환경 센서: 가운데쯤 작물 높이, 위에서 매단다
		const sy = Math.min(h - 0.7, Math.max(1.2, topY + ph + 0.25))
		box('sensor', 0.18, 0.28, 0.18, gx, sy, rowsZ[mid], whiteMat)
		lines([V(gx, sy + 0.14, rowsZ[mid]), V(gx, h - 0.1, rowsZ[mid])], faint)
		name('sensor', gx, sy + 0.42, rowsZ[mid])
		// 환경 제어기: 입구 벽, 문 오른쪽
		box('panel', 0.12, 0.7, 0.5, ex + 0.08, 1.4, 1.55)
		name('panel', ex + 0.3, 1.98, 1.55)
	} else if (s.kind === 'smart') {
		const wall = s.h - EQUIP.rise
		const bay = 8
		const nb = Math.max(1, Math.round(W / bay))
		const bayZ = Array.from({ length: nb }, (_, b) => -W / 2 + bay * (b + 0.5))
		const nearBay = bayZ.reduce((a, b) => (Math.abs(b - midZ) < Math.abs(a - midZ) ? b : a))
		// 천창: 마루에 경첩을 단 유리판을 4m 칸마다 엇갈려 들어 올린 모습
		const vq: number[] = []
		const ve: THREE.Vector3[] = []
		const open = (25 * Math.PI) / 180
		let vi = 0
		for (let b = 0; b < nb * 2; b++) {
			const za = -W / 2 + (bay / 2) * b
			const zm = za + bay / 4
			for (let x = ex; x + EQUIP.post <= L / 2 + 1e-6; x += EQUIP.post) {
				const left = (vi++ + b) % 2 === 0
				const zs = left ? za : za + bay / 2
				const a = Math.atan2(wall - s.h, zs - zm) + (left ? -open : open)
				const dz = Math.cos(a) * 1.1
				const dy = Math.sin(a) * 1.1
				const xa = x + 0.3
				const xb = x + EQUIP.post - 0.3
				vq.push(
					xa,
					s.h,
					zm,
					xb,
					s.h,
					zm,
					xb,
					s.h + dy,
					zm + dz,
					xa,
					s.h,
					zm,
					xb,
					s.h + dy,
					zm + dz,
					xa,
					s.h + dy,
					zm + dz
				)
				ve.push(
					V(xa, s.h + dy, zm + dz),
					V(xb, s.h + dy, zm + dz),
					V(xa, s.h, zm),
					V(xa, s.h + dy, zm + dz),
					V(xb, s.h, zm),
					V(xb, s.h + dy, zm + dz)
				)
			}
		}
		const vg = new THREE.BufferGeometry()
		vg.setAttribute('position', new THREE.Float32BufferAttribute(vq, 3))
		vg.computeVertexNormals()
		part(
			'roofvent',
			new THREE.Mesh(
				vg,
				mat(C.glass, { transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
			)
		).renderOrder = 3
		lines(ve)
		name('roofvent', ex + 6, s.h - 0.35, nearBay - bay / 4)
		// 보온·차광 스크린: 처마 밑에 수평으로, 안쪽 절반만 펼친 모습
		const sy = wall - 0.2
		part(
			'screen',
			new THREE.Mesh(
				new THREE.PlaneGeometry(L / 2, W).rotateX(Math.PI / 2),
				mat(C.model, {
					transparent: true,
					opacity: 0.55,
					side: THREE.DoubleSide,
					depthWrite: false
				})
			)
		).position.set(L / 4, sy, 0)
		const sw: THREE.Vector3[] = []
		for (let z = -W / 2; z <= W / 2 + 1e-6; z += 2) sw.push(V(ex, sy, z), V(0, sy, z))
		lines(sw, faint)
		tube('screen', 0.03, W, 0, sy, 0, 'z', whiteMat)
		name('screen', 1.2, sy - 0.3, nearBay)
		// 온수 난방관 겸 레일: 줄 사이 통로마다 두 줄, 입구 쪽 온수관에서 나뉜다
		const aisles: number[] = []
		for (let i = 0; i < rowsZ.length - 1; i++) aisles.push(aisleOf(i))
		const hx = x0 - 0.7
		const pipe = new THREE.InstancedMesh(
			new THREE.CylinderGeometry(EQUIP.railR, EQUIP.railR, 1, 8).rotateZ(Math.PI / 2),
			whiteMat,
			aisles.length * 2
		)
		let k = 0
		for (const z of aisles)
			for (const dz of [-EQUIP.railGap / 2, EQUIP.railGap / 2]) {
				dm.position.set((hx + x1) / 2, EQUIP.railY, z + dz)
				dm.rotation.set(0, 0, 0)
				dm.scale.set(x1 - hx, 1, 1)
				dm.updateMatrix()
				pipe.setMatrixAt(k++, dm.matrix)
			}
		if (aisles.length) {
			part('rail', pipe)
			name('rail', x0 + 1.4, 0.42, midZ + EQUIP.railGap / 2)
		}
		// 보일러 온수관: 밖 보일러에서 들어와 폭 방향으로 나눈다
		tube('boiler', 0.06, W - 0.6, hx, EQUIP.railY, 0, 'z')
		tube('boiler', 0.06, 0.8, hx, EQUIP.railY + 0.4, -W / 2 + 0.3, 'y')
		tube('boiler', 0.06, hx - ex, (ex + hx) / 2, EQUIP.railY + 0.8, -W / 2 + 0.3, 'x')
		name('boiler', hx, 0.62, midZ - 1.2)
		// 작업 대차: 옆 통로 레일 위
		if (aisles.length) {
			const tz = aisles[Math.min(mid + 1, aisles.length - 1)]
			const tx = x0 + 7
			const top = 1.3
			box('trolley', 1.0, 0.1, 0.5, tx, EQUIP.railY + 0.08, tz, whiteMat)
			box('trolley', 1.0, 0.05, 0.5, tx, top, tz, whiteMat)
			lines([
				V(tx - 0.45, EQUIP.railY + 0.13, tz),
				V(tx + 0.45, top - 0.03, tz),
				V(tx + 0.45, EQUIP.railY + 0.13, tz),
				V(tx - 0.45, top - 0.03, tz),
				V(tx - 0.5, top, tz - 0.3),
				V(tx - 0.5, top + 0.9, tz - 0.3),
				V(tx + 0.5, top, tz - 0.3),
				V(tx + 0.5, top + 0.9, tz - 0.3),
				V(tx - 0.5, top + 0.9, tz - 0.3),
				V(tx + 0.5, top + 0.9, tz - 0.3)
			])
			name('trolley', tx, top + 1.2, tz)
		}
		// 순환팬: 칸 가운데, 처마 밑
		for (const z of bayZ)
			for (let x = ex + 8; x < L / 2 - 2; x += 14) {
				tube('fan', 0.25, 0.36, x, wall - 0.75, z, 'x')
				lines([V(x, wall - 0.5, z), V(x, wall, z)], faint)
			}
		name('fan', ex + 8, wall - 1.25, nearBay)
		// 포그: 칸마다 두 줄, 노즐은 점으로
		const fogY = wall - 0.5
		const fogPts: THREE.Vector3[] = []
		const nozzle: [number, number][] = []
		for (const z of bayZ)
			for (const dz of [-2, 2]) {
				fogPts.push(V(ex + 0.5, fogY, z + dz), V(L / 2 - 0.5, fogY, z + dz))
				for (let x = ex + 1.5; x < L / 2 - 0.5; x += 2) nozzle.push([x, z + dz])
			}
		lines(fogPts, faint)
		const nz = new THREE.InstancedMesh(
			new THREE.SphereGeometry(0.035, 6, 4),
			darkMat,
			nozzle.length
		)
		nozzle.forEach(([x, z], i) => {
			dm.position.set(x, fogY - 0.03, z)
			dm.rotation.set(0, 0, 0)
			dm.scale.set(1, 1, 1)
			dm.updateMatrix()
			nz.setMatrixAt(i, dm.matrix)
		})
		part('fogger', nz)
		name('fogger', ex + 3.5, fogY - 0.3, nearBay + 2)
		// 양액기: 입구 왼쪽 구석, 제어 상자와 A·B 통
		const fx = ex + 1.1
		box('feed', 0.6, 1.4, 0.9, fx, 0.7, -W / 2 + 1.0)
		tube('feed', 0.3, 1.0, fx, 0.5, -W / 2 + 2.0, 'y', whiteMat)
		tube('feed', 0.3, 1.0, fx, 0.5, -W / 2 + 2.7, 'y', whiteMat)
		name('feed', fx, 1.75, -W / 2 + 1.8)
		// 이산화탄소 공급관: 재배 줄마다 작물 옆
		const cy =
			s.hydro === 'gutter' ? EQUIP.gutterY - 0.2 : s.hydro === 'bench' ? EQUIP.benchY - 0.2 : 0.12
		const co2 = new THREE.InstancedMesh(
			new THREE.CylinderGeometry(0.014, 0.014, 1, 6).rotateZ(Math.PI / 2),
			whiteMat,
			rowsZ.length
		)
		rowsZ.forEach((z, i) => {
			dm.position.set((x0 + x1) / 2, cy, z + 0.16)
			dm.rotation.set(0, 0, 0)
			dm.scale.set(runL, 1, 1)
			dm.updateMatrix()
			co2.setMatrixAt(i, dm.matrix)
		})
		part('co2', co2)
		name('co2', x0 + 0.6, cy + 0.3, rowsZ[Math.min(mid + 1, rowsZ.length - 1)] + 0.16)
		// 환경 센서: 가운데쯤 작물 높이 (측정 상자를 위에서 매단다)
		const ky = Math.min(wall - 1, Math.max(1.0, topY + ph * 0.6))
		box('sensor', 0.2, 0.3, 0.2, gx, ky, rowsZ[mid], whiteMat)
		lines([V(gx, ky + 0.15, rowsZ[mid]), V(gx, wall, rowsZ[mid])], faint)
		name('sensor', gx, ky + 0.45, rowsZ[mid])
		// 환경 제어기: 입구 벽
		box('panel', 0.12, 0.8, 0.6, ex + 0.08, 1.4, W / 2 - 1.5)
		name('panel', ex + 0.3, 2.0, W / 2 - 1.5)
	} else {
		// 밭: 머리 쪽 주관에서 줄마다 점적 호스, 구석에 관정 펌프
		const mx = x0 - 0.5
		tube('water', 0.035, W - 0.4, mx, 0.04, 0, 'z')
		const drip: THREE.Vector3[] = []
		const dy = s.look.shape === 'tree' ? 0.02 : topY + 0.01
		for (const z of rowsZ) drip.push(V(mx, dy, z), V(x1, dy, z))
		lines(drip, ink)
		name('water', mx, 0.65, midZ - 0.6)
		const pz = -W / 2 + 1
		box('pump', 0.5, 0.6, 0.5, mx - 1.0, 0.3, pz)
		tube('pump', 0.035, 1.0, mx - 0.5, 0.04, pz, 'x')
		name('pump', mx - 1.0, 1.0, pz)
	}
	for (const [id] of EQUIP_SET[s.kind]) {
		const at = tagAt[id]
		if (at) equip.push({ id, at, from: at })
	}

	// ── 치수 글씨 (입구 쪽) ──────────────────────────────
	const T = 0.19
	const tag = (text: string, x: number, y: number, z: number, size = T) => {
		const t = label(text, size, true)
		t.position.set(x, y, z)
		t.userData.tag = 'dim'
		g.add(t)
	}
	const xa = x0 + 2.2
	// 첫 두 줄 사이: 이랑(줄) 간격 선과 글씨
	if (rowsZ.length >= 2 && s.text.pitch) {
		const za = rowsZ[mid]
		const zb = rowsZ[mid + 1]
		const y = topY + 0.05
		lines([
			V(xa, y, za),
			V(xa, y, zb),
			V(xa - 0.12, y, za),
			V(xa + 0.12, y, za),
			V(xa - 0.12, y, zb),
			V(xa + 0.12, y, zb)
		])
		tag(s.text.pitch, xa, y + 0.32, (za + zb) / 2)
	}
	// 두둑 폭 · 고랑
	if (s.text.bed && rowsZ.length) {
		const z = rowsZ[Math.min(mid + 1, rowsZ.length - 1)]
		const bw = s.bed ?? 0
		const xb = xa + 3
		const y = topY + 0.04
		lines([V(xb, y, z - bw / 2), V(xb, y, z + bw / 2)])
		tag(s.text.bed, xb, y + 0.3, z)
		if (s.text.furrow && rowsZ.length >= 2) {
			const zf = z + s.pitch / 2
			lines([
				V(xb + 1.6, 0.03, zf - (s.pitch - bw) / 2),
				V(xb + 1.6, 0.03, zf + (s.pitch - bw) / 2)
			])
			tag(s.text.furrow, xb + 1.6, 0.36, zf)
		}
	}
	// 포기 사이: 첫 줄 앞쪽 포기 둘 사이
	if (s.text.step && spots.length > 1) {
		// 통로 오른쪽 줄의 앞쪽 포기
		const first = spots.findIndex(
			([, z]) => z >= (rowsZ[Math.min(mid + 1, rowsZ.length - 1)] ?? 0) - s.pitch / 2
		)
		// 눈에서 4m 쯤 앞 (너무 가까우면 글씨가 화면을 덮는다)
		const ahead = Math.max(0, first) + Math.round(4 / s.step)
		const [ax, az] = spots[ahead] ?? spots[0]
		const bx = ax + s.step
		const y = topY + 0.03
		lines([V(ax, y, az - 0.08), V(bx, y, az - 0.08)])
		tag(s.text.step, (ax + bx) / 2, topY + 0.45, az)
	}
	// 시설 크기: 입구 위
	if (s.kind !== 'field') {
		const yTop = s.kind === 'smart' ? s.h - EQUIP.rise : s.h
		tag(s.text.size, -L / 2 + 0.6, Math.min(yTop - 0.4, 2.6), 0, 0.26)
		if (s.text.height && s.kind === 'house') {
			const xh = -L / 2 + 6
			lines([V(xh, 0, 0), V(xh, s.h, 0)], faint)
			tag(s.text.height, xh, s.h * 0.55, 0)
		}
	}

	// ── 눈 자리: 입구 안쪽 통로(고랑)에서 안쪽을 본다 ──────────
	const aisleZ = rowsZ.length >= 2 ? (rowsZ[mid] + rowsZ[mid + 1]) / 2 : rowsZ[0] + s.pitch / 2
	const eyeZ = aisleZ
	const eye = V(-L / 2 + (s.kind === 'field' ? -2 : 0.6), s.kind === 'field' ? 1.7 : 1.6, eyeZ)
	const target = V(-L / 2 + Math.min(9, L * 0.45), 1.0, eyeZ * 0.6)
	// 목록에서 고른 장비는 통로에 서서 3.5m 쯤 떨어져 본다 (입구 쪽 장비는 안쪽에서 돌아본다)
	for (const e of equip) {
		const lo = -L / 2 + 0.6
		const hi = L / 2 - 0.6
		let fx = e.at.x + 3.5
		if (fx > hi) fx = e.at.x - 3.5
		const back = e.at.y > 2.4 ? 1.5 : 0
		e.from = V(Math.min(hi, Math.max(lo, fx + (fx > e.at.x ? back : -back))), 1.6, eyeZ)
	}
	return {
		group: g,
		eye,
		target,
		reach: Math.min(18, Math.max(6, L * 0.5)),
		far: Math.max(L, W) * 1.4,
		equip,
		pick
	}
}
