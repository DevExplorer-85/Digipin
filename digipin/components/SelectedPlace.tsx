
import React, { useState } from 'react';
import type { SelectedPlaceData } from '../types';
import Spinner from './Spinner';

const MapIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SaveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12l-5-3-5 3V4z" />
    </svg>
);

const ShareIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
    </svg>
);

const SOSIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);


// --- Share Modal Component ---
const ShareModal: React.FC<{ digiPin: string; onClose: () => void; }> = ({ digiPin, onClose }) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?digipin=${digiPin}`;
    const shareText = `Check out this location! DigiPIN: ${digiPin}`;
    const [copyButtonText, setCopyButtonText] = useState('Copy');

    const socialLinks = {
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
        gmail: `mailto:?subject=${encodeURIComponent("Check out this DigiPIN location")}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`,
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 text-white rounded-lg shadow-xl p-6 w-full max-w-md animate-pop-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-center mb-4">Share this DigiPIN</h2>
                
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={shareUrl} 
                        readOnly 
                        className="flex-1 w-full px-3 py-2 border border-gray-600 bg-gray-900 rounded-lg text-sm" 
                    />
                    <button onClick={handleCopy} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 w-20">
                        {copyButtonText}
                    </button>
                </div>

                <p className="text-center text-sm text-gray-400 my-4">Or share via</p>
                <div className="flex justify-center items-center gap-4">
                     <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors" title="Share on WhatsApp">
                        <svg className="w-6 h-6 text-gray-200" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.001.004 4.971 4.971z"/></svg>
                    </a>
                    <a href={socialLinks.gmail} target="_blank" rel="noopener noreferrer" className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors" title="Share via Gmail">
                        <svg className="w-6 h-6 text-gray-200" fill="currentColor" viewBox="0 0 24 24"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/></svg>
                    </a>
                </div>
            </div>
        </div>
    );
};


interface SelectedPlaceProps {
    selectedPlace: SelectedPlaceData;
    qrDataUrl: string;
    isQrLoading: boolean;
    isAuthenticated: boolean;
    isSaved: boolean;
    onSave: (place: SelectedPlaceData) => Promise<void>;
    onDispatch: () => void;
    generatedImageUrl: string | null;
    isGeneratingImage: boolean;
}

const SelectedPlace: React.FC<SelectedPlaceProps> = ({ selectedPlace, qrDataUrl, isQrLoading, isAuthenticated, isSaved, onSave, onDispatch, generatedImageUrl, isGeneratingImage }) => {
    
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lon}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(selectedPlace.digiPin);
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSave(selectedPlace);
        } catch (error) {
            console.error("Failed to save pin:", error);
            // Optionally: show an error message to the user
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        {isShareModalOpen && <ShareModal digiPin={selectedPlace.digiPin} onClose={() => setIsShareModalOpen(false)} />}
        <div className="p-6 bg-gray-800/70 border border-gray-700 rounded-lg shadow-lg transition-all animate-pop-in">
            
            {(isGeneratingImage || generatedImageUrl) && (
                <div className="mb-6 aspect-video bg-gray-700/50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-600">
                    {isGeneratingImage ? (
                        <div className="w-full h-full shimmer-placeholder"></div>
                    ) : (
                        generatedImageUrl && <img src={generatedImageUrl} alt={`AI-generated image of ${selectedPlace.displayName}`} className="w-full h-full object-cover animate-fade-in" />
                    )}
                </div>
            )}

            <h2 className="text-xl font-bold text-gray-200 mb-4">Selected Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <p className="text-lg font-semibold text-gray-200 leading-tight">{selectedPlace.displayName}</p>
                    <div className="mt-6 space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-400">DigiPIN</p>
                            <div 
                                className="flex items-center gap-2 mt-1 p-3 bg-gray-900/50 rounded-md cursor-pointer group"
                                onClick={handleCopy}
                                title="Copy to clipboard"
                            >
                                <p className="font-mono text-2xl text-indigo-300 font-medium tracking-wider">{selectedPlace.digiPin}</p>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-indigo-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-400">Coordinates</p>
                            <p className="text-gray-300 font-mono text-sm mt-1">{parseFloat(selectedPlace.lat).toFixed(6)}, {parseFloat(selectedPlace.lon).toFixed(6)}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 pt-4 border-t border-gray-700">
                           
                             <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-300 bg-indigo-500/20 rounded-lg hover:bg-indigo-500/30 transition-colors"
                            >
                                <MapIcon />
                                Open in Maps
                            </a>
                            {isAuthenticated && (
                                <button
                                    onClick={handleSaveClick}
                                    disabled={isSaved || isSaving}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                                >
                                    <SaveIcon />
                                    {isSaving ? 'Saving...' : (isSaved ? 'Saved' : 'Save Pin')}
                                </button>
                            )}
                             <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                <ShareIcon />
                                Share
                            </button>
                             <button
                                onClick={onDispatch}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow hover:shadow-md hover:shadow-red-500/30"
                            >
                                <SOSIcon />
                                SOS / Dispatch
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-gray-900/50 rounded-lg border border-gray-700 h-48 w-full">
                    {isQrLoading ? (
                        <>
                            <Spinner />
                            <p className="text-xs text-gray-500 mt-2">Generating QR...</p>
                        </>
                    ) : qrDataUrl ? (
                        <>
                            <img src={qrDataUrl} alt="DigiPIN QR Code" className="w-40 h-40" />
                            <p className="text-xs text-gray-500 mt-2">Scan for DigiPIN</p>
                        </>
                    ) : (
                        <div className="text-center text-gray-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M12 20v-1" /></svg>
                            <p className="text-xs mt-2">QR Code will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default SelectedPlace;