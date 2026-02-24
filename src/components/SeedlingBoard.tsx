import React, { useState, useEffect, useCallback } from 'react'

interface Idea {
    id: string
    title: string
    author: string
    date: string
    votes: number
}

// About 페이지 카드 아이콘처럼 — 2글자 약어 + 배경색
const COLORS = [
    { bg: '#22c55e', label: 'IT' },
    { bg: '#3b82f6', label: 'WB' },
    { bg: '#f97316', label: 'AI' },
    { bg: '#8b5cf6', label: 'DX' },
    { bg: '#06b6d4', label: 'OS' },
    { bg: '#ec4899', label: 'UX' },
    { bg: '#f59e0b', label: 'DB' },
]

/* ── localStorage 투표 기록 ── */
const getLocalVotes = (): Record<string, number> => {
    try {
        const raw = localStorage.getItem('imunfarm_voted_ideas')
        if (!raw) return {}
        const parsed = JSON.parse(raw) as Record<string, number>
        const now = Date.now()
        return Object.fromEntries(Object.entries(parsed).filter(([, ts]) => now - ts < 86400000))
    } catch { return {} }
}
const setLocalVote = (id: string) => {
    try { const v = getLocalVotes(); v[id] = Date.now(); localStorage.setItem('imunfarm_voted_ideas', JSON.stringify(v)) } catch { /**/ }
}
const removeLocalVote = (id: string) => {
    try { const v = getLocalVotes(); delete v[id]; localStorage.setItem('imunfarm_voted_ideas', JSON.stringify(v)) } catch { /**/ }
}

