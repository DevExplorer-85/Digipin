
import React from 'react';
import type { SelectedPlaceData } from '../types';

interface MyPlacesProps {
    places: {
        home?: SelectedPlaceData;
        work?: SelectedPlaceData;
    };
    onSet: (type: 'home' | 'work') => void;
    onSelect: (place: SelectedPlaceData) => void;
    onClear: (type: 'home' | 'work') => void;
}

const HomeIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>;
const WorkIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm4-1a1 1 0 00-1 1v1h2V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;

const PlaceCard: React.FC<{
    type: 'home' | 'work';
    place: SelectedPlaceData | undefined;
    onSet: () => void;
    onSelect: (place: SelectedPlaceData) => void;
    onClear: () => void;
}> = ({ type, place, onSet, onSelect, onClear }) => {
    const Icon = type === 'home' ? HomeIcon : WorkIcon;
    const title = type.charAt(0).toUpperCase() + type.slice(1);

    return (
        <div className="bg-gray-800/50 p-4 rounded-lg flex items-center gap-4 border border-gray-700">
            <div className="flex-shrink-0 bg-gray-700 p-3 rounded-full">
                <Icon />
            </div>
            <div className="flex-1 min-w-0">
                {place ? (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between">
                             <p className="font-semibold text-gray-200 truncate cursor-pointer hover:text-indigo-400" onClick={() => onSelect(place)} title={place.displayName}>
                                {place.displayName.split(',')[0]}
                            </p>
                            <button onClick={onClear} className="text-gray-500 hover:text-red-400 text-xs p-1">Clear</button>
                        </div>
                        <p className="text-sm text-indigo-400 font-mono">{place.digiPin}</p>
                    </div>
                ) : (
                     <button onClick={onSet} className="text-indigo-400 font-semibold hover:text-indigo-300">
                        Set {title} Address
                    </button>
                )}
            </div>
        </div>
    );
};

const MyPlaces: React.FC<MyPlacesProps> = ({ places, onSet, onSelect, onClear }) => {
    return (
        <div className="mt-12 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-200 mb-4">My Places</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PlaceCard 
                    type="home"
                    place={places.home}
                    onSet={() => onSet('home')}
                    onSelect={onSelect}
                    onClear={() => onClear('home')}
                />
                 <PlaceCard 
                    type="work"
                    place={places.work}
                    onSet={() => onSet('work')}
                    onSelect={onSelect}
                    onClear={() => onClear('work')}
                />
            </div>
        </div>
    );
};

export default MyPlaces;
