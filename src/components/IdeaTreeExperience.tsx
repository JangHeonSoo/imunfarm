import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import clsx from 'clsx'
import styles from './IdeaTreeExperience.module.css'

type Idea = {
	id: string
	title: string
	summary: string
	votes: number
	createdAt: string
	tags?: string[]
	category?: string
}

type PositionedIdea = Idea & {
	coords: { x: number; y: number }
}

type FruitStyle = CSSProperties & {
	'--fruit-size': string
	'--fruit-glow': string
	'--streak-angle': string
	'--spark-hue': string
	'--fruit-depth': string
}

const VOTE_STORAGE_KEY = 'imunfarm_idea_tree_votes'

const MOCK_IDEAS: Idea[] = [
	{
		id: 'ai-soil-narrative',
		title: 'AI로 토양 건강 진단하고 재생기록 만들기',
		summary:
			'센서와 衛星 데이터를 결합해 토양의 현재 상태를 시각화하고, 독자가 직접 가꾸는 방법을 제안하는 리포트',
		votes: 148,
		createdAt: '2025-02-12',
		tags: ['AI', '토양'],
		category: '재생농업'
	},
	{
		id: 'windbreak-lab',
		title: '바람길을 디자인하는 목초 방풍림 실험',
		summary:
			'풍력 데이터를 활용해 방풍림 형태를 최적화한 뒤, 목초와 공존시키는 과정을 다루는 케이스 스터디',
		votes: 112,
		createdAt: '2025-02-05',
		tags: ['기후', '설계'],
		category: '에코 디자인'
	},
	{
		id: 'night-irrigation-grid',
		title: '야간 관개 전력망을 위한 초저전력 스마트 노드',
		summary:
			'전력 피크를 피해 야간에만 작동하는 관개 노드를 설계하고, 실제 밭에서의 적용성과 한계를 분석',
		votes: 173,
		createdAt: '2025-01-26',
		tags: ['IoT'],
		category: '에너지'
	},
	{
		id: 'ai-weather-protocol',
		title: '초미세 기상 데이터로 파종 타이밍을 맞추는 프로토콜',
		summary: '센티미터 스케일 기상 예측을 활용한 파종/수확 캘린더 자동화 실험기',
		votes: 205,
		createdAt: '2025-01-13',
		tags: ['기상', '데이터'],
		category: '데이터 농업'
	},
	{
		id: 'moss-bioreactor',
		title: '이끼 바이오리액터로 그린수소와 퇴비를 동시에',
		summary: '소규모 농가에서도 구축 가능한 모듈식 이끼 바이오리액터 설계와 냉각 시스템',
		votes: 96,
		createdAt: '2025-02-01',
		tags: ['수소', '바이오'],
		category: '循環'
	},
	{
		id: 'micro-climate-lab',
		title: '비닐하우스 안 작은 기후를 해석하는 오픈소스 키트',
		summary: 'NDVI 카메라와 CO₂ 센서를 묶어 마이크로클라이밋을 가시화하는 키트를 제작',
		votes: 134,
		createdAt: '2025-01-30',
		tags: ['오픈소스'],
		category: 'Fab'
	},
	{
		id: 'forest-ai-writing',
		title: 'AI에게 숲속 인터뷰를 맡기면 생기는 일',
		summary: 'LLM이 직접 농부의 일상을 인터뷰하고, 편집자는 이를 큐레이션하는 실험',
		votes: 82,
		createdAt: '2025-02-15',
		tags: ['LLM'],
		category: '콘텐츠'
	},
	{
		id: 'agri-osmotic-cooling',
		title: '증발냉각을 이용한 이동식 저장 돔',
		summary: '태양광과 증발냉각을 조합한 이동식 저장소 프로토타입 제작 후기',
		votes: 142,
		createdAt: '2025-01-19',
		tags: ['하드웨어'],
		category: '어그테크'
	},
	{
		id: 'seedling-capsule',
		title: '드론으로 뿌리는 씨앗 캡슐의 생존율 실험',
		summary: '캡슐 재질, 토양 수분, 발아율을 데이터로 비교하며 프로토타입을 개선',
		votes: 187,
		createdAt: '2025-01-02',
		tags: ['드론', '프로토타입'],
		category: '재조림'
	},
	{
		id: 'biochar-rain',
		title: 'Biochar를 빗물과 섞어 살포했더니',
		summary: '소규모 농장에서 biochar 슬러리를 직접 만들어 관개 시스템에 투입한 기록',
		votes: 121,
		createdAt: '2025-02-08',
		tags: ['Biochar'],
		category: '탄소'
	},
	{
		id: 'tiny-farm-server',
		title: '농장 상태를 읽어주는 Tiny Web Server',
		summary: 'LoRa 센서 허브와 WebUSB를 묶어, PC 없이도 현장에서 데이터 뷰를 여는 방법',
		votes: 88,
		createdAt: '2025-01-23',
		tags: ['LoRa', '웹'],
		category: '네트워크'
	},
	{
		id: 'lunar-calendar',
		title: '달 주기를 반영한 작부 설계 도구',
		summary: '위치기반 달 위상 데이터를 토지 설계에 입히는 인터랙티브 툴 만들기',
		votes: 76,
		createdAt: '2025-02-18',
		tags: ['UX'],
		category: '도구'
	}
]

