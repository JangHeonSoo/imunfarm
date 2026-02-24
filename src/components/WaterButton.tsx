import React, { useState, useEffect } from 'react';

interface WaterButtonProps {
    postSlug: string;
}

const STORAGE_KEY = 'imunfarm_seeds';

export default function WaterButton({ postSlug }: WaterButtonProps) {
    const [seeds, setSeeds] = useState<number>(0);
    const [isWatering, setIsWatering] = useState(false);
    const [showSprout, setShowSprout] = useState(false);

    useEffect(() => {
        // Load existing seeds from local storage for this post
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            if (parsedData[postSlug]) {
                setSeeds(parsedData[postSlug]);
            }
        }
    }, [postSlug]);

    const handleWater = () => {
        setIsWatering(true);
        const newSeeds = seeds + 1;
        setSeeds(newSeeds);

        // Save to local storage
        const storedData = localStorage.getItem(STORAGE_KEY);
        const parsedData = storedData ? JSON.parse(storedData) : {};
        parsedData[postSlug] = newSeeds;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));

        // Animation trigger
        setTimeout(() => {
            setIsWatering(false);
            setShowSprout(true);
            setTimeout(() => setShowSprout(false), 2000);
        }, 600);
    };

    return (
        <div className="flex flex-col items-center justify-center my-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-center dark:text-gray-200">
                Contribution to this Harvest
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                내용이 유익했다면 물을 주어 글을 성장시켜주세요!
                <br />({seeds}개의 물방울이 모였습니다)
            </p>

            <div className="relative">
                <button
                    onClick={handleWater}
                    disabled={isWatering}
                    className={`
            relative z-10 flex items-center justify-center gap-2 px-6 py-3 
            rounded-full font-bold text-white shadow-lg transition-all duration-300
            ${isWatering ? 'bg-blue-400 scale-95' : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 hover:-translate-y-1'}
            disabled:cursor-not-allowed
          `}
                >
                    <span className="text-2xl drop-shadow-md">Drop</span>
                    <span>물 주기</span>
                </button>

                {/* Water drop animation */}
                {isWatering && (
                    <div className="absolute left-1/2 -top-8 -translate-x-1/2 text-2xl z-20 pointer-events-none animate-bounce opacity-80 duration-500">
                        Drop
                    </div>
                )}

                {/* Sprout animation */}
                <div
                    className={`absolute left-1/2 -top-12 -translate-x-1/2 text-4xl z-0 pointer-events-none transition-all duration-700 ease-out transform origin-bottom
            ${showSprout ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-4'}`}
                >
                    Seed
                </div>
            </div>
        </div>
    );
}
