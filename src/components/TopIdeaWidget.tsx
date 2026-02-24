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
    const ctaText = isEn ? 'View all ideas & vote →' : '아이디어 전체보기 및 투표하기 →'

    // Calculate time until next Monday 00:00:00
    const calculateTimeLeft = () => {
        const now = new Date()
        const kstOffset = 9 * 60 * 60 * 1000 // KST is UTC+9
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

        const formatZero = (n: number) => n.toString().padStart(2, '0')
        return `${days > 0 ? `${days}일 ` : ''}${formatZero(hours)}:${formatZero(mins)}:${formatZero(secs)}`
    }

    useEffect(() => {
        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        fetch('/api/ideas')
            .then(res => res.json())
            .then((data: Idea[]) => {
                if (Array.isArray(data)) {
                    setTotalCount(data.length)
                    if (data.length > 0) {
                        const sorted = [...data].sort((a, b) => b.votes - a.votes)
                        setTopIdea(sorted[0])
                    }
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="w-full h-40 rounded-[2rem] bg-gray-100 dark:bg-gray-800 animate-pulse" />
    )

    if (!topIdea) return null

    return (
        <div className="w-full">
            <div className="mb-8">
                <h2 className="text-2xl md:text-4xl font-heading font-black text-gray-900 dark:text-white tracking-tight">
                    Community Ideas
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base font-medium">
                    {isEn ? 'Most voted idea right now' : '지금 가장 많은 투표를 받은 아이디어'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-6">
                {/* Summary Card 1 */}
                <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-8 group hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 flex flex-col justify-center flex-1 h-full">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl group-hover:w-60 group-hover:h-60 transition-all duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-green-600 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                                <span className="text-white text-xl font-black">💡</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white">{isEn ? 'Total Suggestions' : '제안된 아이디어'}</h3>
                                <span className="text-xs text-primary font-bold tracking-wide flex items-center gap-1.5 mt-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    {isEn ? 'Accumulating' : '실시간 집계 중'}
                                </span>
                            </div>
                        </div>
                        <div className="text-4xl md:text-5xl font-heading font-black text-gray-900 dark:text-white tracking-tight">
                            {totalCount}<span className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 ml-2 font-bold tracking-normal">{isEn ? 'ideas' : '개'}</span>
                        </div>
                    </div>
                </div>

                {/* Summary Card 2 */}
                <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-8 group hover:border-secondary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-secondary/5 hover:-translate-y-1 flex flex-col justify-center flex-1 h-full">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-secondary/10 to-transparent rounded-full blur-3xl group-hover:w-60 group-hover:h-60 transition-all duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-orange-600 flex items-center justify-center shadow-lg shadow-secondary/30 shrink-0">
                                <span className="text-white text-xl font-black">⏳</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-heading font-black text-gray-900 dark:text-white">{isEn ? 'Next Harvest' : '다음 수확까지'}</h3>
                                <span className="text-xs text-secondary font-bold tracking-wide block mt-1">
                                    {isEn ? 'Every Monday 00:00' : '매주 월요일 00시'}
                                </span>
                            </div>
                        </div>
                        <div className="text-4xl md:text-5xl font-heading font-black text-gray-900 dark:text-white tracking-tight font-mono">
                            {timeLeft}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Idea Card */}
            <a href={linkHref} className="block group">
                <div className="relative rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 flex flex-col">

                    {/* Abstract Header */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-secondary/10 to-blue-500/10 dark:from-primary/20 dark:via-secondary/20 dark:to-blue-500/20 opacity-50 transition-opacity group-hover:opacity-100" />

                    <div className="relative z-10 p-6 md:p-8 flex flex-col items-center justify-between gap-6 flex-grow">
                        <div className="w-full text-center md:text-left flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary dark:text-primary-light text-xs font-bold tracking-widest uppercase mb-4">
                                <span>🥇 #1 Top Idea</span>
                            </div>

                            <h3 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-gray-900 dark:text-white leading-snug mb-4 group-hover:text-primary transition-colors break-keep break-words whitespace-pre-line">
                                {topIdea.title}
                            </h3>

                            <div className="flex items-center justify-center md:justify-start gap-3 mt-4">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-black text-gray-700 dark:text-gray-300">
                                    {topIdea.author.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{topIdea.author}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span className="text-sm text-gray-400 font-medium">{topIdea.date}</span>
                            </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-center justify-center w-full md:w-full h-24 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 group-hover:border-primary/30 transition-colors mt-4">
                            <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">
                                {topIdea.votes.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Votes</span>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="relative z-10 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700/50 py-4 px-6 md:px-8 flex items-center justify-center transition-colors group-hover:bg-primary/5 mt-auto">
                        <span className="font-bold text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">
                            {ctaText}
                        </span>
                    </div>
                </div>
            </a>
        </div>
        </div >
    )
}