export default function SeedlingBoard({ lang = 'ko' }: { lang?: string }) {
    const [ideas, setIdeas] = useState<Idea[]>([])
    const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
    const [displayCount, setDisplayCount] = useState(6)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const isEn = lang === 'en'
    const t = {
        placeholder: isEn ? 'Suggest a topic or feature. (5~100 chars)' : '다뤄줬으면 하는 주제나 기능을 제안해 주세요. (5~100자)',
        authorPlaceholder: isEn ? 'Nickname (optional)' : '닉네임 (선택)',
        submitBtn: isEn ? 'Submit' : '등록',
        voteBtn: isEn ? 'Vote' : '투표하기',
        votedBtn: isEn ? 'Voted ✓' : '투표함 ✓',
        collapse: isEn ? 'Collapse' : '목록 접기',
        loadMore: isEn ? 'Load more' : '더 불러오기',
        votes: isEn ? 'votes' : '표',
        noIdeas: isEn ? 'No ideas yet — be the first to plant one.' : '아직 아이디어가 없습니다. 첫 번째 제안을 남겨보세요.',
    }

    const fetchIdeas = useCallback(async () => {
        try {
            const res = await fetch('/api/ideas')
            if (res.ok) setIdeas((await res.json() as Idea[]).sort((a, b) => b.votes - a.votes))
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => {
        fetchIdeas()
        setVotedIds(new Set(Object.keys(getLocalVotes())))
    }, [fetchIdeas])

    const handleVote = async (id: string) => {
        const alreadyVoted = votedIds.has(id)
        const res = await fetch(`/api/ideas/${id}/vote`, { method: alreadyVoted ? 'DELETE' : 'POST' })
        const data = await res.json() as { votes?: number; error?: string }
        if (res.ok && data.votes !== undefined) {
            setIdeas(prev => prev.map(i => i.id === id ? { ...i, votes: data.votes! } : i).sort((a, b) => b.votes - a.votes))
            if (alreadyVoted) { setVotedIds(prev => { const n = new Set(prev); n.delete(id); return n }); removeLocalVote(id) }
            else { setVotedIds(prev => new Set([...prev, id])); setLocalVote(id) }
        } else {
            setMessage({ type: 'error', text: data.error || (isEn ? 'Error' : '오류가 발생했습니다') })
            setTimeout(() => setMessage(null), 3000)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (title.trim().length < 5) {
            setMessage({ type: 'error', text: isEn ? 'Please write at least 5 characters.' : '5자 이상 입력해주세요.' })
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch('/api/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), author: author.trim() }),
            })
            const data = await res.json() as Idea & { error?: string }
            if (res.ok) {
                setIdeas(prev => [{ ...data, votes: 0 }, ...prev].sort((a, b) => b.votes - a.votes))
                setTitle(''); setAuthor('')
                setMessage({ type: 'success', text: isEn ? 'Idea submitted!' : '아이디어가 등록되었습니다!' })
            } else {
                setMessage({ type: 'error', text: data.error || (isEn ? 'Failed' : '등록 실패') })
            }
        } catch {
            setMessage({ type: 'error', text: isEn ? 'Network error' : '네트워크 오류' })
        } finally {
            setSubmitting(false)
            setTimeout(() => setMessage(null), 4000)
        }
    }

    const visible = ideas.slice(0, displayCount)

    return (
        <div className="w-full space-y-8">

            {/* 제출 폼 */}
            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-stone-200 dark:border-gray-700 p-6 md:p-8 shadow-sm"
            >
                <div className="flex flex-col gap-3">
                    <textarea
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder={t.placeholder}
                        maxLength={100}
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
                    />
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={author}
                            onChange={e => setAuthor(e.target.value)}
                            placeholder={t.authorPlaceholder}
                            maxLength={20}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 dark:border-gray-700 bg-stone-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-stone-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={submitting || title.trim().length < 5}
                            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? '...' : t.submitBtn}
                        </button>
                    </div>
                </div>
                {message && (
                    <div className={`mt-3 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {message.text}
                    </div>
                )}
            </form>

            {/* 아이디어 카드 그리드 */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 animate-pulse" />
                    ))}
                </div>
            ) : ideas.length === 0 ? (
                <div className="text-center py-24 text-stone-400 dark:text-gray-600 text-sm">{t.noIdeas}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visible.map((idea, index) => {
                        const color = COLORS[index % COLORS.length]
                        const isVoted = votedIds.has(idea.id)
                        const rank = index + 1
                        return (
                            <div
                                key={idea.id}
                                className="group bg-white dark:bg-gray-900 rounded-2xl border border-stone-200 dark:border-gray-800 p-6 md:p-7 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-4"
                            >
                                {/* 상단: 아이콘 + 타이틀 + 순위 */}
                                <div className="flex items-start gap-4">
                                    {/* About 페이지 스타일 아이콘 박스 */}
                                    <div
                                        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                                        style={{ backgroundColor: color.bg }}
                                    >
                                        <span className="text-white font-black text-xs tracking-wider">{rank <= 9 ? `0${rank}` : rank}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white text-base leading-snug break-keep">
                                            {idea.title}
                                        </p>
                                        {/* 상태 태그 (About 카드의 '성장 중', '수확 완료' 처럼) */}
                                        <p className="text-xs text-stone-400 dark:text-gray-500 mt-1 font-medium">
                                            {idea.author} &middot; {idea.date}
                                        </p>
                                    </div>
                                </div>

                                {/* 하단: 투표 영역 */}
                                <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-gray-800">
                                    <span className="text-sm font-black text-gray-700 dark:text-gray-200 tabular-nums">
                                        {idea.votes.toLocaleString()} {t.votes}
                                    </span>
                                    <button
                                        onClick={() => handleVote(idea.id)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${isVoted
                                                ? 'bg-primary/10 text-primary dark:bg-primary/20 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
                                                : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-300 hover:bg-primary/10 hover:text-primary'
                                            }`}
                                    >
                                        {isVoted ? t.votedBtn : t.voteBtn}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* 더보기 / 접기 */}
            {ideas.length > 6 && (
                <div className="flex justify-center">
                    <button
                        onClick={() => setDisplayCount(prev => prev >= ideas.length ? 6 : prev + 6)}
                        className="px-8 py-3 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-600 dark:text-gray-300 text-sm font-bold hover:border-primary/40 hover:text-primary transition-colors"
                    >
                        {displayCount >= ideas.length ? t.collapse : t.loadMore}
                    </button>
                </div>
            )}
        </div>
    )
}
