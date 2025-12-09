
import { Asset } from '../types';

export interface DepreciationResult {
    initialValue: number;
    currentValue: number;
    monthlyDepreciation: number;
    accumulatedDepreciation: number;
    usefulLifeYears: number;
    monthsPassed: number;
    isFullyDepreciated: boolean;
}

// Mapping standar umur ekonomis berdasarkan kategori (dalam tahun)
const USEFUL_LIFE_MAP: Record<string, number> = {
    'Perangkat Jaringan (Core)': 8, // Router, Switch
    'Perangkat Pelanggan (CPE)': 4, // Modem, ONT (lebih cepat usang)
    'Infrastruktur Fiber Optik': 10, // Kabel, ODP (tahan lama)
    'Alat Kerja Lapangan': 5, // Splicer, OTDR
    'Aset Kantor': 4, // PC, Laptop
};

const DEFAULT_USEFUL_LIFE = 4;

export const calculateAssetDepreciation = (asset: Asset): DepreciationResult | null => {
    if (!asset.purchasePrice || !asset.purchaseDate) {
        return null;
    }

    const purchaseDate = new Date(asset.purchaseDate);
    const now = new Date();
    const initialValue = asset.purchasePrice;
    
    // Tentukan umur ekonomis
    const usefulLifeYears = USEFUL_LIFE_MAP[asset.category] || DEFAULT_USEFUL_LIFE;
    const usefulLifeMonths = usefulLifeYears * 12;

    // Hitung bulan yang telah berlalu
    let monthsPassed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    
    // Tidak boleh negatif (jika tanggal beli di masa depan secara tidak sengaja)
    monthsPassed = Math.max(0, monthsPassed);

    // Metode Garis Lurus (Straight Line) tanpa nilai residu
    const monthlyDepreciation = initialValue / usefulLifeMonths;
    
    // Hitung akumulasi
    let accumulatedDepreciation = monthlyDepreciation * monthsPassed;
    
    // Cap akumulasi tidak boleh melebihi nilai awal
    if (accumulatedDepreciation > initialValue) {
        accumulatedDepreciation = initialValue;
    }

    const currentValue = initialValue - accumulatedDepreciation;

    return {
        initialValue,
        currentValue: Math.round(currentValue),
        monthlyDepreciation: Math.round(monthlyDepreciation),
        accumulatedDepreciation: Math.round(accumulatedDepreciation),
        usefulLifeYears,
        monthsPassed,
        isFullyDepreciated: currentValue <= 0
    };
};
