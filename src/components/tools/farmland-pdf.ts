/**
 * 3단계: 배치 계획도 PDF (참고용). /tools/farmland-crop-finder/ 의 "PDF로 받기" 를 누를 때만 불러온다.
 *
 * 쪽마다 A4 캔버스에 글·선을 그려 무손실(Flate) 그림으로 넣고, 표지의 3D 그림만 JPEG 로 따로 얹는다.
 * 글꼴을 따로 받지 않고 기기 글꼴로 그리므로 한글이 깨지지 않는다 (대신 PDF 안 글자는 고를 수 없다).
 * 배치도(2쪽)는 화면 캡처가 아니라 배치 좌표(m)로 직접 그린다.
 * 이름은 "배치 계획도 (참고용)". 설계도라고 부르지 않는다.
 */
import { KINDS, type P, type PieceKind, type PlanExport, type Ring } from '@/data/farmland-layout'
import { mergedSides } from './farmland-3d'

export type PdfInput = {
	isEn: boolean
	sample: boolean
	address: string
	pnu: string | null
	jibun: string | null
	jimok: string | null
	areaM2: number | null
	areaEstimated: boolean
	/** 긴 변 방향으로 잰 가로 × 세로 m */
	size: [number, number]
	zoning: string | null
	use: string | null
	zone: string
	/** 긴 변 방향 (라디안). 배치도를 긴 변이 눕도록 돌린다 */
	theta: number
	plan: PlanExport
	/** 동 사이 간격 m */
	houseGap: number
	/** 심는 간격 한 줄 (화면과 같은 글) */
	spacing: string | null
	/** 나눠 짓기: 남은 밭에 함께 심는 노지 작물 */
	mix: { name: string; area: number; yearly: number | null; spacing: string | null } | null
	/** 표지 작물 꼬리표 (화면과 같은 말) */
	cropLabel: string
	/** 화면의 설치비·땅 조건 표를 그대로 */
	groups: { title: string; rows: [string, string][] }[]
	/** 이 땅에 가장 효율적인 작물 (10a당 소득 1위) */
	crop: {
		name: string
		season: string
		greenhouse: boolean
		income: { won: number; year: number } | null
		/** 심는 넓이 ㎡ (하우스 작물은 하우스 안, 아니면 시설을 뺀 밭) */
		grow: number
		alts: { name: string; income: number | null }[]
	} | null
	/** 화면에 나온 안내 (소득 자료, 길 쪽 어림 등) */
	notes: string[]
	shareUrl: string
	/** 3D 그림 (JPEG data URL) */
	snapshot: string | null
	snapW: number
	snapH: number
}

// A4 (pt)
const PW = 595.28
const PH = 841.89
const M = 48
const SCALE = 3

const INK = '#1d1d1b'
const MUTED = 'rgba(29,29,27,0.6)'
const LINE = 'rgba(29,29,27,0.16)'
const FILL = '#f1efec'
const SOLID = '#d6d2cd'
const ROAD = '#c4bfb9'

