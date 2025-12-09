import React, { useMemo } from 'react';
import { Asset, AssetStatus, AssetCategory } from '../../../types';

// --- DONUT CHART COMPONENT ---

interface DonutChartProps {
    assets: Asset[];
}

export const AssetStatusDonutChart: React.FC<DonutChartProps> = ({ assets }) => {
    const data = useMemo(() => {
        const statusCounts = {
            [AssetStatus.IN_USE]: 0,
            [AssetStatus.IN_STORAGE]: 0,
            [AssetStatus.DAMAGED]: 0,
            others: 0
        };

        assets.forEach(a => {
            if (a.status === AssetStatus.IN_USE) statusCounts[AssetStatus.IN_USE]++;
            else if (a.status === AssetStatus.IN_STORAGE) statusCounts[AssetStatus.IN_STORAGE]++;
            else if (a.status === AssetStatus.DAMAGED) statusCounts[AssetStatus.DAMAGED]++;
            else statusCounts.others++;
        });

        const total = assets.length || 1; // Avoid division by zero
        
        return [
            { label: 'Digunakan', value: statusCounts[AssetStatus.IN_USE], color: '#3B82F6', percent: (statusCounts[AssetStatus.IN_USE] / total) * 100 },
            { label: 'Disimpan', value: statusCounts[AssetStatus.IN_STORAGE], color: '#10B981', percent: (statusCounts[AssetStatus.IN_STORAGE] / total) * 100 },
            { label: 'Rusak', value: statusCounts[AssetStatus.DAMAGED], color: '#EF4444', percent: (statusCounts[AssetStatus.DAMAGED] / total) * 100 },
            { label: 'Lainnya', value: statusCounts.others, color: '#F59E0B', percent: (statusCounts.others / total) * 100 },
        ].filter(d => d.value > 0); // Hide zero values
    }, [assets]);

    // SVG Calculation
    let accumulatedPercent = 0;
    const segments = data.map((item, i) => {
        const startPercent = accumulatedPercent;
        accumulatedPercent += item.percent;
        const endPercent = accumulatedPercent;

        // Calculate coordinates
        const getCoords = (percent: number) => {
            const x = Math.cos(2 * Math.PI * percent / 100);
            const y = Math.sin(2 * Math.PI * percent / 100);
            return { x, y };
        };

        const start = getCoords(startPercent);
        const end = getCoords(endPercent);
        const largeArcFlag = item.percent > 50 ? 1 : 0;

        // Create SVG path
        const pathData = [
            `M ${start.x} ${start.y}`,
            `A 1 1 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
            `L 0 0`,
        ].join(' ');

        return (
            <path key={i} d={pathData} fill={item.color} transform="rotate(-90)" className="transition-all duration-300 hover:opacity-80" />
        );
    });

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center h-full gap-8 w-full">
            {/* Chart */}
            <div className="relative w-40 h-40 flex-shrink-0">
                <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full overflow-visible drop-shadow-sm">
                    {segments}
                    {/* Inner Circle for Donut Effect - Larger for cleaner look */}
                    <circle cx="0" cy="0" r="0.7" fill="white" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-gray-800 tracking-tight">{assets.length}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-3 min-w-[140px]">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm group">
                        <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: item.color }}></span>
                            <span className="text-gray-500 font-medium group-hover:text-gray-800 transition-colors">{item.label}</span>
                        </div>
                        <div className="text-right">
                            <span className="block font-bold text-gray-800">{item.value}</span>
                            <span className="block text-[10px] text-gray-400 font-medium">{Math.round(item.percent)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- BAR CHART COMPONENT ---

interface BarChartProps {
    assets: Asset[];
    categories: AssetCategory[];
}

export const CategoryBarChart: React.FC<BarChartProps> = ({ assets, categories }) => {
    const data = useMemo(() => {
        const counts = categories.map(cat => {
            const count = assets.filter(a => a.category === cat.name).length;
            return { label: cat.name, value: count };
        });
        
        // Sort by value desc and take top 5
        return counts.sort((a, b) => b.value - a.value).slice(0, 5);
    }, [assets, categories]);

    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="flex flex-col justify-between h-full space-y-5">
            {data.map((item, i) => {
                const widthPercent = (item.value / maxValue) * 100;
                return (
                    <div key={i} className="group">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-600 truncate max-w-[180px] group-hover:text-tm-primary transition-colors" title={item.label}>{item.label}</span>
                            <span className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{item.value}</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-100/50">
                            <div 
                                className="h-full bg-gradient-to-r from-tm-primary to-blue-400 rounded-full transition-all duration-1000 ease-out relative" 
                                style={{ width: `${widthPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            </div>
                        </div>
                    </div>
                );
            })}
            {data.length === 0 && <p className="text-center text-sm text-gray-400 my-auto">Belum ada data kategori.</p>}
        </div>
    );
};

// --- SPENDING TREND CHART (LINE) ---

interface SpendingChartProps {
    data: { month: string; value: number }[];
}

export const SpendingTrendChart: React.FC<SpendingChartProps> = ({ data }) => {
    if (data.length === 0) return <p className="text-center text-sm text-gray-400 my-auto">Belum ada data pembelian.</p>;

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d.value / maxValue) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="flex flex-col h-full justify-end relative pt-4">
             {/* Tooltip Overlay logic would go here in a more complex charting lib */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32 overflow-visible">
                {/* Grid Lines */}
                <line x1="0" y1="0" x2="100" y2="0" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="0" y1="100" x2="100" y2="100" stroke="#E5E7EB" strokeWidth="0.5" />

                {/* The Area Under Line */}
                <polygon points={`0,100 ${points} 100,100`} fill="url(#gradient)" opacity="0.2" />
                <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* The Line */}
                <polyline points={points} fill="none" stroke="#10B981" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Dots */}
                {data.map((d, i) => {
                     const x = (i / (data.length - 1)) * 100;
                     const y = 100 - (d.value / maxValue) * 100;
                     return (
                         <circle key={i} cx={x} cy={y} r="1.5" fill="white" stroke="#10B981" strokeWidth="1" className="hover:r-2 transition-all" />
                     )
                })}
            </svg>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                {data.map((d, i) => (
                    <span key={i}>{d.month}</span>
                ))}
            </div>
        </div>
    );
};


// --- TECHNICIAN LEADERBOARD ---

interface TechLeaderboardProps {
    data: { name: string; count: number }[];
}

export const TechnicianLeaderboard: React.FC<TechLeaderboardProps> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.count), 1);
    const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500'];

    return (
        <div className="space-y-4 h-full overflow-y-auto custom-scrollbar pr-2">
            {data.map((tech, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 border border-gray-200">
                        {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-gray-700 truncate">{tech.name}</span>
                            <span className="font-bold text-gray-900">{tech.count} Task</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${colors[i % colors.length]}`} 
                                style={{ width: `${(tech.count / maxValue) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            ))}
            {data.length === 0 && <p className="text-center text-sm text-gray-400 my-auto">Belum ada data teknisi.</p>}
        </div>
    );
};
