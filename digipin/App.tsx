

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import type { Place, SelectedPlaceData, User, SavedPin } from './types';
import { geocodeByQuery, generateForCoords, authService, getLocationByDigiPIN, historyService, imageGenerationService } from './services/digipinService';
import SearchForm from './components/SearchForm';
import ResultsList from './components/ResultsList';
import SelectedPlace from './components/SelectedPlace';
import Spinner from './components/Spinner';
import EmergencyResponseModal from './components/EmergencyResponseModal';
import HistoryList from './components/HistoryList';
import MyPlaces from './components/MyPlaces';
import SetPlaceModal from './components/SetPlaceModal';

declare global {
    interface Window { QRCode: any; google: any; L: any; qrCodeLoadError?: boolean; }
}

// --- Authentication Context ---
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    signup: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkInitialSession = async () => {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            setIsLoading(false);
        };
        checkInitialSession();
        const { data: { subscription } } = authService.onAuthStateChange(async (_event, session) => {
            setUser(session ? authService.mapSupabaseUserToAppUser(session.user) : null);
            if (_event === 'SIGNED_IN' && session?.user && session.user.aud === 'authenticated') {
                await authService.logSignUp(session.user);
            }
            setIsLoading(false);
        });
        return () => { subscription.unsubscribe(); };
    }, []);

    const login = async (email: string, pass: string) => {
        const loggedInUser = await authService.login(email, pass);
        setUser(loggedInUser);
    };
    const signup = async (email: string, pass: string) => {
        const signedUpUser = await authService.signup(email, pass);
        setUser(signedUpUser);
    };
    const loginWithGoogle = async () => {
        await authService.loginWithGoogle();
    };
    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, loginWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

// --- Auth Form Component ---
const AuthForm: React.FC<{ onSuccess: () => void; }> = ({ onSuccess }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const { login, signup, loginWithGoogle } = useAuth();

    const title = mode === 'login' ? 'Log In to your Account' : 'Create an Account';
    const buttonText = mode === 'login' ? 'Login' : 'Create Account';
    const switchModeText = mode === 'login' ? "Don't have an account?" : "Already have an account?";
    const switchModeButtonText = mode === 'login' ? "Sign Up" : "Log In";
    const anySubmitting = isSubmitting || isGoogleSubmitting;

    const handleGoogleSignIn = async () => {
        setIsGoogleSubmitting(true);
        setError('');
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during Google Sign-In.');
            setIsGoogleSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await signup(email, password);
            }
            onSuccess();
        } catch (err: any) {
             if (err.message && err.message.includes('Email not confirmed')) {
                setError('Email not confirmed. Please check your inbox for a confirmation link.');
            } else {
                setError(err.message || 'An unexpected error occurred.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 text-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-center mb-6">{title}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required className="w-full px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full px-4 py-2 border border-gray-600 bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                <button type="submit" disabled={anySubmitting} className="w-full px-5 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400/50 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Submitting...' : buttonText}
                </button>
            </form>
            <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-gray-600"></div><span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span><div className="flex-grow border-t border-gray-600"></div>
            </div>
            <button onClick={handleGoogleSignIn} disabled={anySubmitting} className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-75 disabled:cursor-wait">
                {isGoogleSubmitting ? (
                    <Spinner size="small" />
                ) : (
                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.486-11.188-8.166l-6.57 4.818C9.656 39.663 16.318 44 24 44z"></path></svg>
                )}
                <span>{isGoogleSubmitting ? 'Redirecting...' : 'Sign in with Google'}</span>
            </button>
            <div className="mt-4 text-center text-sm">
                <p className="text-gray-500">{switchModeText} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="font-semibold text-indigo-400 hover:underline">{switchModeButtonText}</button></p>
            </div>
        </div>
    );
};

// --- Page Components ---

