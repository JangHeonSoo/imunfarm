import React, { useState, useEffect } from 'react'

interface Idea {
    id: string
    title: string
    author: string
    date: string
    votes: number
}

export default function TopIdeaWidget({ lang = 'ko' }: { lang?: string }) {
    const [topIdea, setTopIdea] = useState<Idea | null>(null)
    const [totalCount, setTotalCount] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const [timeLeft, setTimeLeft] = useState<string>('')

    const isEn = lang === 'en'
    const linkHref = isEn ? '/en/ideas' : '/ideas'

    const calculateTimeLeft = () => {
        const now = new Date()
        const kstOffset = 9 * 60 * 60 * 1000
        const nowKst = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + kstOffset)
        const nextMonday = new Date(nowKst)
        nextMonday.setDate(nowKst.getDate() + ((7 - nowKst.getDay() + 1) % 7 || 7))
        nextMonday.setHours(0, 0, 0, 0)
        const diff = nextMonday.getTime() - nowKst.getTime()
        if (diff <= 0) return '00:00:00'
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const mins = Math.floor((diff / 1000 / 60) % 60)
        const secs = Math.floor((diff / 1000) % 60)
        const z = (n: number) => n.toString().padStart(2, '0')
        return `${days > 0 ? `${days}일 ` : ''}${z(hours)}:${z(mins)}:${z(secs)}`
    }

    useEffect(() => {
        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        fetch('/api/ideas')
            .then(res => res.json())
            .then((data: Idea[]) => {
                if (Array.isArray(data)) {
                    setTotalCount(data.length)
                    if (data.length > 0) {
                        setTopIdea([...data].sort((a, b) => b.votes - a.votes)[0])
                    }
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-64 animate-pulse" />
            ))}
        </div>
    )

    return (
        <div className="w-full">
            {/* Header — same pattern as Recent Posts */}
            <h2 className="text-3xl font-heading font-bold mb-10 text-gray-900 dark:text-white">Community Ideas</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Card 1 — Total Count */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col">
                    {/* Card image area — colored top block */}
                    <div className="h-52 relative bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-gray-900 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-6xl md:text-7xl font-black text-primary dark:text-primary tracking-tighter leading-none tabular-nums">
                                {totalCount}
                            </div>
                            <div className="text-sm font-bold text-primary/70 dark:text-primary/60 mt-2 uppercase tracking-widest">
                                {isEn ? 'ideas' : '개의 아이디어'}
                            </div>
                        </div>
                        {/* Live badge */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-gray-600 dark:text-gray-300">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                            </span>
                            LIVE
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-wider">
                            {isEn ? 'Total Suggestions' : '현재 제안된 아이디어'}
                        </div>
                        <h3 className="text-xl font-bold mb-3 leading-tight text-gray-900 dark:text-white">
                            {isEn ? 'Community is growing' : '커뮤니티가 성장하고 있어요'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow">
                            {isEn
                                ? 'Submit your idea and let the community vote for the best ones.'
                                : '아이디어를 제안하고, 커뮤니티가 투표로 최고의 아이디어를 선택합니다.'}
                        </p>
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-auto">
                            <a href={linkHref} className="text-sm font-semibold text-primary flex items-center gap-1 group/link">
                                {isEn ? 'Suggest an idea' : '아이디어 제안하기'}
                                <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Card 2 — Countdown */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col">
                    <div className="h-52 relative bg-gradient-to-br from-secondary/20 to-secondary/5 dark:from-secondary/30 dark:to-gray-900 flex items-center justify-center">
                        <div className="text-center px-4">
                            <div className="text-4xl md:text-5xl font-black text-secondary dark:text-secondary tracking-tighter leading-none font-mono tabular-nums">
                                {timeLeft}
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-gray-600 dark:text-gray-300">
                            {isEn ? 'KST MON 00:00' : '매주 월 00:00'}
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-wider">
                            {isEn ? 'Next Harvest Countdown' : '다음 수확까지 남은 시간'}
                        </div>
                        <h3 className="text-xl font-bold mb-3 leading-tight text-gray-900 dark:text-white">
                            {isEn ? 'Weekly harvest' : '매주 월요일 수확'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow">
                            {isEn
                                ? 'The most voted idea gets harvested into a blog post every Monday.'
                                : '매주 월요일, 가장 많은 투표를 받은 아이디어가 블로그 글로 수확됩니다.'}
                        </p>
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-auto">
                            <a href={linkHref} className="text-sm font-semibold text-secondary flex items-center gap-1 group/link">
                                {isEn ? 'Vote now' : '지금 투표하기'}
                                <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Card 3 — Top Idea */}
                {topIdea ? (
                    <a href={linkHref} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col group">
                        <div className="h-52 relative bg-gradient-to-br from-blue-500/20 to-blue-500/5 dark:from-blue-500/30 dark:to-gray-900 flex items-center justify-center px-6">
                            <div className="text-center">
                                <div className="text-5xl md:text-6xl font-black text-blue-600 dark:text-blue-400 tracking-tighter leading-none tabular-nums">
                                    {topIdea.votes}
                                </div>
                                <div className="text-sm font-bold text-blue-600/70 dark:text-blue-400/60 mt-2 uppercase tracking-widest">Votes</div>
                            </div>
                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-blue-600 dark:text-blue-400">
                                #1 TOP
                            </div>
                        </div>
                        <div className="p-6 flex flex-col flex-grow">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-wider">
                                {isEn ? 'Most Voted Idea' : '가장 많은 투표를 받은 아이디어'}
                            </div>
                            <h3 className="text-xl font-bold mb-3 leading-tight text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                {topIdea.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 flex-grow">
                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[11px] font-black text-gray-600 dark:text-gray-300">
                                    {topIdea.author.charAt(0).toUpperCase()}
                                </div>
                                <span>{topIdea.author}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span>{topIdea.date}</span>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-auto">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group/link">
                                    {isEn ? 'View & vote' : '전체보기 및 투표'}
                                    <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                                </span>
                            </div>
                        </div>
                    </a>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
                        {isEn ? 'No ideas yet' : '아직 아이디어가 없습니다'}
                    </div>
                )}
            </div>
        </div>
    )
}
