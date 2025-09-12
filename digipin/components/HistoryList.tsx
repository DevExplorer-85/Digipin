import React from 'react';
import type { SelectedPlaceData } from '../types';

interface HistoryListProps {
    history: SelectedPlaceData[];
    onSelect: (item: SelectedPlaceData) => void;
    onClear: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onClear }) => {
    if (history.length === 0) {
        return null;
    }

    return (
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-200">Recent Locations</h2>
                <button 
                    onClick={onClear} 
                    className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                    Clear History
                </button>
            </div>
            <div className="space-y-3">
                {history.map((item, index) => (
                    <div 
                        key={item.digiPin} 
                        className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/70 hover:border-indigo-500 transition-all duration-150 cursor-pointer animate-slide-in-bottom"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => onSelect(item)}
                    >
                        <p className="font-semibold text-gray-200">{item.displayName.split(',')[0]}</p>
                        <p className="text-sm text-indigo-400 font-mono">{item.digiPin}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryList;