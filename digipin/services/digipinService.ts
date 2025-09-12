

import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabaseClient';
import type { Place, SelectedPlaceData, User, SavedPin, EmergencyCenter, DispatchStatus, LogEntry, UnitType, UnitStatus, Database, Json } from '../types';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Define explicit insert types from the main Database type to improve type safety.
type SignupInsert = Database['public']['Tables']['signups']['Insert'];
type PinInsert = Database['public']['Tables']['pins']['Insert'];
type EmergencyIncidentInsert = Database['public']['Tables']['emergency_incidents']['Insert'];
type PersonalPlacesInsert = Database['public']['Tables']['personal_places']['Insert'];

/*
 * Geohash implementation (MIT licensed)
 * from https://github.com/davetroy/geohash-js/blob/master/geohash.js
 * Adapted for TypeScript.
 */
const BITS = [16, 8, 4, 2, 1];
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const NEIGHBORS: Record<string, { even: string; odd?: string }> = {
    right:  { even: "bc01fg45238967deuvhjyznpkmstqrwx" },
    left:   { even: "238967debc01fg45kmstqrwxuvhjyznp" },
    top:    { even: "p0r21436x8zb9dcf5h7kjnmqesgutwvy" },
    bottom: { even: "14365h7k9dcfesgutwvyp0r2xbz8kjnm" }
};
const BORDERS: Record<string, { even: string; odd?: string }> = {
    right:  { even: "bcfguvyz" },
    left:   { even: "0145hjnp" },
    top:    { even: "prxz" },
    bottom: { even: "028b" }
};

NEIGHBORS.bottom.odd = NEIGHBORS.left.even;
NEIGHBORS.top.odd = NEIGHBORS.right.even;
NEIGHBORS.left.odd = NEIGHBORS.bottom.even;
NEIGHBORS.right.odd = NEIGHBORS.top.even;

BORDERS.bottom.odd = BORDERS.left.even;
BORDERS.top.odd = BORDERS.right.even;
BORDERS.left.odd = BORDERS.bottom.even;
BORDERS.right.odd = BORDERS.top.even;


const encodeGeohash = (latitude: number, longitude: number, precision: number = 9): string => {
    let is_even = true;
    let lat: [number, number] = [-90.0, 90.0];
    let lon: [number, number] = [-180.0, 180.0];
    let bit = 0;
    let ch = 0;
    let geohash = "";

    while (geohash.length < precision) {
        let mid: number;
        if (is_even) {
            mid = (lon[0] + lon[1]) / 2;
            if (longitude > mid) {
                ch |= BITS[bit];
                lon[0] = mid;
            } else {
                lon[1] = mid;
            }
        } else {
            mid = (lat[0] + lat[1]) / 2;
            if (latitude > mid) {
                ch |= BITS[bit];
                lat[0] = mid;
            } else {
                lat[1] = mid;
            }
        }

        is_even = !is_even;

        if (bit < 4) {
            bit++;
        } else {
            geohash += BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }
    return geohash;
};

const decodeGeohash = (geohash: string): { latitude: number; longitude: number; } => {
    let is_even = true;
    const lat_range: [number, number] = [-90.0, 90.0];
    const lon_range: [number, number] = [-180.0, 180.0];

    for (let i = 0; i < geohash.length; i++) {
        const c = geohash[i];
        const cd = BASE32.indexOf(c);
        for (let j = 0; j < 5; j++) {
            const mask = BITS[j];
            if (is_even) {
                if ((cd & mask) !== 0) {
                    lon_range[0] = (lon_range[0] + lon_range[1]) / 2;
                } else {
                    lon_range[1] = (lon_range[0] + lon_range[1]) / 2;
                }
            } else {
                if ((cd & mask) !== 0) {
                    lat_range[0] = (lat_range[0] + lat_range[1]) / 2;
                } else {
                    lat_range[1] = (lat_range[0] + lat_range[1]) / 2;
                }
            }
            is_even = !is_even;
        }
    }

    return {
        latitude: (lat_range[0] + lat_range[1]) / 2,
        longitude: (lon_range[0] + lon_range[1]) / 2,
    };
};


const makeDigiPINFromLatLon = (lat: number, lon: number): string => {
    const geohash = encodeGeohash(lat, lon, 9); // Increased precision
    const checksumChar = geohash.split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0)
        .toString(36)
        .slice(-1)
        .toUpperCase();
    return `DP-${geohash.toUpperCase()}${checksumChar}`;
};