const LandingPage: React.FC<{ onNavigateToGenerator: () => void; onNavigateToSOS: () => void }> = ({ onNavigateToGenerator, onNavigateToSOS }) => {
    return (
        <div className="page page-landing animated-gradient-background flex flex-col items-center justify-center p-4">
            <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-wider">DigiPIN</h1>
                <button onClick={onNavigateToSOS} className="px-4 py-2 font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 animate-sos-pulse">
                    Emergency SOS
                </button>
            </header>
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 items-center gap-12 text-center md:text-left">
                <div className="animate-slide-in-bottom">
                    <h2 className="text-5xl font-extrabold mb-4">The Universal Digital Address</h2>
                    <p className="text-lg text-gray-300 mb-8">One simple, shareable code for any location on the planet. For deliveries, emergencies, and adventures.</p>
                    <button onClick={onNavigateToGenerator} className="text-lg font-semibold text-indigo-300 hover:text-white">
                        Continue as Guest &rarr;
                    </button>
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                    <AuthForm onSuccess={onNavigateToGenerator} />
                </div>
            </div>
        </div>
    );
};

const GeneratorPage: React.FC<{ onNavigateToSOS: () => void; onLogout: () => void; onNavigateHome: () => void; }> = ({ onNavigateToSOS, onLogout, onNavigateHome }) => {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceData | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [isQrLoading, setIsQrLoading] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<SelectedPlaceData[]>([]);
    const [savedPins, setSavedPins] = useState<SavedPin[]>([]);
    const [personalPlaces, setPersonalPlaces] = useState<{ home?: SelectedPlaceData; work?: SelectedPlaceData }>({});
    const [isSetPlaceModalOpen, setSetPlaceModalOpen] = useState<'home' | 'work' | null>(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    useEffect(() => {
        setHistory(historyService.getHistory());
        const params = new URLSearchParams(window.location.search);
        const pinFromUrl = params.get('digipin');
        if (pinFromUrl) {
            handleLookupDigiPIN(pinFromUrl);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            setIsLoading('Loading your data...');
            setError(null);
            Promise.all([authService.getSavedPins(user.id), authService.getPersonalPlaces(user.id)])
                .then(([pins, places]) => {
                    setSavedPins(pins);
                    setPersonalPlaces(places);
                })
                .catch((err) => {
                    console.error("Failed to load user data:", err);
                    setError("Sorry, we couldn't load your saved data. Please try refreshing the page.");
                })
                .finally(() => {
                    setIsLoading(null);
                });
        } else {
            setSavedPins([]);
            setPersonalPlaces({});
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        if (selectedPlace?.digiPin) {
            setIsQrLoading(true);
            setQrDataUrl('');
            const generateQrWithRetry = (attempts = 0) => {
                if (window.qrCodeLoadError) {
                    setIsQrLoading(false);
                    setError('QR Code library failed to load. Please check your network, disable any ad blockers, and refresh the page.');
                    return;
                }
                if (window.QRCode) {
                    window.QRCode.toDataURL(selectedPlace.digiPin, { width: 256, margin: 1 }, (err: any, url: string) => {
                        setIsQrLoading(false);
                        if (err) {
                            console.error('QR Code generation failed:', err);
                            setError('Failed to generate QR code.');
                        } else {
                            setQrDataUrl(url);
                        }
                    });
                } else if (attempts < 600) { // 60 second timeout
                    setTimeout(() => generateQrWithRetry(attempts + 1), 100);
                } else {
                    setIsQrLoading(false);
                    console.error('QRCode library failed to load in time.');
                    setError('QR Code library failed to load in time. Please check your network connection and refresh the page.');
                }
            };
            generateQrWithRetry();

            const newHistory = historyService.addToHistory(selectedPlace);
            setHistory(newHistory);
            
            const isLandmark = selectedPlace.class === 'tourism' || selectedPlace.type === 'attraction';
            if (isLandmark) {
                setIsGeneratingImage(true);
                setGeneratedImageUrl(null);
                imageGenerationService.generateImageForPlace(selectedPlace.displayName)
                    .then(url => setGeneratedImageUrl(url))
                    .finally(() => setIsGeneratingImage(false));
            } else {
                 setGeneratedImageUrl(null);
                 setIsGeneratingImage(false);
            }

        } else {
            setQrDataUrl('');
            setIsQrLoading(false);
        }
    }, [selectedPlace]);
    
    const handleSearchSubmit = async () => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            setError('Please enter at least 2 characters to search.');
            return;
        }
        setIsLoading('Searching...');
        setSearchResults([]);
        setError(null);
        try {
            const results = await geocodeByQuery(searchQuery);
            if (results.length === 0) setError('No results found for your query.');
            setSearchResults(results);
        } catch (err) {
            setError('Failed to fetch search results. Please try again.');
        } finally {
            setIsLoading(null);
        }
    };

    const handleSelectPlace = (place: Place | SelectedPlaceData) => {
        const placeData: SelectedPlaceData = {
            digiPin: place.digiPin,
            displayName: 'display_name' in place ? place.display_name : place.displayName,
            lat: place.lat,
            lon: place.lon,
            class: 'class' in place ? place.class : undefined,
            type: 'type' in place ? place.type : undefined,
        };
        setSelectedPlace(placeData);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleGeolocate = async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setIsLoading('Getting your location...');
        setError(null);

        try {
            // Proactively check for permissions if the API is available
            if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                if (permissionStatus.state === 'denied') {
                    setError('Location access was denied. You must enable it in your browser settings to use this feature.');
                    setIsLoading(null);
                    return;
                }
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const placeData = await generateForCoords(latitude, longitude);
                        handleSelectPlace(placeData);
                    } catch (err) {
                        setError('Could not get location details. Please try again.');
                    } finally {
                        setIsLoading(null);
                    }
                },
                (geoError) => {
                    let message = 'An unknown error occurred while retrieving your location.';
                    switch (geoError.code) {
                        case geoError.PERMISSION_DENIED:
                            message = 'Location access denied. Please enable location permissions in your browser settings.';
                            break;
                        case geoError.POSITION_UNAVAILABLE:
                            message = 'Location information is currently unavailable. Please try again later.';
                            break;
                        case geoError.TIMEOUT:
                            message = 'The request to get user location timed out. Please try again.';
                            break;
                    }
                    setError(message);
                    setIsLoading(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000, // 15 second timeout
                    maximumAge: 0, // Force a fresh location
                }
            );
        } catch (e) {
            console.error("Geolocation check failed:", e);
            // Fallback for browsers that don't support Permissions API or other errors
            setError('Could not check location permissions. Please ensure they are enabled and try again.');
            setIsLoading(null);
        }
    };
    
    const handleLookupDigiPIN = async (pin: string) => {
        setIsLoading('Looking up DigiPIN...');
        try {
            const placeData = await getLocationByDigiPIN(pin);
            handleSelectPlace(placeData);
        } catch(err: any) {
            setError(err.message);
        } finally {
            setIsLoading(null);
        }
    };
    
    const handleSavePin = async (place: SelectedPlaceData) => {
        if (!user) {
            setError('You must be logged in to save pins.');
            return;
        }
        const savedPin = await authService.savePin(place, user.id);
        setSavedPins(prev => [savedPin, ...prev]);
    };
    
    const handleSetPersonalPlace = async (type: 'home' | 'work', place: SelectedPlaceData) => {
        if (!user) {
            throw new Error('You must be logged in to set places.');
        }
        await authService.setPersonalPlace(type, place, user.id);
        setPersonalPlaces(prev => ({...prev, [type]: place}));
        setSetPlaceModalOpen(null);
    };

    const handleClearPersonalPlace = async (type: 'home' | 'work') => {
        if (!user) {
            setError('You must be logged in to clear places.');
            return;
        }
        try {
            await authService.clearPersonalPlace(type, user.id);
            setPersonalPlaces(prev => ({...prev, [type]: undefined}));
        } catch (err) {
            console.error("Failed to clear place:", err);
            setError("Failed to clear your saved place. Please try again.");
        }
    }

    return (
        <div className="page page-generator custom-scrollbar">
            <header className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-10 p-4 flex justify-between items-center border-b border-gray-700/50">
                <h1 onClick={onNavigateHome} className="text-2xl font-bold tracking-wider cursor-pointer transition-colors hover:text-indigo-300">DigiPIN</h1>
                <div>
                    <button onClick={onNavigateToSOS} className="mr-4 px-3 py-1.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">SOS</button>
                    {isAuthenticated ? (
                        <>
                            <span className="mr-4 text-sm text-gray-300 hidden sm:inline">Welcome, {user?.email}</span>
                            <button onClick={onLogout} className="font-semibold text-indigo-400 hover:text-indigo-300 text-sm">Logout</button>
                        </>
                    ) : (
                        <span className="text-sm text-gray-400">Guest Mode</span>
                    )}
                </div>
            </header>
            <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-100">DigiPIN Generator</h2>
                    <p className="text-gray-400 mt-2">Find any location and get its unique, shareable DigiPIN.</p>
                </div>
                <SearchForm
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    onSubmit={handleSearchSubmit}
                    onGeolocate={handleGeolocate}
                    loading={!!isLoading}
                />
                {isLoading && <div className="flex justify-center items-center gap-3"><Spinner /><p>{isLoading}</p></div>}
                {error && <p className="text-center text-red-400">{error}</p>}
                {searchResults.length > 0 && <ResultsList results={searchResults} onSelect={handleSelectPlace} />}
                {selectedPlace && <SelectedPlace selectedPlace={selectedPlace} qrDataUrl={qrDataUrl} isQrLoading={isQrLoading} isAuthenticated={isAuthenticated} isSaved={savedPins.some(p => p.digiPin === selectedPlace.digiPin)} onSave={handleSavePin} onDispatch={onNavigateToSOS} generatedImageUrl={generatedImageUrl} isGeneratingImage={isGeneratingImage} />}
                {isAuthenticated && <MyPlaces places={personalPlaces} onSet={type => setSetPlaceModalOpen(type)} onSelect={handleSelectPlace} onClear={handleClearPersonalPlace} />}
                <HistoryList history={history} onSelect={handleSelectPlace} onClear={() => { historyService.clearHistory(); setHistory([]); }} />
            </main>
            {isSetPlaceModalOpen && <SetPlaceModal placeType={isSetPlaceModalOpen} onClose={() => setSetPlaceModalOpen(null)} onSave={handleSetPersonalPlace} />}
        </div>
    );
};

const SOSPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [sosStep, setSosStep] = useState<'location' | 'emergencyType' | 'dispatch'>('location');
    const [sosLocation, setSosLocation] = useState<SelectedPlaceData | null>(null);
    const [sosEmergencyType, setSosEmergencyType] = useState<string | null>(null);
    const [digiPinInput, setDigiPinInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleConfirmLocation = (place: SelectedPlaceData) => {
        setSosLocation(place);
        setSosStep('emergencyType');
    };
    
    const handleLookupDigiPIN = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!digiPinInput) return;
        setIsLoading(true);
        setError('');
        try {
            const placeData = await getLocationByDigiPIN(digiPinInput);
            handleConfirmLocation(placeData);
        } catch(err: any) {
            setError(err.message || 'Invalid DigiPIN.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeolocate = async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                if (permissionStatus.state === 'denied') {
                    setError('Location access denied. You must enable it in your browser settings to use this feature.');
                    setIsLoading(false);
                    return;
                }
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const placeData = await generateForCoords(latitude, longitude);
                        handleConfirmLocation(placeData);
                    } catch (err) {
                        setError('Could not get location details. Please try again.');
                    } finally {
                        setIsLoading(false);
                    }
                },
                (geoError) => {
                    let message = 'An unknown error occurred while retrieving your location.';
                    switch (geoError.code) {
                        case geoError.PERMISSION_DENIED:
                            message = 'Location access denied. Please enable location permissions in your browser settings.';
                            break;
                        case geoError.POSITION_UNAVAILABLE:
                            message = 'Location information is currently unavailable. Please try again later.';
                            break;
                        case geoError.TIMEOUT:
                            message = 'The request to get user location timed out. Please try again.';
                            break;
                    }
                    setError(message);
                    setIsLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0,
                }
            );
        } catch (e) {
            console.error("Geolocation check failed:", e);
            setError('Could not check location permissions. Please ensure they are enabled and try again.');
            setIsLoading(false);
        }
    };

    const handleSelectEmergency = (type: string) => {
        setSosEmergencyType(type);
        setSosStep('dispatch');
    };

    const emergencyTypes = ['Police', 'Ambulance', 'Firefighter'];

    return (
        <div className="page page-sos sos-page-background flex flex-col items-center justify-center p-4">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl z-10">&times;</button>
            <div className="w-full max-w-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700 rounded-lg p-8 shadow-2xl animate-pop-in">
                {sosStep === 'location' && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold text-red-400 mb-1">Step 1: Confirm Location</h2>
                        <p className="text-slate-400 mb-6">Help is on the way. Where should we send it?</p>

                        <div className="space-y-4">
                             <form onSubmit={handleLookupDigiPIN} className="space-y-3">
                                <input type="text" value={digiPinInput} autoFocus onChange={e => setDigiPinInput(e.target.value)} placeholder="Enter DigiPIN (e.g., DP-TT87GR5RVF)" className="w-full px-4 py-2 border border-slate-600 bg-slate-800 rounded-lg focus:ring-2 focus:ring-red-500" />
                                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold">Confirm DigiPIN</button>
                            </form>

                            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-700"></div><span className="flex-shrink mx-4 text-slate-500 text-sm">OR</span><div className="flex-grow border-t border-slate-700"></div></div>
                            <button onClick={handleGeolocate} disabled={isLoading} className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold disabled:bg-red-800">Use My Current Location</button>
                        </div>
                        
                        {isLoading && <div className="flex justify-center mt-4"><Spinner /></div>}
                        {error && <p className="text-red-400 text-center mt-4">{error}</p>}
                    </div>
                )}
                {sosStep === 'emergencyType' && sosLocation && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold text-red-400 mb-1">Step 2: Select Emergency</h2>
                        <p className="text-slate-400 mb-2">What kind of help do you need?</p>
                        <div className="p-3 bg-slate-800 border border-slate-700 rounded-md mb-6">
                            <p className="font-semibold text-slate-200">{sosLocation.displayName}</p>
                            <p className="text-sm font-mono text-indigo-400">{sosLocation.digiPin}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {emergencyTypes.map(type => (
                                <button key={type} onClick={() => handleSelectEmergency(type)} className="p-6 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-lg font-bold">
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {sosStep === 'dispatch' && sosLocation && sosEmergencyType && (
                    <EmergencyResponseModal incident={sosLocation} emergencyType={sosEmergencyType} onClose={onClose} />
                )}
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const [currentPage, setCurrentPage] = useState<'landing' | 'generator' | 'sos'>('landing');
    const [sosKey, setSosKey] = useState(0);
    const { logout } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            setCurrentPage(isAuthenticated ? 'generator' : 'landing');
        }
    }, [isAuthenticated, isLoading]);

    const handleLogout = async () => {
        await logout();
        setCurrentPage('landing');
    };

    const handleNavigateToSOS = () => {
        setSosKey(prevKey => prevKey + 1);
        setCurrentPage('sos');
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
    }

    return (
        <div className={`page-container show-${currentPage}`}>
            <LandingPage onNavigateToGenerator={() => setCurrentPage('generator')} onNavigateToSOS={handleNavigateToSOS} />
            <GeneratorPage onNavigateToSOS={handleNavigateToSOS} onLogout={handleLogout} onNavigateHome={() => setCurrentPage('landing')} />
            <SOSPage key={sosKey} onClose={() => setCurrentPage(isAuthenticated ? 'generator' : 'landing')} />
        </div>
    );
};


const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
