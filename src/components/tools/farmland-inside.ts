/**
 * 안에서 보기: 비닐하우스·유리온실 안, 노지 밭 한가운데를 사람 눈높이로 본다.
 * 바깥 3D(farmland-3d.ts)와 같은 간격 자료(CropSpacing)로 포기 하나하나를 실제 간격에 심는다 (솎지 않는다).
 * 좌표: 길이(통로) 방향 x, 폭 방향 z, 높이 y. 바닥 가운데가 원점.
 */
import * as THREE from 'three'

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
const PARTS = 9000

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
	const x0 = -L / 2 + (s.kind === 'field' ? 0.4 : 1)
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
		// 레일 파이프: 줄 사이 통로마다 두 줄
		if (s.kind === 'smart') {
			const aisles: number[] = []
			for (let i = 0; i < rowsZ.length - 1; i++) aisles.push((rowsZ[i] + rowsZ[i + 1]) / 2)
			const pipe = new THREE.InstancedMesh(
				new THREE.CylinderGeometry(EQUIP.railR, EQUIP.railR, 1, 8).rotateZ(Math.PI / 2),
				mat(C.model),
				aisles.length * 2
			)
			let k = 0
			for (const z of aisles)
				for (const dz of [-EQUIP.railGap / 2, EQUIP.railGap / 2]) {
					dm.position.set((x0 + x1) / 2, EQUIP.railY, z + dz)
					dm.scale.set(runL, 1, 1)
					dm.updateMatrix()
					pipe.setMatrixAt(k++, dm.matrix)
				}
			g.add(pipe)
		}
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

	// ── 치수 글씨 (입구 쪽) ──────────────────────────────
	const T = 0.19
	const tag = (text: string, x: number, y: number, z: number, size = T) => {
		const t = label(text, size, true)
		t.position.set(x, y, z)
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
	return {
		group: g,
		eye,
		target,
		reach: Math.min(18, Math.max(6, L * 0.5)),
		far: Math.max(L, W) * 1.4
	}
}
