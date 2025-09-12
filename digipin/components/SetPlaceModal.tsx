

import React, { useState, useEffect } from 'react';
import type { Place, SelectedPlaceData } from '../types';
import { geocodeByQuery } from '../services/digipinService';
import SearchForm from './SearchForm';
import ResultsList from './ResultsList';
import Spinner from './Spinner';

interface SetPlaceModalProps {
    placeType: 'home' | 'work';
    onClose: () => void;
    onSave: (type: 'home' | 'work', place: SelectedPlaceData) => Promise<void>;
}

const SetPlaceModal: React.FC<SetPlaceModalProps> = ({ placeType, onClose, onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [results, setResults] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const title = `Set ${placeType.charAt(0).toUpperCase() + placeType.slice(1)} Address`;

    // Debounce search term
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timerId);
    }, [searchTerm]);
    
    const searchPlaces = async (query: string) => {
        if (query.trim().length < 2) {
            setResults([]);
            setError(null);
            return;
        }
        setLoading('Searching...');
        setResults([]);
        setError(null);

        try {
            const data = await geocodeByQuery(query);
            if (data.length === 0) {
                setError('No results found.');
            }
            setResults(data);
        } catch (err) {
            setError('Failed to fetch locations.');
        } finally {
            setLoading(null);
        }
    };

    // Effect for handling API call
    useEffect(() => {
        searchPlaces(debouncedSearchTerm);
    }, [debouncedSearchTerm]);

    const handleSelectResult = (result: Place) => {
        setSelectedPlace(result);
        setResults([]); // Hide results list
    };
    
    const handleSave = async () => {
        if (selectedPlace) {
            setLoading('Saving...');
            setError(null);
            try {
                await onSave(placeType, {
                    digiPin: selectedPlace.digiPin,
                    displayName: selectedPlace.display_name,
                    lat: selectedPlace.lat,
                    lon: selectedPlace.lon,
                });
                // On success, the parent component will close the modal.
            } catch (err: any) {
                console.error(`Failed to save ${placeType} place:`, err);
                setError(err.message || `Failed to save ${placeType} place. Please try again.`);
                setLoading(null);
            }
        }
    };
    
    const handleSearchSubmit = () => {
        searchPlaces(searchTerm);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-lg shadow-xl p-6 w-full max-w-lg animate-pop-in flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                
                <div className="space-y-4">
                    {!selectedPlace ? (
                        <>
                            <p className="text-sm text-gray-400">Search for your {placeType} address below.</p>
                            <SearchForm
                                searchQuery={searchTerm}
                                onSearch={setSearchTerm}
                                onSubmit={handleSearchSubmit}
                                onGeolocate={() => { /* Geolocate not supported in this modal for simplicity */ }}
                                loading={!!loading}
                            />
                            {loading && <div className="flex justify-center p-4"><Spinner /></div>}
                            {error && <p className="text-red-400 text-center">{error}</p>}
                            {results.length > 0 && <ResultsList results={results} onSelect={handleSelectResult} />}
                        </>
                    ) : (
                         <div className="animate-fade-in space-y-4">
                            <p className="text-sm text-gray-400">Confirm your selection:</p>
                            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                <p className="font-semibold">{selectedPlace.display_name}</p>
                                <p className="font-mono text-sm text-indigo-400">{selectedPlace.digiPin}</p>
                            </div>
                             {error && <p className="text-red-400 text-center">{error}</p>}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button onClick={() => setSelectedPlace(null)} className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white" disabled={!!loading}>Back to Search</button>
                                <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-500/50" disabled={!!loading}>
                                    {loading ? 'Saving...' : `Save as ${placeType.charAt(0).toUpperCase() + placeType.slice(1)}`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SetPlaceModal;