export async function buildPdf(d: PdfInput): Promise<Blob> {
	await document.fonts?.ready
	const family =
		getComputedStyle(document.body).fontFamily ||
		"-apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
	const L = (ko: string, en: string) => (d.isEn ? en : ko)
	const loc = d.isEn ? 'en-US' : 'ko-KR'
	const num = (v: number) => Math.round(v).toLocaleString(loc)
	const m1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString(loc)
	const py = (m2: number) => L(`${num(m2 / 3.3058)}평`, `${num(m2 / 3.3058)} py`)
	/** 만 원 단위 (EN 은 백만 원) */
	const money = (won: number) => {
		if (d.isEn) return `₩${(won / 1e6).toFixed(1)}M`
		const man = Math.round(won / 1e4)
		if (man < 10000) return `${num(man)}만 원`
		const eok = Math.floor(man / 10000)
		const rest = man % 10000
		return rest ? `${eok}억 ${num(rest)}만 원` : `${eok}억 원`
	}
	const crop = d.crop
	const smart = d.plan.pieces.find((p) => p.kind === 'smart') ?? null
	const singles = d.plan.pieces.filter((p) => p.kind === 'single').length
	const yearly = crop?.income && crop.grow > 0 ? (crop.income.won * crop.grow) / 1000 : null
	const now = new Date()
	const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
	const t = d.plan.totals
	const kindName = (k: PieceKind) => (d.isEn ? KINDS[k].en : KINDS[k].ko)
	const pieceName = (p: PlanExport['pieces'][number]) =>
		KINDS[p.kind].n && p.kind !== 'smart'
			? `${kindName(p.kind)} ${L(`${p.bays}연동`, `× ${p.bays}`)}`
			: kindName(p.kind)

	// ── 쪽 캔버스 ───────────────────────────────────
	type Page = {
		ctx: CanvasRenderingContext2D
		canvas: HTMLCanvasElement
		links: Link[]
		images: Img[]
	}
	type Link = { x: number; y: number; w: number; h: number; url: string }
	type Img = {
		x: number
		y: number
		w: number
		h: number
		jpeg: Uint8Array
		pw: number
		ph: number
	}
	const pages: Page[] = []

	function newPage(): Page {
		const canvas = document.createElement('canvas')
		canvas.width = Math.round(PW * SCALE)
		canvas.height = Math.round(PH * SCALE)
		const ctx = canvas.getContext('2d')!
		ctx.fillStyle = '#fff'
		ctx.fillRect(0, 0, canvas.width, canvas.height)
		ctx.scale(SCALE, SCALE)
		ctx.textBaseline = 'alphabetic'
		const pg = { ctx, canvas, links: [], images: [] }
		pages.push(pg)
		return pg
	}

	const font = (ctx: CanvasRenderingContext2D, size: number, weight = 400) =>
		(ctx.font = `${weight} ${size}px ${family}`)

	function text(
		ctx: CanvasRenderingContext2D,
		s: string,
		x: number,
		y: number,
		o: { size?: number; weight?: number; color?: string; align?: CanvasTextAlign } = {}
	) {
		font(ctx, o.size ?? 9, o.weight ?? 400)
		ctx.fillStyle = o.color ?? INK
		ctx.textAlign = o.align ?? 'left'
		ctx.fillText(s, x, y)
		return ctx.measureText(s).width
	}

	/** 글자 단위 줄바꿈 (띄어쓰기에서 먼저 끊는다) */
	function wrap(
		ctx: CanvasRenderingContext2D,
		s: string,
		width: number,
		size: number,
		weight = 400
	) {
		font(ctx, size, weight)
		const out: string[] = []
		for (const para of s.split('\n')) {
			let line = ''
			for (const word of para.split(/(\s+)/)) {
				const next = line + word
				if (ctx.measureText(next).width <= width) {
					line = next
					continue
				}
				if (line.trim()) out.push(line.trimEnd())
				line = word.trimStart()
				// 한 낱말이 줄보다 길면 글자로 자른다
				while (ctx.measureText(line).width > width) {
					let k = line.length
					while (k > 1 && ctx.measureText(line.slice(0, k)).width > width) k--
					out.push(line.slice(0, k))
					line = line.slice(k)
				}
			}
			if (line.trim()) out.push(line.trimEnd())
		}
		return out
	}

	function para(
		ctx: CanvasRenderingContext2D,
		s: string,
		x: number,
		y: number,
		width: number,
		o: { size?: number; weight?: number; color?: string; lead?: number } = {}
	) {
		const size = o.size ?? 9
		const lead = o.lead ?? size * 1.55
		const lines = wrap(ctx, s, width, size, o.weight)
		lines.forEach((l, i) =>
			text(ctx, l, x, y + i * lead, { size, weight: o.weight, color: o.color })
		)
		return y + lines.length * lead
	}

	function rule(ctx: CanvasRenderingContext2D, y: number, w = 0.5, color = INK) {
		ctx.strokeStyle = color
		ctx.lineWidth = w
		ctx.setLineDash([])
		ctx.beginPath()
		ctx.moveTo(M, y)
		ctx.lineTo(PW - M, y)
		ctx.stroke()
	}

	/** 쪽 번호는 쪽 수가 정해진 뒤 끝에 적는다 (시설이 많으면 표가 다음 쪽으로 넘어간다) */
	function head(pg: Page, title: string, sub?: string) {
		const { ctx } = pg
		text(ctx, 'IMUN.FARM', M, M, { size: 8, weight: 800 })
		text(ctx, L('배치 계획도 (참고용)', 'Layout plan (for reference)'), M + 62, M, {
			size: 8,
			color: MUTED
		})
		rule(ctx, M + 8)
		text(ctx, title, M, M + 40, { size: 20, weight: 800 })
		if (sub) text(ctx, sub, M, M + 58, { size: 9, color: MUTED })
	}

	function foot(pg: Page) {
		const { ctx } = pg
		const y = PH - M + 16
		rule(ctx, y - 14, 0.5, LINE)
		text(ctx, 'imun.farm/tools/farmland-crop-finder/', M, y, { size: 7.5, weight: 600 })
		const label = L('이 배치를 다시 열기 →', 'Reopen this layout →')
		const w = text(ctx, label, PW - M, y, { size: 7.5, color: MUTED, align: 'right' })
		pg.links.push({ x: PW - M - w, y: y - 9, w, h: 12, url: d.shareUrl })
		text(
			ctx,
			L(
				'참고용이며 측량·설계·인허가를 대신하지 않습니다.',
				'For reference only. Not a survey, design or permit document.'
			),
			M,
			y + 12,
			{ size: 7, color: MUTED }
		)
	}

	// ── 1쪽: 표지 ─────────────────────────────────────
	{
		const pg = newPage()
		const { ctx } = pg
		head(pg, L('배치 계획도 (참고용)', 'Layout plan (for reference)'))
		let y = M + 78
		y = para(ctx, d.address + (d.sample ? L(' (예시)', ' (example)') : ''), M, y, PW - M * 2, {
			size: 14,
			weight: 700,
			lead: 19
		})
		y += 8
		const area = d.areaM2
			? `${d.areaEstimated ? L('약 ', '≈ ') : ''}${py(d.areaM2)} (${num(d.areaM2)}㎡)`
			: '–'
		const facts: [string, string][] = [
			[L('필지번호(PNU)', 'Parcel no. (PNU)'), d.pnu ?? '–'],
			[L('지목', 'Land category'), d.jimok ?? '–'],
			[L('면적', 'Area'), area],
			[L('가로 × 세로', 'Length × width'), `${m1(d.size[0])} × ${m1(d.size[1])}m`],
			[L('용도지역', 'Zoning'), d.zoning ?? '–'],
			[L('실제 이용', 'Actual use'), d.use ?? '–']
		]
		const colW = (PW - M * 2) / 3
		facts.forEach(([k, v], i) => {
			const x = M + (i % 3) * colW
			const yy = y + Math.floor(i / 3) * 40
			if (i % 3 === 0) rule(ctx, yy, 0.5, LINE)
			text(ctx, k, x, yy + 14, { size: 7.5, color: MUTED })
			text(ctx, v, x, yy + 29, { size: 10.5, weight: 600 })
		})
		y += 86

		// 3D 그림 (JPEG 를 따로 얹는다)
		const iw = PW - M * 2
		const ih = Math.round((iw * d.snapH) / d.snapW)
		if (d.snapshot) {
			const bin = atob(d.snapshot.split(',')[1])
			const jpeg = new Uint8Array(bin.length)
			for (let i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i)
			pg.images.push({ x: M, y, w: iw, h: ih, jpeg, pw: d.snapW, ph: d.snapH })
		} else {
			ctx.fillStyle = FILL
			ctx.fillRect(M, y, iw, ih)
		}
		ctx.strokeStyle = LINE
		ctx.lineWidth = 0.5
		ctx.strokeRect(M, y, iw, ih)
		y += ih + 22

		// 가장 효율적인 작물과 이 배치의 숫자
		text(ctx, d.cropLabel, M, y, {
			size: 7.5,
			color: MUTED
		})
		y += 26
		text(ctx, crop?.name ?? '–', M, y, { size: 24, weight: 800 })
		if (crop) text(ctx, crop.season, PW - M, y, { size: 8.5, color: MUTED, align: 'right' })
		y += 14
		rule(ctx, y, 0.8)
		const cells: [string, string, string][] = [
			[
				L('10a당 소득', 'Income per 10a'),
				crop?.income ? money(crop.income.won) : '–',
				crop?.income ? L(`농촌진흥청 ${crop.income.year}`, `RDA ${crop.income.year}`) : ''
			],
			[
				L('이 배치면 한 해', 'This layout, per year'),
				yearly ? L(`약 ${money(yearly)}`, `≈ ${money(yearly)}`) : '–',
				L('새 시설비는 따로', 'new build cost separate')
			],
			smart
				? [
						L('벤로형 유리온실', 'Venlo glasshouse'),
						L(`${smart.bays}칸`, `${smart.bays} bays`),
						`${m1(smart.width)} × ${m1(smart.length)}m`
					]
				: singles
					? [
							L('단동 하우스', 'Tunnel houses'),
							L(`${singles}동`, `${singles}`),
							L(`폭 7m · 동 사이 ${m1(d.houseGap)}m`, `7 m wide · ${m1(d.houseGap)} m apart`)
						]
					: [L('시설', 'Buildings'), py(t.facility), `${num(t.facility)}㎡`],
			[
				crop?.greenhouse ? L('재배 면적', 'Under cover') : L('밭 면적', 'Open field'),
				crop ? py(crop.grow) : py(t.field),
				`${num(crop ? crop.grow : t.field)}㎡`
			]
		]
		const cw = (PW - M * 2) / cells.length
		cells.forEach(([k, v, s], i) => {
			const x = M + i * cw + (i ? 10 : 0)
			if (i) {
				ctx.strokeStyle = LINE
				ctx.lineWidth = 0.5
				ctx.beginPath()
				ctx.moveTo(M + i * cw, y + 6)
				ctx.lineTo(M + i * cw, y + 60)
				ctx.stroke()
			}
			text(ctx, k, x, y + 18, { size: 7.5, color: MUTED })
			text(ctx, v, x, y + 40, { size: 15, weight: 800 })
			if (s) text(ctx, s, x, y + 54, { size: 7, color: MUTED })
		})
		foot(pg)
	}

	// ── 2쪽: 배치도 ───────────────────────────────────
	const numbered = d.plan.pieces.map((p, i) => ({ p, no: i + 1 }))
	{
		const pg = newPage()
		const { ctx } = pg
		const box = { x: M, y: M + 78, w: PW - M * 2, h: 540 }

		// 긴 변이 눕게 돌리되, 북쪽이 아래로 가지 않게
		const ring = d.plan.parcel.ring
		const fit = (rot: number) => {
			const c = Math.cos(rot)
			const s = Math.sin(rot)
			const pts = ring.map(([x, y]) => [x * c - y * s, x * s + y * c])
			const xs = pts.map((p) => p[0])
			const ys = pts.map((p) => p[1])
			const w = Math.max(...xs) - Math.min(...xs)
			const h = Math.max(...ys) - Math.min(...ys)
			return {
				rot,
				k: Math.min((box.w - 40) / w, (box.h - 70) / h),
				cx: (Math.max(...xs) + Math.min(...xs)) / 2,
				cy: (Math.max(...ys) + Math.min(...ys)) / 2
			}
		}
		const norm = (a: number) => {
			let r = a
			while (r > Math.PI) r -= Math.PI * 2
			while (r <= -Math.PI) r += Math.PI * 2
			if (r > Math.PI / 2) r -= Math.PI
			if (r < -Math.PI / 2) r += Math.PI
			return r
		}
		const cands = [norm(-d.theta), norm(-d.theta + Math.PI / 2), 0].map(fit)
		const best = cands.reduce((a, b) => (b.k > a.k * 1.04 ? b : a))
		const { rot, k } = best
		const cos = Math.cos(rot)
		const sin = Math.sin(rot)
		const ox = box.x + box.w / 2
		const oy = box.y + 18 + (box.h - 70) / 2
		const tx = ([x, y]: P): [number, number] => {
			const rx = x * cos - y * sin - best.cx
			const ry = x * sin + y * cos - best.cy
			return [ox + rx * k, oy - ry * k]
		}
		const path = (pts: P[], close = true) => {
			ctx.beginPath()
			pts.forEach((p, i) => {
				const [x, y] = tx(p)
				if (i) ctx.lineTo(x, y)
				else ctx.moveTo(x, y)
			})
			if (close) ctx.closePath()
		}
		const scaleN = 1000 / (k * 0.3528)
		const nice = (v: number) => {
			const e = 10 ** Math.floor(Math.log10(v))
			return Math.round(v / e) * e
		}
		head(
			pg,
			L('배치도', 'Site plan'),
			L(
				`위에서 본 모습 · A4로 인쇄하면 약 1:${num(nice(scaleN))}`,
				`Top view · about 1:${num(nice(scaleN))} when printed on A4`
			)
		)

		// 길에 닿은 변 (밖으로 굵게)
		const tags = d.plan.parcel.edges
		const n = ring.length
		ctx.lineCap = 'butt'
		for (let i = 0; i < n; i++) {
			if (tags[i] !== 'road') continue
			const a = tx(ring[i])
			const b = tx(ring[(i + 1) % n])
			// 바깥쪽: 필지 무게중심 반대편
			const mx = (a[0] + b[0]) / 2
			const my = (a[1] + b[1]) / 2
			const [cx, cy] = tx([0, 0])
			let nx = -(b[1] - a[1])
			let ny = b[0] - a[0]
			const l = Math.hypot(nx, ny) || 1
			nx /= l
			ny /= l
			if (nx * (mx - cx) + ny * (my - cy) < 0) {
				nx = -nx
				ny = -ny
			}
			ctx.strokeStyle = ROAD
			ctx.lineWidth = 7
			ctx.setLineDash([])
			ctx.beginPath()
			ctx.moveTo(a[0] + nx * 5, a[1] + ny * 5)
			ctx.lineTo(b[0] + nx * 5, b[1] + ny * 5)
			ctx.stroke()
		}
		// 필지
		path(ring)
		ctx.fillStyle = '#fff'
		ctx.fill()

		// 진입로
		if (d.plan.entry) {
			const { from, to, width } = d.plan.entry
			const dx = to[0] - from[0]
			const dy = to[1] - from[1]
			const l = Math.hypot(dx, dy) || 1
			const px = (-dy / l) * (width / 2)
			const py2 = (dx / l) * (width / 2)
			path([
				[from[0] + px, from[1] + py2],
				[to[0] + px, to[1] + py2],
				[to[0] - px, to[1] - py2],
				[from[0] - px, from[1] - py2]
			])
			ctx.fillStyle = '#e7e4e0'
			ctx.fill()
		}

		// 시설
		for (const { p } of numbered) {
			const r = p.corners
			path(r)
			const kind = p.kind
			if (KINDS[kind].greenhouse) {
				ctx.fillStyle = FILL
				ctx.fill()
				ribs(p)
			} else if (kind === 'storage') {
				ctx.fillStyle = SOLID
				ctx.fill()
			} else if (kind === 'shed' || kind === 'compost') {
				ctx.fillStyle = '#fff'
				ctx.fill()
				hatch(r, kind === 'compost')
			}
			path(r)
			const bad = p.issues.length > 0
			ctx.strokeStyle = INK
			ctx.lineWidth = kind === 'yard' ? 0.6 : 0.8
			ctx.setLineDash(kind === 'yard' || bad ? [3, 2] : [])
			if (bad) ctx.lineWidth = 1.4
			ctx.stroke()
			ctx.setLineDash([])
		}

		// 필지 경계
		path(ring)
		ctx.strokeStyle = INK
		ctx.lineWidth = 1.4
		ctx.lineJoin = 'round'
		ctx.stroke()

		// 변 길이 (화면과 같이 거의 곧은 변은 하나로 묶는다)
		{
			const [cx, cy] = tx([0, 0])
			for (const [a0, b0] of mergedSides(ring)) {
				const len = Math.hypot(b0[0] - a0[0], b0[1] - a0[1])
				const a = tx(a0)
				const b = tx(b0)
				if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 24) continue
				const mx = (a[0] + b[0]) / 2
				const my = (a[1] + b[1]) / 2
				let nx = -(b[1] - a[1])
				let ny = b[0] - a[0]
				const l = Math.hypot(nx, ny) || 1
				nx /= l
				ny /= l
				if (nx * (mx - cx) + ny * (my - cy) < 0) {
					nx = -nx
					ny = -ny
				}
				halo(`${m1(len)}m`, mx + nx * 11, my + ny * 11 + 3, 7.5, 700, INK)
			}
		}

		// 도로 이름표: 가장 긴 길 변 바깥
		{
			let bi = -1
			let bl = 0
			for (let i = 0; i < n; i++) {
				if (tags[i] !== 'road') continue
				const a = tx(ring[i])
				const b = tx(ring[(i + 1) % n])
				const l = Math.hypot(b[0] - a[0], b[1] - a[1])
				if (l > bl) {
					bl = l
					bi = i
				}
			}
			if (bi >= 0) {
				const a = tx(ring[bi])
				const b = tx(ring[(bi + 1) % n])
				const [cx, cy] = tx([0, 0])
				const mx = (a[0] + b[0]) / 2
				const my = (a[1] + b[1]) / 2
				const l = Math.hypot(mx - cx, my - cy) || 1
				const lx = mx + ((mx - cx) / l) * 30
				const ly = my + ((my - cy) / l) * 30
				halo(
					d.plan.parcel.roadGuessed ? L('길 쪽(추정)', 'Road side (est.)') : L('도로', 'Road'),
					lx,
					ly + 3,
					7.5,
					600,
					MUTED
				)
			}
		}

		// 시설 이름표: 들어가면 이름·크기, 아니면 번호만
		for (const { p, no } of numbered) {
			const c = tx(p.center as P)
			const a = tx(p.corners[0])
			const b = tx(p.corners[1])
			const e = tx(p.corners[3])
			const lenPx = Math.hypot(b[0] - a[0], b[1] - a[1])
			const widPx = Math.hypot(e[0] - a[0], e[1] - a[1])
			const long = lenPx >= widPx
			let ang = long ? Math.atan2(b[1] - a[1], b[0] - a[0]) : Math.atan2(e[1] - a[1], e[0] - a[0])
			if (ang > Math.PI / 2) ang -= Math.PI
			if (ang < -Math.PI / 2) ang += Math.PI
			const label = `${pieceName(p)} ${m1(p.width)} × ${m1(p.length)}m`
			font(ctx, 6.5, 600)
			const tw = ctx.measureText(label).width + 16
			const room = Math.max(lenPx, widPx)
			const thick = Math.min(lenPx, widPx)
			ctx.save()
			ctx.translate(c[0], c[1])
			ctx.rotate(ang)
			if (tw <= room - 6 && thick >= 11) {
				badge(no, -tw / 2 + 5, 0)
				text(ctx, label, -tw / 2 + 12, 2.4, { size: 6.5, weight: 600 })
			} else badge(no, 0, 0)
			ctx.restore()
		}

		// 방위표: 북쪽 (0,1) 이 돌아간 방향으로
		{
			const x = box.x + box.w - 16
			const y = box.y + 34
			ctx.save()
			ctx.translate(x, y)
			ctx.rotate(-rot)
			ctx.fillStyle = INK
			ctx.beginPath()
			ctx.moveTo(0, -12)
			ctx.lineTo(5, 7)
			ctx.lineTo(0, 3)
			ctx.lineTo(-5, 7)
			ctx.closePath()
			ctx.fill()
			ctx.restore()
			text(ctx, 'N', x - Math.sin(rot) * 21, y - Math.cos(rot) * 21 + 3, {
				size: 8,
				weight: 800,
				align: 'center'
			})
		}

		// 범례
		{
			let x = M
			let y = box.y + box.h + 10
			rule(ctx, y - 4, 0.5, LINE)
			y += 12
			const present = new Set(d.plan.pieces.map((p) => p.kind))
			type Item = [string, (x: number, y: number) => void]
			const items: Item[] = [
				[
					L('필지 경계', 'Parcel boundary'),
					(x, y) => {
						ctx.strokeStyle = INK
						ctx.lineWidth = 1.4
						ctx.setLineDash([])
						ctx.beginPath()
						ctx.moveTo(x, y)
						ctx.lineTo(x + 18, y)
						ctx.stroke()
					}
				],
				[
					L('도로·길 쪽', 'Road side'),
					(x, y) => {
						ctx.strokeStyle = ROAD
						ctx.lineWidth = 5
						ctx.beginPath()
						ctx.moveTo(x, y)
						ctx.lineTo(x + 18, y)
						ctx.stroke()
					}
				],
				...(d.plan.entry
					? ([
							[
								L(`진입로 ${m1(d.plan.entry.width)}m`, `Access ${m1(d.plan.entry.width)}m`),
								(x: number, y: number) => {
									ctx.fillStyle = '#e7e4e0'
									ctx.fillRect(x, y - 4, 18, 8)
								}
							]
						] as Item[])
					: []),
				...((['single', 'multi', 'smart'] as PieceKind[]).some((k) => present.has(k))
					? ([
							[
								L('하우스·온실', 'Greenhouse'),
								(x: number, y: number) => {
									ctx.fillStyle = FILL
									ctx.fillRect(x, y - 4, 18, 8)
									ctx.strokeStyle = LINE
									ctx.lineWidth = 0.4
									for (let i = 3; i < 18; i += 3) {
										ctx.beginPath()
										ctx.moveTo(x + i, y - 4)
										ctx.lineTo(x + i, y + 4)
										ctx.stroke()
									}
									ctx.strokeStyle = INK
									ctx.lineWidth = 0.8
									ctx.strokeRect(x, y - 4, 18, 8)
								}
							]
						] as Item[])
					: []),
				...(present.has('storage')
					? ([
							[
								kindName('storage'),
								(x: number, y: number) => {
									ctx.fillStyle = SOLID
									ctx.fillRect(x, y - 4, 18, 8)
									ctx.strokeStyle = INK
									ctx.lineWidth = 0.8
									ctx.strokeRect(x, y - 4, 18, 8)
								}
							]
						] as Item[])
					: []),
				...(['shed', 'compost'] as PieceKind[])
					.filter((k) => present.has(k))
					.map(
						(k) =>
							[
								kindName(k),
								(x: number, y: number) => {
									ctx.save()
									ctx.beginPath()
									ctx.rect(x, y - 4, 18, 8)
									ctx.clip()
									ctx.strokeStyle = INK
									ctx.lineWidth = 0.4
									for (let i = -8; i < 26; i += 3) {
										ctx.beginPath()
										ctx.moveTo(x + i, y + 4)
										ctx.lineTo(x + i + 8, y - 4)
										ctx.stroke()
										if (k === 'compost') {
											ctx.beginPath()
											ctx.moveTo(x + i, y - 4)
											ctx.lineTo(x + i + 8, y + 4)
											ctx.stroke()
										}
									}
									ctx.restore()
									ctx.strokeStyle = INK
									ctx.lineWidth = 0.8
									ctx.strokeRect(x, y - 4, 18, 8)
								}
							] as Item
					),
				...(present.has('yard')
					? ([
							[
								kindName('yard'),
								(x: number, y: number) => {
									ctx.strokeStyle = INK
									ctx.lineWidth = 0.6
									ctx.setLineDash([3, 2])
									ctx.strokeRect(x, y - 4, 18, 8)
									ctx.setLineDash([])
								}
							]
						] as Item[])
					: [])
			]
			for (const [label, draw] of items) {
				font(ctx, 7.5)
				const w = 24 + ctx.measureText(label).width + 16
				if (x + w > PW - M) {
					x = M
					y += 16
				}
				draw(x, y - 3)
				text(ctx, label, x + 24, y, { size: 7.5 })
				x += w
			}
			y += 16
			if (numbered.some(({ p }) => p.issues.length))
				text(
					ctx,
					L(
						'굵은 점선 테두리: 땅 밖으로 나갔거나 다른 시설과 겹치거나 크기 한도를 넘은 시설',
						'Bold dashed outline: outside the plot, overlapping, or over the size limit'
					),
					M,
					y,
					{ size: 7.5, color: MUTED }
				)
		}
		foot(pg)

		function halo(
			s: string,
			x: number,
			y: number,
			size: number,
			weight: number,
			color: string,
			align: CanvasTextAlign = 'center'
		) {
			font(ctx, size, weight)
			ctx.textAlign = align
			ctx.lineWidth = 3
			ctx.strokeStyle = '#fff'
			ctx.lineJoin = 'round'
			ctx.strokeText(s, x, y)
			ctx.fillStyle = color
			ctx.fillText(s, x, y)
		}

		function badge(no: number, x: number, y: number) {
			ctx.fillStyle = '#fff'
			ctx.strokeStyle = INK
			ctx.lineWidth = 0.7
			ctx.beginPath()
			ctx.arc(x, y, 5.2, 0, Math.PI * 2)
			ctx.fill()
			ctx.stroke()
			text(ctx, String(no), x, y + 2.3, { size: 6, weight: 700, align: 'center' })
		}

		/** 하우스 뼈대: 폭 방향 가는 선 (약 2m 간격), 연동은 칸 경계 */
		function ribs(p: PlanExport['pieces'][number]) {
			const [a, b, , e] = p.corners
			const lx = (b[0] - a[0]) / p.length
			const ly = (b[1] - a[1]) / p.length
			const wx = (e[0] - a[0]) / p.width
			const wy = (e[1] - a[1]) / p.width
			ctx.save()
			path(p.corners)
			ctx.clip()
			ctx.strokeStyle = LINE
			ctx.lineWidth = 0.35
			const step = p.kind === 'smart' ? 4 : 2
			for (let s = step; s < p.length; s += step) {
				const s0 = tx([a[0] + lx * s, a[1] + ly * s])
				const s1 = tx([e[0] + lx * s, e[1] + ly * s])
				ctx.beginPath()
				ctx.moveTo(s0[0], s0[1])
				ctx.lineTo(s1[0], s1[1])
				ctx.stroke()
			}
			if (p.bays > 1) {
				ctx.strokeStyle = INK
				ctx.lineWidth = 0.4
				const bw = p.width / p.bays
				for (let i = 1; i < p.bays; i++) {
					const s0 = tx([a[0] + wx * bw * i, a[1] + wy * bw * i])
					const s1 = tx([b[0] + wx * bw * i, b[1] + wy * bw * i])
					ctx.beginPath()
					ctx.moveTo(s0[0], s0[1])
					ctx.lineTo(s1[0], s1[1])
					ctx.stroke()
				}
			}
			ctx.restore()
		}

		function hatch(r: Ring, cross: boolean) {
			const pts = r.map(tx)
			const xs = pts.map((p) => p[0])
			const ys = pts.map((p) => p[1])
			const x0 = Math.min(...xs)
			const x1 = Math.max(...xs)
			const y0 = Math.min(...ys)
			const y1 = Math.max(...ys)
			ctx.save()
			path(r)
			ctx.clip()
			ctx.strokeStyle = INK
			ctx.lineWidth = 0.35
			const span = x1 - x0 + (y1 - y0)
			for (let i = -span; i < span; i += 2.6) {
				ctx.beginPath()
				ctx.moveTo(x0 + i, y1)
				ctx.lineTo(x0 + i + (y1 - y0), y0)
				ctx.stroke()
				if (cross) {
					ctx.beginPath()
					ctx.moveTo(x0 + i, y0)
					ctx.lineTo(x0 + i + (y1 - y0), y1)
					ctx.stroke()
				}
			}
			ctx.restore()
		}
	}

	// ── 3쪽: 시설·면적표 ─────────────────────────────
	{
		const title = L('시설·면적표', 'Schedule')
		let pg = newPage()
		let ctx = pg.ctx
		head(pg, title)
		let y = M + 84
		const W = PW - M * 2
		/** 남은 자리가 h 보다 적으면 다음 쪽으로 */
		const room = (h: number) => {
			if (y + h <= PH - M - 12) return
			foot(pg)
			pg = newPage()
			ctx = pg.ctx
			head(pg, `${title} ${L('(이어서)', '(continued)')}`)
			y = M + 84
		}

		// 제목만 쪽 끝에 홀로 남지 않게 첫 줄 자리까지 본다
		const section = (title: string) => {
			room(80)
			text(ctx, title, M, y, { size: 10, weight: 800 })
			y += 8
			rule(ctx, y, 0.8)
			y += 4
		}

		// 시설 표
		section(L('시설', 'Facilities'))
		const cols = [
			{ k: L('번호', 'No.'), w: 30, align: 'left' as CanvasTextAlign },
			{ k: L('시설', 'Facility'), w: 150, align: 'left' as CanvasTextAlign },
			{ k: L('폭 × 길이', 'W × L'), w: 90, align: 'right' as CanvasTextAlign },
			{ k: L('높이', 'Height'), w: 50, align: 'right' as CanvasTextAlign },
			{ k: L('면적', 'Area'), w: 90, align: 'right' as CanvasTextAlign },
			{ k: L('확인', 'Check'), w: W - 410, align: 'right' as CanvasTextAlign }
		]
		const row = (cells: string[], o: { head?: boolean; bold?: boolean } = {}) => {
			room(18)
			let x = M
			y += 13.5
			cells.forEach((c, i) => {
				const col = cols[i]
				const ax = col.align === 'right' ? x + col.w : x
				text(ctx, c, ax, y, {
					size: o.head ? 7.5 : 8.5,
					weight: o.bold ? 700 : o.head ? 400 : 400,
					color: o.head ? MUTED : INK,
					align: col.align
				})
				x += col.w
			})
			y += 4.5
			rule(ctx, y, 0.5, LINE)
		}
		row(
			cols.map((c) => c.k),
			{ head: true }
		)
		const issueText = (p: PlanExport['pieces'][number]) =>
			p.issues
				.map((i) =>
					i === 'outside'
						? L('땅 밖', 'outside')
						: i === 'overlap'
							? L('겹침', 'overlap')
							: L(`${KINDS[p.kind].maxArea}㎡ 넘음`, `over ${KINDS[p.kind].maxArea} ㎡`)
				)
				.join(', ') || '–'
		if (!numbered.length)
			row(['–', L('놓은 시설이 없습니다', 'No facilities placed'), '', '', '', ''])
		for (const { p, no } of numbered)
			row([
				String(no),
				pieceName(p),
				`${m1(p.width)} × ${m1(p.length)}m`,
				p.height ? `${m1(p.height)}m` : '–',
				`${num(p.area)}㎡ (${py(p.area)})`,
				issueText(p)
			])
		row(
			[
				'',
				L(
					singles ? `합계 · 하우스 ${singles}동` : smart ? '합계 · 유리온실 1동' : '합계',
					singles
						? `Total · ${singles} house${singles === 1 ? '' : 's'}`
						: smart
							? 'Total · 1 glasshouse'
							: 'Total'
				),
				'',
				'',
				`${num(t.facility)}㎡ (${py(t.facility)})`,
				''
			],
			{ bold: true }
		)
		y += 16

		// 구역·선
		section(L('땅과 간격', 'Plot and spacing'))
		const kv = (k: string, v: string) => {
			room(18)
			y += 13.5
			text(ctx, k, M, y, { size: 8.5, color: MUTED })
			text(ctx, v, PW - M, y, { size: 8.5, weight: 600, align: 'right' })
			y += 4.5
			rule(ctx, y, 0.5, LINE)
		}
		kv(
			L('필지 면적', 'Parcel area'),
			// 토지특성 면적이 있으면 그 값 (경계로 잰 넓이는 조금 다르다)
			`${num(d.areaM2 ?? d.plan.parcel.area)}㎡ (${py(d.areaM2 ?? d.plan.parcel.area)})`
		)
		kv(
			L('남은 땅 (시설 사이 통로 포함)', 'Open ground (incl. paths between buildings)'),
			`${num(t.field)}㎡ (${py(t.field)})`
		)
		if (d.plan.entry)
			kv(
				L('진입로', 'Access road'),
				L(`폭 ${m1(d.plan.entry.width)}m`, `${m1(d.plan.entry.width)}m wide`)
			)
		if (smart)
			kv(
				L('벤로형 유리온실', 'Venlo glasshouse'),
				L(
					`${m1(smart.width)} × ${m1(smart.length)}m · 8m ${smart.bays}칸 · 높이 ${m1(smart.height)}m`,
					`${m1(smart.width)} × ${m1(smart.length)} m · ${smart.bays} × 8 m bays · ${m1(smart.height)} m high`
				)
			)
		if (singles)
			kv(
				L('하우스 간격', 'Gap between houses'),
				L(
					`동 사이 ${m1(d.houseGap)}m · 땅 경계에서 옆면 ${m1(d.houseGap)}m, 끝면 2.5m`,
					`${m1(d.houseGap)} m between houses · ${m1(d.houseGap)} m from the boundary at the sides, 2.5 m at the ends`
				)
			)
		kv(L('기후대', 'Climate zone'), d.zone)
		y += 16

		// 작물
		section(L('작물', 'Crop'))
		if (crop) {
			kv(
				crop.name,
				crop.income
					? L(`10a당 ${money(crop.income.won)}`, `${money(crop.income.won)} per 10a`)
					: '–'
			)
			if (yearly)
				kv(
					L(`이 배치에서 (${py(crop.grow)})`, `With this layout (${py(crop.grow)})`),
					L(`한 해 약 ${money(yearly)}`, `≈ ${money(yearly)} a year`)
				)
			// 간격 글은 길어서 한 줄 표가 아니라 문단으로
			if (d.mix) {
				const m = d.mix
				kv(
					L(`남은 밭 ${py(m.area)} · ${m.name}`, `Open ${num(m.area)} ㎡ · ${m.name}`),
					m.yearly ? L(`한 해 약 ${money(m.yearly)}`, `≈ ${money(m.yearly)} a year`) : '–'
				)
				if (yearly && m.yearly)
					kv(
						L('합계 (한 해)', 'Total a year'),
						L(`약 ${money(yearly + m.yearly)}`, `≈ ${money(yearly + m.yearly)}`)
					)
			}
			if (d.spacing) {
				room(30)
				y =
					para(ctx, L(`심는 간격: ${d.spacing}`, `Planting: ${d.spacing}`), M, y + 14, W, {
						size: 8.5
					}) + 2
				rule(ctx, y, 0.5, LINE)
			}
			crop.alts.forEach((a) =>
				kv(
					L(`다른 방식 · ${a.name}`, `Other · ${a.name}`),
					a.income ? L(`10a당 ${money(a.income)}`, `${money(a.income)} per 10a`) : '–'
				)
			)
		} else kv(L('작물', 'Crop'), '–')
		y += 16

		// 설치비·회수, 땅 조건 (화면 표 그대로)
		for (const g of d.groups) {
			section(g.title)
			for (const [k, v] of g.rows) kv(k, v)
			y += 16
		}

		// 확인할 점
		section(L('확인할 점', 'Before you build'))
		y += 12
		for (const s of d.notes) {
			room(30)
			y = para(ctx, '· ' + s, M, y, W, { size: 8.5 }) + 3
		}
		y += 12

		// 자료
		section(L('자료', 'Sources'))
		y += 12
		const src = [
			L(
				'필지 경계·지목·면적·용도지역: 국토교통부 브이월드 연속지적도·토지특성',
				'Parcel outline, category, area and zoning: MOLIT VWorld cadastral map and land characteristics'
			),
			L(
				'실제 이용(논·밭·과수·시설): 농림축산식품부 팜맵',
				'Actual use (paddy, field, orchard, greenhouse): MAFRA FarmMap'
			),
			L(
				'하우스·온실 폭과 높이: 농식품부 고시 「원예특작시설 내재해형 규격 설계도·시방서」 (단동 7.0m, 연동 7.0m씩, 벤로형 온실 8.0m)',
				'Greenhouse widths and heights: MAFRA disaster-resistant horticultural facility standard (single 7.0m, multi-span 7.0m bays, Venlo 8.0m)'
			),
			L(
				'10a당 소득: 농촌진흥청 「2024 농산물소득자료집」 전국 평균 (총수입 − 경영비, 경영비에 기존 시설 감가상각비 포함)',
				'Income per 10a: RDA 2024 farm income data book, national average (revenue minus operating costs, incl. depreciation of existing facilities)'
			),
			L(
				'동 사이 간격 1.6m: 눈 피해를 막으려면 1.5m 이상 띄우라는 권고 (기장군 농업기술센터, 농촌진흥청 자료 인용). 법정 기준은 없음',
				'1.6 m between houses: guidance of at least 1.5 m against snow damage (Gijang-gun Agricultural Technology Center, citing RDA). No legal standard'
			),
			L(
				'창고·작업 공간 크기, 하우스 길이, 땅 경계와의 거리, 진입로 폭은 법정 규격이 아니라 자동 배치의 시작값',
				'Storage and yard sizes, house length, boundary clearances and road width are starting values of the auto layout, not legal standards'
			)
		]
		for (const s of src) {
			room(30)
			y = para(ctx, '· ' + s, M, y, W, { size: 8, color: INK }) + 2
		}
		// 맺음말은 쪽 아래 문구와 같은 뜻이라, 자리가 없으면 쪽을 늘리지 않고 뺀다
		y += 16
		if (y + 50 <= PH - M - 12) {
			rule(ctx, y, 0.8)
			y += 18
			para(
				ctx,
				L(
					'이 계획도는 참고용이며 측량·설계·인허가를 대신하지 않습니다. 실제 경계는 지적측량으로, 시설 설치는 시·군청 농지 담당 부서와 시공업체에 확인하세요.',
					'This plan is for reference only and does not replace a survey, design or permit. Confirm boundaries with a cadastral survey and facilities with the city or county farmland office and your builder.'
				),
				M,
				y,
				W,
				{ size: 9, weight: 600 }
			)
		}
		foot(pg)
	}

	pages.forEach((pg, i) =>
		text(pg.ctx, `${date} · ${i + 1}/${pages.length}`, PW - M, M, {
			size: 8,
			color: MUTED,
			align: 'right'
		})
	)
	return writePdf(pages, L('배치 계획도 (참고용)', 'Layout plan (for reference)'))
}

