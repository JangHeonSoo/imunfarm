import React, { useState, useEffect, useCallback } from 'react'

interface Idea {
    id: string
    title: string
    author: string
    date: string
    votes: number
}

export default function IdeaAdmin() {
    const [ideas, setIdeas] = useState<Idea[]>([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const fetchIdeas = useCallback(async () => {
        try {
            const res = await fetch('/api/ideas')
            if (res.ok) setIdeas((await res.json() as Idea[]).sort((a, b) => b.votes - a.votes))
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchIdeas() }, [fetchIdeas])

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`정말 삭제하시겠습니까?\n\n"${title}"`)) return
        try {
            const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
            const data = await res.json() as { success?: boolean; error?: string }
            if (res.ok && data.success) {
                setIdeas(prev => prev.filter(i => i.id !== id))
                setMessage({ type: 'success', text: `삭제 완료: ${title}` })
            } else {
                setMessage({ type: 'error', text: data.error || '삭제 실패' })
            }
        } catch {
            setMessage({ type: 'error', text: '네트워크 오류' })
        }
        setTimeout(() => setMessage(null), 4000)
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: '-apple-system, sans-serif' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>🌱 아이디어 관리</h1>
            <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2rem' }}>
                총 {ideas.length}개 · 삭제하면 Redis에서 완전히 제거됩니다
            </p>

            {message && (
                <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: message.type === 'success' ? '#dcfce7' : '#fef2f2',
                    color: message.type === 'success' ? '#166534' : '#991b1b',
                }}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <p style={{ color: '#888' }}>불러오는 중...</p>
            ) : ideas.length === 0 ? (
                <p style={{ color: '#888' }}>등록된 아이디어가 없습니다.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>#</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>제목</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>작성자</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>추천</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>날짜</th>
                            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ideas.map((idea, i) => (
                            <tr key={idea.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '0.6rem 0.75rem', color: '#888' }}>{i + 1}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {idea.title}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', color: '#666' }}>{idea.author || '익명'}</td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>{idea.votes}</td>
                                <td style={{ padding: '0.6rem 0.75rem', color: '#888' }}>{idea.date}</td>
                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleDelete(idea.id, idea.title)}
                                        style={{
                                            border: '1px solid #fca5a5',
                                            background: '#fff',
                                            color: '#dc2626',
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '0.35rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        삭제
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>💡 수확 프로세스</p>
                <ol style={{ paddingLeft: '1.2rem', lineHeight: 1.8 }}>
                    <li><code>public/data/selected-ideas.json</code> 에 항목 추가 (status: "writing")</li>
                    <li>블로그 글 작성 완료 후 status → "published", blogLink 채우기</li>
                    <li>여기서 해당 아이디어 "삭제" 클릭 (Redis에서 제거)</li>
                </ol>
            </div>
        </div>
    )
}