const ANCHOR_POINTS: Array<{ x: number; y: number }> = [
	{ x: 20, y: 15 },
	{ x: 72, y: 18 },
	{ x: 45, y: 25 },
	{ x: 15, y: 38 },
	{ x: 78, y: 40 },
	{ x: 50, y: 48 },
	{ x: 25, y: 58 },
	{ x: 70, y: 60 },
	{ x: 42, y: 70 },
	{ x: 18, y: 78 },
	{ x: 65, y: 80 },
	{ x: 48, y: 88 }
]

const sortIdeas = (list: Idea[]) => [...list].sort((a, b) => b.votes - a.votes)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const pseudoRandom = (seed: string) => {
	const base = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
	return (Math.sin(base) + 1) / 2
}

const loadVotes = () => {
	try {
		const raw = localStorage.getItem(VOTE_STORAGE_KEY)
		if (!raw) return new Set<string>()
		return new Set(JSON.parse(raw) as string[])
	} catch {
		return new Set<string>()
	}
}

const persistVotes = (votes: Set<string>) => {
	try {
		localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(Array.from(votes)))
	} catch { }
}

const formatNumber = new Intl.NumberFormat('ko-KR')

const formatDate = (value: string) =>
	new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(value))

const computePositions = (ideas: Idea[]): PositionedIdea[] => {
	return ideas.map((idea, index) => {
		const anchor = ANCHOR_POINTS[index % ANCHOR_POINTS.length]
		const jitterBase = pseudoRandom(`${idea.id}-${index}`)
		const offsetX = (jitterBase - 0.5) * 12
		const offsetY = (Math.cos(jitterBase * Math.PI * 2) - 0.5) * 8
		return {
			...idea,
			coords: {
				x: clamp(anchor.x + offsetX, 12, 78),
				y: clamp(anchor.y + offsetY, 12, 88)
			}
		}
	})
}

type ToastState = { type: 'success' | 'info'; message: string } | null

const usePrefersReducedMotion = () => {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
	useEffect(() => {
		const matcher = window.matchMedia('(prefers-reduced-motion: reduce)')
		const onChange = () => setPrefersReducedMotion(matcher.matches)
		onChange()
		matcher.addEventListener('change', onChange)
		return () => matcher.removeEventListener('change', onChange)
	}, [])
	return prefersReducedMotion
}