// --- Live API Functions using OpenStreetMap Nominatim ---

const NOMINATIM_HEADERS = { 'User-Agent': 'DigiPIN App/1.2 (digipin-dev@example.com)' };

export const geocodeByQuery = async (query: string): Promise<Place[]> => {
    if (!query.trim()) return [];
    const endpoint = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
    const response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    const data = await response.json();
    return data.map((result: any) => ({
        ...result,
        digiPin: makeDigiPINFromLatLon(parseFloat(result.lat), parseFloat(result.lon)),
    }));
};

export const generateForCoords = async (lat: number, lon: number): Promise<SelectedPlaceData> => {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    let displayName = `Location at ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    let placeData: Partial<SelectedPlaceData> = {};
    try {
        const response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
        if (response.ok) {
            const data = await response.json();
            if (data?.display_name) displayName = data.display_name;
            if (data?.type) placeData.type = data.type;
            if (data?.class) placeData.class = data.class;
        }
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
    }
    return { digiPin: makeDigiPINFromLatLon(lat, lon), displayName, lat: lat.toString(), lon: lon.toString(), ...placeData };
};

export const getLocationByDigiPIN = async (pin: string): Promise<SelectedPlaceData> => {
    const normalizedPin = pin.trim();
    if (normalizedPin.length !== 13 || !normalizedPin.toUpperCase().startsWith('DP-')) {
        throw new Error('Invalid DigiPIN format.');
    }
    
    // Normalize case for robust validation: geohash must be lowercase for checksum.
    const geohash = normalizedPin.substring(3, 12).toLowerCase();
    const providedChecksum = normalizedPin.substring(12, 13).toUpperCase();
    
    const calculatedChecksum = geohash.split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0)
        .toString(36)
        .slice(-1)
        .toUpperCase();
        
    if (providedChecksum !== calculatedChecksum) {
        console.error(`Checksum mismatch. Provided: ${providedChecksum}, Calculated: ${calculatedChecksum} for geohash: ${geohash}`);
        throw new Error('Invalid DigiPIN. Check for typos.');
    }

    const { latitude, longitude } = decodeGeohash(geohash);
    return generateForCoords(latitude, longitude);
};

// --- Gemini Image Generation Service ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
export const imageGenerationService = {
    generateImageForPlace: async (placeName: string): Promise<string | null> => {
        try {
            const prompt = `A beautiful, high-quality, photorealistic image of the landmark: ${placeName}. Focus on the main subject, with a 16:9 cinematic aspect ratio.`;
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001', prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
            });
            if (response.generatedImages?.[0]) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            }
            return null;
        } catch (error) {
            console.error("Image generation failed:", error);
            return null;
        }
    }
};

// --- New Authentication and Data Service using Supabase ---
export const authService = {
    // Helper to map Supabase user to our app's User type
    mapSupabaseUserToAppUser: (supabaseUser: SupabaseUser): User => ({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email,
        pictureUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        createdAt: supabaseUser.created_at,
    }),

    logSignUp: async (user: SupabaseUser): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('signups')
                .select('user_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error checking signups table:', error);
                return;
            }

            if (!data) {
                const signupToInsert: SignupInsert = {
                    user_id: user.id,
                    email: user.email!,
                };
                // FIX: Passing a single-element array to `insert` is a robust way to avoid
                // common type inference issues with the Supabase client.
                const { error: insertError } = await supabase.from('signups').insert([signupToInsert]);

                if (insertError) {
                    console.error('Failed to log signup event to signups table:', insertError);
                }
            }
        } catch (error) {
            console.error('An unexpected error occurred in logSignUp:', error);
        }
    },

    signup: async (email: string, pass: string): Promise<User> => {
        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        if (!data.user) throw new Error('Signup succeeded but no user was returned.');
        return authService.mapSupabaseUserToAppUser(data.user);
    },

    login: async (email: string, pass: string): Promise<User> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (!data.user) throw new Error('Login succeeded but no user was returned.');
        return authService.mapSupabaseUserToAppUser(data.user);
    },
    
    loginWithGoogle: async (): Promise<void> => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) throw error;
    },

    logout: async (): Promise<void> => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    getSession: () => supabase.auth.getSession(),
    
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        return supabase.auth.onAuthStateChange(callback);
    },

    getCurrentUser: async (): Promise<User | null> => {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error getting session:", error);
            // Don't throw here, as it can crash the app on startup.
            // Return null to indicate no authenticated user.
            return null;
        }
        return data.session ? authService.mapSupabaseUserToAppUser(data.session.user) : null;
    },
    
    savePin: async (pinData: SelectedPlaceData, user_id: string): Promise<SavedPin> => {
        const pinToInsert: PinInsert = { ...pinData, user_id };
        // FIX: Passing a single-element array to `insert` is a robust way to avoid
        // common type inference issues with the Supabase client.
        const { data, error } = await supabase.from('pins').insert([pinToInsert]).select().single();
        if (error) throw error;
        return data as SavedPin;
    },
    
    getSavedPins: async (user_id: string): Promise<SavedPin[]> => {
        const { data, error } = await supabase.from('pins').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    deletePin: async (pinId: string): Promise<void> => {
        const { error } = await supabase.from('pins').delete().eq('id', pinId);
        if (error) throw error;
    },
    
    getPersonalPlaces: async (user_id: string): Promise<{ home?: SelectedPlaceData; work?: SelectedPlaceData }> => {
        const { data, error } = await supabase.from('personal_places').select('home, work').eq('user_id', user_id).single();
        if (error && error.code !== 'PGRST116') throw error; // Ignore 'no rows found' error
        if (!data) {
            return {};
        }
        // FIX: Cast the `Json` type from Supabase back to `SelectedPlaceData`.
        // The database returns `Json | null`, which needs to be converted to the
        // application's expected type of `SelectedPlaceData | undefined`.
        return {
            home: data.home ? (data.home as SelectedPlaceData) : undefined,
            work: data.work ? (data.work as SelectedPlaceData) : undefined,
        };
    },

    setPersonalPlace: async (type: 'home' | 'work', placeData: SelectedPlaceData, user_id: string): Promise<void> => {
        const recordToUpsert: PersonalPlacesInsert = {
            user_id: user_id,
            updated_at: new Date().toISOString(),
        };

        if (type === 'home') {
            recordToUpsert.home = placeData as Json;
        } else {
            recordToUpsert.work = placeData as Json;
        }
        
        // FIX: Passing a single-element array to `upsert` is a robust way to avoid
        // common type inference issues with the Supabase client.
        const { error } = await supabase.from('personal_places').upsert([recordToUpsert]);
        if (error) throw error;
    },
    
    clearPersonalPlace: async (type: 'home' | 'work', user_id: string): Promise<void> => {
        const recordToUpsert: PersonalPlacesInsert = {
            user_id: user_id,
            updated_at: new Date().toISOString(),
        };
        
        if (type === 'home') {
            recordToUpsert.home = null;
        } else {
            recordToUpsert.work = null;
        }
        
        // FIX: Passing a single-element array to `upsert` is a robust way to avoid
        // common type inference issues with the Supabase client.
        const { error } = await supabase.from('personal_places').upsert([recordToUpsert]);
        if (error) throw error;
    },
};


// --- History Service (Remains local) ---
const HISTORY_KEY = 'digipin_history';
export const historyService = {
    getHistory: (): SelectedPlaceData[] => {
        const item = window.localStorage.getItem(HISTORY_KEY);
        return item ? JSON.parse(item) : [];
    },
    addToHistory: (place: SelectedPlaceData): SelectedPlaceData[] => {
        const currentHistory = historyService.getHistory();
        const filteredHistory = currentHistory.filter(p => p.digiPin !== place.digiPin);
        const newHistory = [place, ...filteredHistory].slice(0, 10);
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
    },
    clearHistory: (): void => window.localStorage.removeItem(HISTORY_KEY)
};


// --- Mock Emergency Response Service (India-specific) ---
const EMERGENCY_CENTERS_INDIA: EmergencyCenter[] = [
    // Delhi
    { id: 'AMB-DL1', type: 'Ambulance', lat: 28.5665, lon: 77.2105, station: 'AIIMS Hospital, Delhi' },
    { id: 'POL-DL1', type: 'Police', lat: 28.6328, lon: 77.2195, station: 'Connaught Place Police Station' },
    { id: 'ENG-DL1', type: 'Fire Truck', lat: 28.6324, lon: 77.2170, station: 'Delhi Fire Service HQ, CP' },
    { id: 'AMB-DL2', type: 'Ambulance', lat: 28.7041, lon: 77.1025, station: 'Max Hospital, Pitampura' },
    { id: 'POL-DL2', type: 'Police', lat: 28.5273, lon: 77.2066, station: 'Saket Police Station' },
    
    // Mumbai
    { id: 'AMB-MH1', type: 'Ambulance', lat: 19.043, lon: 72.8633, station: 'Sion Hospital, Mumbai' },
    { id: 'POL-MH1', type: 'Police', lat: 18.943, lon: 72.835, station: 'Colaba Police Station' },
    { id: 'ENG-MH1', type: 'Fire Truck', lat: 19.076, lon: 72.8777, station: 'Bandra Fire Station' },
    { id: 'AMB-MH2', type: 'Ambulance', lat: 19.119, lon: 72.847, station: 'Nanavati Hospital, Vile Parle' },
    { id: 'POL-MH2', type: 'Police', lat: 19.138, lon: 72.835, station: 'Andheri Police Station' },

    // Bangalore
    { id: 'AMB-KA1', type: 'Ambulance', lat: 12.9716, lon: 77.5946, station: 'Victoria Hospital, Bangalore' },
    { id: 'POL-KA1', type: 'Police', lat: 12.9784, lon: 77.5919, station: 'Cubbon Park Police Station' },
    { id: 'ENG-KA1', type: 'Fire Truck', lat: 12.9698, lon: 77.5852, station: 'High Grounds Fire Station' },
    { id: 'AMB-KA2', type: 'Ambulance', lat: 13.035, lon: 77.597, station: 'MS Ramaiah Hospital' },
    
    // Kolkata
    { id: 'AMB-WB1', type: 'Ambulance', lat: 22.5448, lon: 88.3426, station: 'SSKM Hospital, Kolkata' },
    { id: 'POL-WB1', type: 'Police', lat: 22.5697, lon: 88.3697, station: 'Lalbazar Police HQ' },
    { id: 'ENG-WB1', type: 'Fire Truck', lat: 22.564, lon: 88.343, station: 'Fire Service HQ, Taltala' },
];

const createLog = (message: string, type: LogEntry['type'] = 'info'): LogEntry => ({
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }), message, type,
});

// Helper function to calculate distance between two lat/lon points in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};


export const emergencyResponseService = {
    logIncident: async (incidentData: { emergencyType: string; location: SelectedPlaceData }, user_id: string): Promise<void> => {
        const incidentToInsert: EmergencyIncidentInsert = { 
            user_id: user_id,
            emergencyType: incidentData.emergencyType,
            location: incidentData.location as Json
        };
        // FIX: Passing a single-element array to `insert` is a robust way to avoid
        // common type inference issues with the Supabase client.
        const { error } = await supabase.from('emergency_incidents').insert([incidentToInsert]);
        if (error) {
            console.error("Failed to log incident to Supabase:", error);
            throw error;
        }
    },
    async *startSimulation(incident: SelectedPlaceData, emergencyType: string, user: User | null): AsyncGenerator<Partial<DispatchStatus>> {
        const incidentLat = parseFloat(incident.lat);
        const incidentLon = parseFloat(incident.lon);
        const DISPATCH_RADIUS_KM = 15.0;
        let logs: LogEntry[] = [];
        
        if (user) {
            try {
                await this.logIncident({ emergencyType, location: incident }, user.id);
                logs.push(createLog('Incident logged to your account.', 'info'));
            } catch (error) {
                logs.push(createLog('Could not log incident. Continuing with dispatch.', 'warning'));
            }
        } else {
             logs.push(createLog('User not logged in, incident will not be saved to account.', 'info'));
        }

        logs.push(createLog(`CALL RECEIVED: ${emergencyType} Request`, 'warning'));
        yield { logs: [...logs] };

        await new Promise(res => setTimeout(res, 1500));
        logs.push(createLog(`Searching for nearest unit...`));
        yield { logs: [...logs], status: 'Dispatching' };

        const unitTypeMap: { [key: string]: UnitType } = { 'Ambulance': 'Ambulance', 'Firefighter': 'Fire Truck', 'Police': 'Police' };
        const requiredUnitType = unitTypeMap[emergencyType];

        const unitsWithDistance = EMERGENCY_CENTERS_INDIA
            .filter(u => u.type === requiredUnitType)
            .map(center => ({
                center,
                distance: calculateDistance(incidentLat, incidentLon, center.lat, center.lon)
            }))
            .sort((a, b) => a.distance - b.distance);
        
        let bestUnitChoice = unitsWithDistance.length > 0 ? unitsWithDistance[0] : null;
        let dispatchedUnit: EmergencyCenter | null = null;
        let distanceInKm = 0;

        await new Promise(res => setTimeout(res, 2000));
        
        if (bestUnitChoice && bestUnitChoice.distance <= DISPATCH_RADIUS_KM) {
            dispatchedUnit = bestUnitChoice.center;
            distanceInKm = bestUnitChoice.distance;
            logs.push(createLog(`Local unit found within dispatch radius. Dispatching now.`, 'success'));
        } else {
            // If no real unit is close enough, generate a prototype local unit.
            logs.push(createLog(`No registered units nearby. Generating a prototype local response unit...`, 'warning'));
            
            // Generate random coordinates within the dispatch radius
            const radiusInDegrees = DISPATCH_RADIUS_KM / 111.32; // Approx km per degree
            const u = Math.random();
            const v = Math.random();
            const w = radiusInDegrees * Math.sqrt(u);
            const t = 2 * Math.PI * v;
            const x = w * Math.cos(t);
            const y = w * Math.sin(t);
            // newLon calculation needs to adjust for latitude
            const newLon = x / Math.cos(incidentLat * Math.PI / 180) + incidentLon;
            const newLat = y + incidentLat;
            
            const prototypeUnit: EmergencyCenter = {
                id: 'PROTO-1',
                type: requiredUnitType,
                station: 'Prototype Local Response Unit',
                lat: newLat,
                lon: newLon,
            };
            
            dispatchedUnit = prototypeUnit;
            distanceInKm = calculateDistance(incidentLat, incidentLon, newLat, newLon);
        }

        if (dispatchedUnit) {
            let eta = Math.floor(distanceInKm * 1.5) + 2; // Realistic ETA based on distance

            logs.push(createLog(`UNIT ${dispatchedUnit.id} (${dispatchedUnit.type}) from ${dispatchedUnit.station} DISPATCHED. DISTANCE: ${distanceInKm.toFixed(2)} km. INITIAL ETA: ${eta} MIN.`, 'info'));
            
            const route: [number, number][] = [[dispatchedUnit.lat, dispatchedUnit.lon], [(dispatchedUnit.lat + incidentLat) / 2 + 0.01, (dispatchedUnit.lon + incidentLon) / 2 - 0.01], [incidentLat, incidentLon]];
            yield { unit: dispatchedUnit, logs: [...logs], route, eta, status: 'En Route', distance: distanceInKm };
            
            while (eta > 0) {
                await new Promise(res => setTimeout(res, 2000 + Math.random() * 2500));
                eta = Math.max(0, eta - (Math.floor(Math.random() * 2) + 1));
                if (eta > 0) logs.push(createLog(`Unit progressing, new ETA: ${eta} min.`));
                yield { logs: [...logs], eta };
            }
            
            await new Promise(res => setTimeout(res, 2000));
            logs.push(createLog('UNIT HAS ARRIVED. STATUS: ON SCENE.', 'success'));
            yield { logs: [...logs], eta: 0, status: 'On Scene' };
        } else {
            // This fallback should rarely be hit now, but is kept for safety.
            logs.push(createLog(`CRITICAL ERROR: Could not dispatch any unit.`, 'warning'));
            logs.push(createLog('Please try contacting emergency services through other means immediately.', 'warning'));
            yield { logs: [...logs], status: null, unit: null };
            return; 
        }
    }
};