// ── PDF 쓰기 (의존성 없이) ───────────────────────────
type PageOut = {
	canvas: HTMLCanvasElement
	links: { x: number; y: number; w: number; h: number; url: string }[]
	images: { x: number; y: number; w: number; h: number; jpeg: Uint8Array; pw: number; ph: number }[]
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array | null> {
	if (typeof CompressionStream === 'undefined') return null
	try {
		// 타입 정의가 오래된 lib 에서도 통과하게 (브라우저는 모두 지원)
		const blob = new Blob([bytes as BlobPart])
		const stream = (blob.stream() as unknown as ReadableStream<Uint8Array>).pipeThrough(
			new CompressionStream('deflate') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>
		)
		return new Uint8Array(await new Response(stream as unknown as BodyInit).arrayBuffer())
	} catch {
		return null
	}
}

async function pageImage(canvas: HTMLCanvasElement) {
	const { width: w, height: h } = canvas
	const data = canvas.getContext('2d')!.getImageData(0, 0, w, h).data
	const rgb = new Uint8Array(w * h * 3)
	for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
		rgb[j] = data[i]
		rgb[j + 1] = data[i + 1]
		rgb[j + 2] = data[i + 2]
	}
	const flate = await deflate(rgb)
	if (flate) return { w, h, filter: 'FlateDecode', bytes: flate }
	// 압축 스트림이 없는 옛 브라우저: JPEG 로
	const url = canvas.toDataURL('image/jpeg', 0.92)
	const bin = atob(url.split(',')[1])
	const bytes = new Uint8Array(bin.length)
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
	return { w, h, filter: 'DCTDecode', bytes }
}

