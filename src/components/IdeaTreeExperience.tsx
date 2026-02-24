import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
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

const VOTE_STORAGE_KEY = 'imunfarm_voted_ideas'

/* ── API response type ── */
type ApiIdea = {
	id: string
	title: string
	author: string
	date: string
	votes: number
}

const mapApiToIdea = (api: ApiIdea, lang = 'ko'): Idea => ({
	id: api.id,
	title: api.title,
	summary: api.author || (lang === 'en' ? 'Anonymous Seed' : '익명의 씨앗'),
	votes: api.votes,
	createdAt: api.date,
})

type HarvestedIdea = {
	period: string
	ideaId: string
	title: string
	status: 'published' | 'writing'
	blogLink: string | null
}

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

/* ── localStorage 투표 기록 (24시간 만료) ── */
const getLocalVotes = (): Record<string, number> => {
	try {
		const raw = localStorage.getItem(VOTE_STORAGE_KEY)
		if (!raw) return {}
		const parsed = JSON.parse(raw) as Record<string, number>
		const now = Date.now()
		return Object.fromEntries(Object.entries(parsed).filter(([, ts]) => now - ts < 86400000))
	} catch { return {} }
}
const setLocalVote = (id: string) => {
	try { const v = getLocalVotes(); v[id] = Date.now(); localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(v)) } catch { /**/ }
}
const removeLocalVote = (id: string) => {
	try { const v = getLocalVotes(); delete v[id]; localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(v)) } catch { /**/ }
}

const formatNumber = (lang = 'ko') => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ko-KR')

const formatDate = (value: string, lang = 'ko') =>
	new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' }).format(new Date(value.replace(/\./g, '-')))

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

