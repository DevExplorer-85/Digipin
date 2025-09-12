import React from 'react';
import type { Place } from '../types';

interface ResultsListProps {
    results: Place[];
    onSelect: (result: Place) => void;
}

const ResultsList: React.FC<ResultsListProps> = ({ results, onSelect }) => {
    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-300">Search Results</h2>
            {results.map((result, index) => (
                <div 
                    key={result.place_id} 
                    className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/70 hover:border-indigo-500 transition-all duration-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slide-in-bottom"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div>
                        <p className="font-semibold text-gray-200">{result.display_name.split(',')[0]}</p>
                        <p className="text-sm text-gray-400">{result.display_name}</p>
                    </div>
                    <button
                        onClick={() => onSelect(result)}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-indigo-300 bg-indigo-500/20 rounded-lg hover:bg-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-400 transition-colors duration-200 flex-shrink-0"
                    >
                        Select
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ResultsList;