const ParticleField = ({ reduceMotion }: { reduceMotion: boolean }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		let animationFrame: number | null = null
		const particles = Array.from({ length: 48 }, (_, idx) => ({
			radius: 0.8 + (idx % 5) * 0.3,
			speed: 0.15 + (idx % 7) * 0.02,
			alpha: 0.3 + (idx % 4) * 0.15,
			spark: idx % 11 === 0,
			phase: Math.random() * Math.PI * 2
		}))
		let width = 0
		let height = 0

		const resize = () => {
			const parent = canvas.parentElement
			if (!parent) return
			const rect = parent.getBoundingClientRect()
			width = rect.width
			height = rect.height
			const dpr = window.devicePixelRatio || 1
			canvas.width = width * dpr
			canvas.height = height * dpr
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`
			ctx.setTransform(1, 0, 0, 1, 0, 0)
			ctx.scale(dpr, dpr)
		}

		const draw = (tick: number) => {
			ctx.clearRect(0, 0, width, height)
			ctx.globalCompositeOperation = 'lighter'
			particles.forEach((particle, index) => {
				const drift = particle.phase
				const baseX = ((index * 51) % width) + Math.sin(tick * particle.speed + drift) * 14
				const baseY = ((index * 39) % height) + Math.cos(tick * particle.speed * 0.75 + drift) * 16
				const hue = 38 + (index % 8) * 3
				ctx.beginPath()
				ctx.arc(baseX, baseY, particle.radius, 0, Math.PI * 2)
				ctx.fillStyle = `hsla(${hue}, 95%, ${particle.spark ? 85 : 75}%, ${particle.spark ? 0.5 : particle.alpha})`
				ctx.fill()
			})
			ctx.globalCompositeOperation = 'source-over'
		}

		const render = (tick: number) => {
			draw(tick)
			animationFrame = requestAnimationFrame(render)
		}

		resize()
		window.addEventListener('resize', resize)
		if (reduceMotion) {
			draw(0)
		} else {
			animationFrame = requestAnimationFrame(render)
		}

		return () => {
			window.removeEventListener('resize', resize)
			if (animationFrame) cancelAnimationFrame(animationFrame)
		}
	}, [reduceMotion])

	return <canvas ref={canvasRef} className={styles.particleCanvas} aria-hidden='true' />
}

const IdeaTreeExperience = () => {
	const [ideas, setIdeas] = useState<Idea[]>(() => sortIdeas(MOCK_IDEAS))
	const [votes, setVotes] = useState<Set<string>>(new Set())
	const [activeIdea, setActiveIdea] = useState<string | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [toast, setToast] = useState<ToastState>(null)
	const [form, setForm] = useState({ title: '', summary: '', category: '' })
	const treeSectionRef = useRef<HTMLDivElement>(null)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const reduceMotion = usePrefersReducedMotion()

	useEffect(() => {
		setVotes(loadVotes())
	}, [])

	useEffect(() => {
		if (!activeIdea && ideas.length) {
			setActiveIdea(ideas[0].id)
		}
	}, [activeIdea, ideas])

	useEffect(() => {
		if (!toast) return
		const timer = window.setTimeout(() => setToast(null), 2600)
		return () => window.clearTimeout(timer)
	}, [toast])

	useEffect(() => {
		if (!modalOpen) return
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setModalOpen(false)
		}
		window.addEventListener('keydown', handleKey)
		return () => window.removeEventListener('keydown', handleKey)
	}, [modalOpen])

	useEffect(() => {
		if (modalOpen && titleInputRef.current) {
			titleInputRef.current.focus()
		}
	}, [modalOpen])

	const positionedIdeas = useMemo(() => computePositions(ideas), [ideas])
	const voteRange = useMemo(() => {
		const max = Math.max(...ideas.map((idea) => idea.votes)) || 1
		const min = Math.min(...ideas.map((idea) => idea.votes)) || 0
		return { min, max }
	}, [ideas])

	const topIdeaId = ideas[0]?.id ?? null

	const handleVote = (id: string) => {
		if (votes.has(id)) {
			setToast({ type: 'info', message: '이미 추천한 열매예요.' })
			return
		}
		setIdeas((prev) =>
			sortIdeas(prev.map((idea) => (idea.id === id ? { ...idea, votes: idea.votes + 1 } : idea)))
		)
		setVotes((prev) => {
			const next = new Set(prev)
			next.add(id)
			persistVotes(next)
			return next
		})
		setActiveIdea(id)
		setToast({ type: 'success', message: '추천했어요.' })
	}

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault()
		const trimmedTitle = form.title.trim()
		if (trimmedTitle.length < 4) {
			setToast({ type: 'info', message: '제목은 4자 이상 입력해 주세요.' })
			return
		}
		setIdeas((prev) =>
			sortIdeas([
				{
					id: `${Date.now()}`,
					title: trimmedTitle,
					summary: form.summary.trim() || '새롭게 심어진 아이디어. 곧 이야기가 자랍니다.',
					votes: 1,
					createdAt: new Date().toISOString(),
					tags: form.category ? [form.category] : [],
					category: form.category || '커뮤니티'
				},
				...prev
			])
		)
		setForm({ title: '', summary: '', category: '' })
		setModalOpen(false)
		setToast({ type: 'success', message: '새로운 열매가 매달렸어요.' })
	}

	const scrollToTree = () => {
		const target = treeSectionRef.current
		if (!target) return
		target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
	}

	const renderFruit = (idea: PositionedIdea, index: number) => {
		const normalized =
			voteRange.max === voteRange.min
				? 0.5
				: (idea.votes - voteRange.min) / (voteRange.max - voteRange.min)
		const glow = 0.5 + normalized * 0.9
		const size = 1.8 + normalized * 1.8
		const isActive = activeIdea === idea.id
		const streakAngle = pseudoRandom(`${idea.id}-angle`) * 120 - 60
		const sparkHue = normalized * 25
		const depth = 0.6 + pseudoRandom(`${idea.id}-depth`) * 0.4
		const fruitStyle: FruitStyle = {
			left: `${idea.coords.x}%`,
			top: `${idea.coords.y}%`,
			'--fruit-size': `${size}rem`,
			'--fruit-glow': glow.toString(),
			'--streak-angle': `${streakAngle}deg`,
			'--spark-hue': sparkHue.toString(),
			'--fruit-depth': depth.toString()
		}
		return (
			<button
				key={idea.id}
				type='button'
				className={clsx(styles.fruit, isActive && styles.fruitActive)}
				style={fruitStyle}
				data-glow={glow}
				data-active={isActive}
				onClick={() => handleVote(idea.id)}
				onMouseEnter={() => setActiveIdea(idea.id)}
				onFocus={() => setActiveIdea(idea.id)}
				aria-pressed={votes.has(idea.id)}
				aria-label={`${idea.title} - 추천 ${idea.votes}표`}
			>
				<span className={styles.fruitLabel}>{idea.title}</span>
				<span className={styles.fruitVotes}>{formatNumber.format(idea.votes)} 추천</span>
				<div className={clsx(styles.tooltip, idea.coords.y < 35 && styles.tooltipBelow)} role='tooltip'>
					<p className={styles.tooltipTitle}>{idea.title}</p>
					<p className={styles.tooltipBody}>{idea.summary}</p>
					<p className={styles.tooltipMeta}>
						{formatNumber.format(idea.votes)}명이 추천 · {formatDate(idea.createdAt)}
					</p>
				</div>
				{topIdeaId === idea.id && <span className={styles.harvestBadge}>수확 가능</span>}
			</button>
		)
	}

	return (
		<section className={clsx(styles.page, reduceMotion && styles.reduceMotion)}>
			<div className={styles.heroStrip}>
				<p className={styles.heroKicker}>COMMUNITY SEED PROGRAM</p>
				<h1>어떤 주제로 글을 작성할까요?</h1>
				<p>
					반짝이는 빛을 눌러 추천하거나, 새로운 아이디어를 제안해 주세요. 가장 밝게 빛나는 열매가
					다음 글이 됩니다.
				</p>
				<div className={styles.heroCtas}>
					<button type='button' className={styles.primaryCta} onClick={() => setModalOpen(true)}>
						아이디어 제안하기
					</button>
				</div>
			</div>

			<div ref={treeSectionRef} className={styles.treeSection}>
				<div className={styles.backgroundLayers} aria-hidden='true'>
					<div className={styles.backgroundPhoto} />
					<div className={styles.backgroundWash} />
					<ParticleField reduceMotion={reduceMotion} />
				</div>
				<div className={styles.treeLayer}>
					<div className={styles.treeLayout}>
						{positionedIdeas.map((idea, index) => renderFruit(idea, index))}
					</div>
				</div>
			</div>

			{toast && (
				<div
					className={clsx(styles.toast, toast.type === 'success' && styles.toastPositive)}
					role='status'
				>
					{toast.message}
				</div>
			)}

			{modalOpen && (
				<div
					className={styles.modalOverlay}
					role='dialog'
					aria-modal='true'
					aria-labelledby='idea-modal-title'
				>
					<div className={styles.modalCard}>
						<div className={styles.modalHeader}>
							<h3 id='idea-modal-title'>아이디어 제안하기</h3>
							<button type='button' onClick={() => setModalOpen(false)} aria-label='닫기'>
								×
							</button>
						</div>
						<form onSubmit={handleSubmit}>
							<label>
								<span>제목 *</span>
								<input
									type='text'
									ref={titleInputRef}
									value={form.title}
									onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
									required
									minLength={4}
									maxLength={80}
								/>
							</label>
							<label>
								<span>짧은 설명</span>
								<textarea
									value={form.summary}
									onChange={(event) =>
										setForm((prev) => ({ ...prev, summary: event.target.value }))
									}
									rows={4}
									maxLength={200}
									placeholder='어떤 실험이나 이야기를 듣고 싶은가요?'
								/>
							</label>
							<label>
								<span>카테고리</span>
								<input
									type='text'
									value={form.category}
									onChange={(event) =>
										setForm((prev) => ({ ...prev, category: event.target.value }))
									}
									placeholder='예: 재생농업, AI, 하드웨어'
								/>
							</label>
							<div className={styles.modalActions}>
								<button
									type='button'
									onClick={() => setModalOpen(false)}
									className={styles.secondaryCta}
								>
									닫기
								</button>
								<button type='submit' className={styles.primaryCta}>
									제안 등록
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</section>
	)
}

export default IdeaTreeExperience