const IdeaTreeExperience = ({ lang = 'ko' }: { lang?: string }) => {
	const isEn = lang === 'en'
	const t = {
		suggestBtn: isEn ? 'Suggest an Idea' : '아이디어 제안하기',
		modalTitle: isEn ? 'Submit an Idea' : '아이디어 제안하기',
		closeBtn: isEn ? 'Close' : '닫기',
		titleLabel: isEn ? 'Title *' : '제목 *',
		nicknameLabel: isEn ? 'Nickname' : '닉네임',
		placeholder: isEn ? 'Optional (anonymous if blank)' : '선택사항 (미입력시 익명의 씨앗)',
		submit: isEn ? 'Submit' : '제안 등록',
		submitting: isEn ? 'Submitting...' : '등록 중...',
		harvestedTitle: isEn ? 'Harvested Ideas' : '수확된 열매',
		published: isEn ? 'Published' : '포스팅 완료',
		writing: isEn ? 'Writing' : '집필 중',
		voted: (n: number) => isEn ? `${formatNumber(lang).format(n)} votes` : `${formatNumber(lang).format(n)} 추천`,
		toastVoted: isEn ? 'Voted!' : '추천했어요.',
		toastUnvoted: isEn ? 'Vote cancelled.' : '추천을 취소했어요.',
		toastError: isEn ? 'An error occurred.' : '오류가 발생했습니다.',
		toastNetwork: isEn ? 'Network error.' : '네트워크 오류가 발생했습니다.',
		toastMinLength: isEn ? 'Please write at least 5 characters.' : '제목은 5자 이상 입력해 주세요.',
		toastPosted: isEn ? 'A new idea has been planted!' : '새로운 열매가 매달렸어요.',
		toastFailed: isEn ? 'Failed to submit.' : '등록에 실패했습니다.',
		harvestable: isEn ? 'Top Idea' : '수확 가능',
		harvestedEmpty: isEn ? 'No ideas have been harvested yet. Plant a new seed!' : '아직 수확된 열매가 없어요. 새로운 씨앗을 심어보세요!',
		tooltipVotes: (n: number) => isEn ? `${formatNumber(lang).format(n)} votes` : `${formatNumber(lang).format(n)}명이 추천`,
	}
	const [ideas, setIdeas] = useState<Idea[]>([])
	const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
	const [activeIdea, setActiveIdea] = useState<string | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [toast, setToast] = useState<ToastState>(null)
	const [form, setForm] = useState({ title: '', author: '' })
	const [harvested, setHarvested] = useState<HarvestedIdea[]>([])
	const treeSectionRef = useRef<HTMLDivElement>(null)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const reduceMotion = usePrefersReducedMotion()

	const fetchIdeas = useCallback(async () => {
		try {
			const res = await fetch('/api/ideas')
			if (res.ok) {
				const data = (await res.json()) as ApiIdea[]
				setIdeas(sortIdeas(data.map(api => mapApiToIdea(api, lang))))
			}
		} catch (e) {
			console.error('[IdeaTree] fetch error', e)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchIdeas()
		setVotedIds(new Set(Object.keys(getLocalVotes())))
	}, [fetchIdeas])

	useEffect(() => {
		fetch('/data/selected-ideas.json')
			.then((res) => res.json())
			.then((data) => setHarvested(data as HarvestedIdea[]))
			.catch(() => { })
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

	const handleVote = async (id: string) => {
		const alreadyVoted = votedIds.has(id)
		try {
			const res = await fetch(`/api/ideas/vote/${id}`, { method: alreadyVoted ? 'DELETE' : 'POST' })
			const data = (await res.json()) as { votes?: number; error?: string; success?: boolean }
			if (res.ok && data.votes !== undefined) {
				setIdeas((prev) =>
					sortIdeas(prev.map((idea) => (idea.id === id ? { ...idea, votes: data.votes! } : idea)))
				)
				if (alreadyVoted) {
					setVotedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
					removeLocalVote(id)
					setToast({ type: 'info', message: t.toastUnvoted })
				} else {
					setVotedIds((prev) => new Set([...prev, id]))
					setLocalVote(id)
					setActiveIdea(id)
					setToast({ type: 'success', message: t.toastVoted })
				}
			} else {
				setToast({ type: 'info', message: data.error || t.toastError })
			}
		} catch {
			setToast({ type: 'info', message: t.toastNetwork })
		}
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		const trimmedTitle = form.title.trim()
		if (trimmedTitle.length < 5) {
			setToast({ type: 'info', message: t.toastMinLength })
			return
		}
		setSubmitting(true)
		try {
			const res = await fetch('/api/ideas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: trimmedTitle, author: form.author.trim() }),
			})
			const data = (await res.json()) as ApiIdea & { error?: string }
			if (res.ok) {
				setIdeas((prev) => sortIdeas([mapApiToIdea({ ...data, votes: 0 }, lang), ...prev]))
				setForm({ title: '', author: '' })
				setModalOpen(false)
				setToast({ type: 'success', message: t.toastPosted })
			} else {
				setToast({ type: 'info', message: data.error || t.toastFailed })
			}
		} catch {
			setToast({ type: 'info', message: t.toastNetwork })
		} finally {
			setSubmitting(false)
		}
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
				aria-pressed={votedIds.has(idea.id)}
				aria-label={`${idea.title} - ${t.voted(idea.votes)}`}
			>
				<span className={styles.fruitLabel}>{idea.title}</span>
				<span className={styles.fruitVotes}>{t.voted(idea.votes)}</span>
				<div className={clsx(styles.tooltip, idea.coords.y < 35 && styles.tooltipBelow)} role='tooltip'>
					<p className={styles.tooltipTitle}>{idea.title}</p>
					<p className={styles.tooltipBody}>{idea.summary}</p>
					<p className={styles.tooltipMeta}>
						{t.tooltipVotes(idea.votes)} · {formatDate(idea.createdAt, lang)}
					</p>
				</div>
				{topIdeaId === idea.id && <span className={styles.harvestBadge}>{t.harvestable}</span>}
			</button >
		)
	}

	return (
		<section className={clsx(styles.page, reduceMotion && styles.reduceMotion)}>
			<div className={styles.heroStrip}>
				<div className={styles.heroCtas}>
					<button type='button' className={styles.primaryCta} onClick={() => setModalOpen(true)}>
						{t.suggestBtn}
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

			{/* ── Harvested section ── */}
			<div className={styles.harvestedSection}>
				<div className={styles.harvestedHeader}>
					<h2>{t.harvestedTitle}</h2>
				</div>
				{harvested.length > 0 ? (
					<div className={styles.harvestedGrid}>
						{harvested.map((item) => {
							const isPublished = item.status === 'published'
							const Tag = isPublished && item.blogLink ? 'a' : 'div'
							return (
								<Tag
									key={item.ideaId}
									className={clsx(styles.harvestCard, !isPublished && styles.harvestCardDisabled)}
									{...(isPublished && item.blogLink ? { href: item.blogLink } : {})}
								>
									<span
										className={clsx(
											styles.harvestDot,
											isPublished ? styles.harvestDotPublished : styles.harvestDotWriting
										)}
									/>
									<div className={styles.harvestInfo}>
										<p className={styles.harvestTitle}>{item.title}</p>
										<p className={styles.harvestMeta}>
											{item.period} · {isPublished ? '포스팅 완료' : '집필 중'}
										</p>
									</div>
									{isPublished && <span className={styles.harvestArrow}>→</span>}
								</Tag>
							)
						})}
					</div>
				) : (
					<div className={styles.harvestedEmpty}>
						<span className={styles.harvestedEmptyIcon}>🌱</span>
						<p>{t.harvestedEmpty}</p>
					</div>
				)}
			</div>

			{toast && (
				<div
					className={clsx(styles.toast, toast.type === 'success' && styles.toastPositive)}
					role='status'
				>
					{toast.message}
				</div>
			)}

			{modalOpen && typeof document !== 'undefined'
				? createPortal(
					<div
						className={styles.modalOverlay}
						role='dialog'
						aria-modal='true'
						aria-labelledby='idea-modal-title'
					>
						<div className={styles.modalCard}>
							<div className={styles.modalHeader}>
								<h3 id='idea-modal-title'>{t.modalTitle}</h3>
								<button type='button' onClick={() => setModalOpen(false)} aria-label={t.closeBtn}>
									×
								</button>
							</div>
							<form onSubmit={handleSubmit}>
								<label>
									<span>{t.titleLabel}</span>
									<input
										type='text'
										ref={titleInputRef}
										value={form.title}
										onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
										required
										minLength={5}
										maxLength={100}
									/>
								</label>
								<label>
									<span>{t.nicknameLabel}</span>
									<input
										type='text'
										value={form.author}
										onChange={(event) =>
											setForm((prev) => ({ ...prev, author: event.target.value }))
										}
										maxLength={20}
										placeholder={t.placeholder}
									/>
								</label>
								<div className={styles.modalActions}>
									<button
										type='button'
										onClick={() => setModalOpen(false)}
										className={styles.secondaryCta}
									>
										{t.closeBtn}
									</button>
									<button type='submit' className={styles.primaryCta} disabled={submitting}>
										{submitting ? t.submitting : t.submit}
									</button>
								</div>
							</form>
						</div>
					</div>,
					document.body
				)
				: null}
		</section>
	)
}

export default IdeaTreeExperience
