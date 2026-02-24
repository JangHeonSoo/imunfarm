import React from 'react';

interface UserProfileCardProps {
    username: string;
    level: number;
    seeds: number;
}

export default function UserProfileCard({ username, level, seeds }: UserProfileCardProps) {
    // Determine badge and title based on level
    const getBadgeInfo = (level: number) => {
        switch (level) {
            case 1: return { title: 'New Farmer', icon: '', color: 'bg-green-100 text-green-700' };
            case 2: return { title: 'Tractor Owner', icon: '', color: 'bg-blue-100 text-blue-700' };
            case 3: return { title: 'Greenhouse Owner', icon: '', color: 'bg-yellow-100 text-yellow-700' };
            case 4: return { title: 'Master AgTech', icon: '', color: 'bg-purple-100 text-purple-700' };
            default: return { title: 'Stranger', icon: '', color: 'bg-gray-100 text-gray-700' };
        }
    };

    const info = getBadgeInfo(level);

    // Progress calculation (mock thresholds: 50, 200, 500)
    const getNextThreshold = (lvl: number) => {
        if (lvl === 1) return 50;
        if (lvl === 2) return 200;
        if (lvl === 3) return 500;
        return seeds; // Max level
    };

    const threshold = getNextThreshold(level);
    const progressPercent = level < 4 ? Math.min(100, Math.round((seeds / threshold) * 100)) : 100;

    return (
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all hover:shadow-2xl hover:-translate-y-1">
            {/* Header Pattern Background */}
            <div className="h-24 bg-gradient-to-r from-primary-light to-primary relative overflow-hidden">
                <div className="absolute opacity-20 -right-4 -top-10 text-8xl transform rotate-12">
                    {info.icon}
                </div>
            </div>

            {/* Profile Content */}
            <div className="px-6 pb-6 relative">
                {/* Avatar Placeholder */}
                <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-2xl shadow-md border-4 border-white dark:border-gray-800 absolute -top-10 flex items-center justify-center text-3xl">
                    {username.charAt(0).toUpperCase()}
                </div>

                <div className="pt-12">
                    {/* Name and Level Badge */}
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold font-heading dark:text-gray-100">{username}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold font-body ${info.color}`}>
                            {info.icon} {info.title}
                        </span>
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        임운 농장 조합원
                    </p>

                    {/* Seeds & Progress */}
                    <div className="bg-bg-light dark:bg-gray-900 rounded-2xl p-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">보유 씨앗</span>
                            <span className="text-2xl font-bold text-primary dark:text-primary-light">{seeds}</span>
                        </div>

                        {level < 4 && (
                            <>
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                                    <div
                                        className="h-full bg-secondary rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-bold">
                                    <span>Lv.{level}</span>
                                    <span>다음 등급까지 {threshold - seeds}개 남음</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