const pdfString = (s: string) => {
	// 영문만이면 ( ), 아니면 UTF-16BE 16진수
	if (/^[\x20-\x7e]*$/.test(s)) return '(' + s.replace(/[\\()]/g, (c) => '\\' + c) + ')'
	let hex = 'FEFF'
	for (const ch of s) {
		const cp = ch.codePointAt(0)!
		const units =
			cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp]
		for (const u of units) hex += u.toString(16).padStart(4, '0').toUpperCase()
	}
	return `<${hex}>`
}

async function writePdf(pages: PageOut[], title: string): Promise<Blob> {
	const enc = new TextEncoder()
	const parts: Uint8Array[] = []
	const offsets: number[] = []
	let size = 0
	const push = (b: Uint8Array | string) => {
		const u = typeof b === 'string' ? enc.encode(b) : b
		parts.push(u)
		size += u.length
	}
	let nextId = 1
	const alloc = () => nextId++
	const obj = (id: number, body: string | (Uint8Array | string)[]) => {
		offsets[id] = size
		push(`${id} 0 obj\n`)
		if (typeof body === 'string') push(body)
		else body.forEach(push)
		push('\nendobj\n')
	}

	push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
	const catalog = alloc()
	const pagesId = alloc()
	const info = alloc()
	const pageIds: number[] = []

	for (const pg of pages) {
		const img = await pageImage(pg.canvas)
		const imgId = alloc()
		obj(imgId, [
			`<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${img.filter} /Length ${img.bytes.length} >>\nstream\n`,
			img.bytes,
			'\nendstream'
		])
		const xo: string[] = [`/P0 ${imgId} 0 R`]
		let content = `q ${PW} 0 0 ${PH} 0 0 cm /P0 Do Q\n`
		pg.images.forEach((im, i) => {
			const id = alloc()
			obj(id, [
				`<< /Type /XObject /Subtype /Image /Width ${im.pw} /Height ${im.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`,
				im.jpeg,
				'\nendstream'
			])
			xo.push(`/J${i} ${id} 0 R`)
			content += `q ${im.w} 0 0 ${im.h} ${im.x} ${PH - im.y - im.h} cm /J${i} Do Q\n`
		})
		const contentId = alloc()
		obj(contentId, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`)
		const annots = pg.links.map((l) => {
			const id = alloc()
			const x2 = l.x + l.w
			const y1 = PH - l.y - l.h
			obj(
				id,
				`<< /Type /Annot /Subtype /Link /Rect [${l.x.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${(PH - l.y).toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI ${pdfString(/^[\x20-\x7e]*$/.test(l.url) ? l.url : encodeURI(l.url))} >> >>`
			)
			return `${id} 0 R`
		})
		const pageId = alloc()
		obj(
			pageId,
			`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << ${xo.join(' ')} >> >> /Contents ${contentId} 0 R${annots.length ? ` /Annots [${annots.join(' ')}]` : ''} >>`
		)
		pageIds.push(pageId)
	}

	obj(
		pagesId,
		`<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
	)
	obj(catalog, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
	obj(info, `<< /Title ${pdfString(title)} /Producer (imun.farm) /Creator (imun.farm) >>`)

	const xref = size
	let x = `xref\n0 ${nextId}\n0000000000 65535 f \n`
	for (let i = 1; i < nextId; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
	push(x)
	push(
		`trailer\n<< /Size ${nextId} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
	)
	return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}
