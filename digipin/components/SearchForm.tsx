

import React from 'react';

interface SearchFormProps {
    searchQuery: string;
    onSearch: (query: string) => void;
    onSubmit: () => void;
    onGeolocate: () => void;
    loading: boolean;
}

const LocationMarkerIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);

const SearchIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
);

const SearchForm: React.FC<SearchFormProps> = ({ searchQuery, onSearch, onSubmit, onGeolocate, loading }) => {
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
    };
    
    return (
        <div className="space-y-4">
             <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Enter a place name and press Search"
                    className="flex-grow w-full px-4 py-3 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    disabled={loading}
                />
                 <button
                    type="submit"
                    className="px-5 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-500/50 disabled:cursor-not-allowed flex-shrink-0 flex items-center gap-2"
                    disabled={loading || searchQuery.trim().length < 2}
                >
                    <SearchIcon />
                    Search
                </button>
            </form>
            <button
                type="button"
                onClick={onGeolocate}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 font-semibold text-indigo-300 bg-indigo-500/20 rounded-lg hover:bg-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:bg-gray-700/50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                disabled={loading}
            >
                <LocationMarkerIcon />
                Use My Location
            </button>
        </div>
    );
};

export default SearchForm;