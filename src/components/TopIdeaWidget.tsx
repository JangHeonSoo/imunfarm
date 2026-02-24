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
    const [loading, setLoading] = useState(true)

    const isEn = lang === 'en'
    const linkHref = isEn ? '/en/ideas' : '/ideas'
    const ctaText = isEn ? 'View all ideas & vote →' : '아이디어 전체보기 및 투표하기 →'
    const subtitleText = isEn ? 'Most voted idea right now' : '지금 가장 많은 투표를 받은 아이디어'

    useEffect(() => {
        fetch('/api/ideas')
            .then(res => res.json())
            .then((data: Idea[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    const sorted = [...data].sort((a, b) => b.votes - a.votes)
                    setTopIdea(sorted[0])
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
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-2xl md:text-4xl font-heading font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        Community Ideas
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base font-medium">
                        {subtitleText}
                    </p>
                </div>
            </div>

            <a href={linkHref} className="block group">
                <div className="relative rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800">

                    {/* Abstract Header */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-secondary/10 to-blue-500/10 dark:from-primary/20 dark:via-secondary/20 dark:to-blue-500/20 opacity-50 transition-opacity group-hover:opacity-100" />

                    <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center md:items-center justify-between gap-6 md:gap-10">

                        <div className="flex-1 w-full text-center md:text-left">
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

                        <div className="shrink-0 flex flex-col items-center justify-center w-full md:w-32 h-24 md:h-32 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 group-hover:border-primary/30 transition-colors">
                            <span className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">
                                {topIdea.votes.toLocaleString()}
                            </span>
                            <span className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Votes</span>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="relative z-10 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700/50 py-4 px-6 md:px-10 flex items-center justify-center md:justify-between transition-colors group-hover:bg-primary/5">
                        <span className="font-bold text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">
                            {ctaText}
                        </span>
                    </div>
                </div>
            </a>
        </div>
    )
}
