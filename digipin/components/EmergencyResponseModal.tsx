
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SelectedPlaceData, DispatchStatus, EmergencyCenter, UnitType, LogEntry, User } from '../types';
import { emergencyResponseService } from '../services/digipinService';
import Spinner from './Spinner';
import { useAuth } from '../App';

interface MapComponentProps {
    incident: SelectedPlaceData;
    unit: EmergencyCenter | null;
    route: [number, number][];
}

const getIcon = (type: UnitType, L: any) => {
    const color = type === 'Ambulance' ? '#ef4444' : type === 'Fire Truck' ? '#f97316' : '#3b82f6';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="${color}" class="w-8 h-8 drop-shadow-lg">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
    `.trim();
    return L.divIcon({
        html: svg,
        className: 'border-none bg-transparent',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });
};

const RecenterIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
);


const MapComponent: React.FC<MapComponentProps> = ({ incident, unit, route }) => {
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const recenterMap = useCallback(() => {
        if (!mapRef.current || !incident) return;
        const L = window.L;
        const map = mapRef.current;

        const incidentLatLng = [parseFloat(incident.lat), parseFloat(incident.lon)];
        const unitLatLng = unit ? [unit.lat, unit.lon] : null;

        const bounds = L.latLngBounds([incidentLatLng]);
        if (unitLatLng) {
            bounds.extend(unitLatLng);
        }
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }, [incident, unit]);


    useEffect(() => {
        if (!window.L || !mapContainerRef.current) return;
        const L = window.L;

        // Initialize map
        if (!mapRef.current) {
            const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            });
            
            mapRef.current = L.map(mapContainerRef.current, {
                zoomControl: true,
                layers: [darkLayer] // Default to dark theme
            }).setView([incident.lat, incident.lon], 13);
        }

        const map = mapRef.current;
        
        // Clear previous layers (markers and polylines)
        map.eachLayer((layer: any) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                map.removeLayer(layer);
            }
        });

        const incidentLatLng = [parseFloat(incident.lat), parseFloat(incident.lon)];

        // Add incident marker with pulsating beacon
        const incidentIcon = L.divIcon({
            html: `<div class="relative flex items-center justify-center">
                     <div class="absolute w-6 h-6 bg-red-500 rounded-full animate-ping opacity-75"></div>
                     <div class="relative w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                   </div>`,
            className: 'border-none bg-transparent',
            iconSize: [24, 24],
        });
        L.marker(incidentLatLng, { icon: incidentIcon }).addTo(map);

        // Add unit marker
        if (unit) {
            const unitIcon = getIcon(unit.type, L);
            L.marker([unit.lat, unit.lon], { icon: unitIcon }).addTo(map);
        }

        // Add route polyline
        if (route.length > 0) {
            L.polyline(route, { color: '#fb923c', weight: 5, opacity: 0.9, dashArray: '8, 8' }).addTo(map);
        }
        
        // Fit map to bounds on data change
        recenterMap();

    }, [incident, unit, route, recenterMap]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full bg-slate-900" />
            <button
                onClick={recenterMap}
                className="absolute top-3 right-3 z-[1000] p-2 bg-slate-700/80 text-white rounded-md hover:bg-slate-600 transition-colors shadow-lg"
                title="Recenter Map"
            >
                <RecenterIcon />
            </button>
        </div>
    );
};


interface EmergencyResponseModalProps {
    incident: SelectedPlaceData;
    emergencyType: string;
    onClose: () => void;
}

const LogItem: React.FC<{ log: LogEntry; style: React.CSSProperties }> = ({ log, style }) => {
    const colorClasses = {
        info: 'text-slate-300',
        route: 'text-amber-400',
        success: 'text-green-400 font-semibold',
        warning: 'text-red-400 font-semibold',
    };
    return (
        <div className="flex gap-3 text-sm font-mono animate-slide-in-bottom" style={style}>
            <span className="text-slate-500 flex-shrink-0">{log.timestamp}</span>
            <p className={`${colorClasses[log.type]}`}>{log.message}</p>
        </div>
    );
};


const EmergencyResponseModal: React.FC<EmergencyResponseModalProps> = ({ incident, emergencyType, onClose }) => {
    const [status, setStatus] = useState<DispatchStatus>({ unit: null, eta: null, route: [], logs: [], status: null, distance: undefined });
    const logContainerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    useEffect(() => {
        const runSimulation = async () => {
            const simulation = emergencyResponseService.startSimulation(incident, emergencyType, user);
            for await (const update of simulation) {
                setStatus(prev => ({ ...prev, ...update }));
            }
        };
        runSimulation();
    }, [incident, emergencyType, user]);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [status.logs]);
    
    const getEtaColor = () => {
        if (status.eta === 0) return 'text-green-400';
        if (status.eta !== null && status.eta <= 2) return 'text-red-400 animate-pulse';
        return 'text-amber-400';
    };

    const getStatusInfo = () => {
        switch (status.status) {
            case 'Dispatching':
                return { text: 'Dispatching', color: 'text-amber-400', bg: 'bg-amber-500/10' };
            case 'En Route':
                return { text: 'En Route', color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
            case 'Rerouting':
                return { text: 'Rerouting', color: 'text-orange-400', bg: 'bg-orange-500/10' };
            case 'On Scene':
                return { text: 'On Scene', color: 'text-green-400', bg: 'bg-green-500/10' };
            default:
                 if (status.logs.some(l => l.message.includes('SEARCH COMPLETE'))) {
                    return { text: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10' };
                }
                return { text: 'Standby', color: 'text-slate-400', bg: 'bg-slate-500/10' };
        }
    };
    
    const statusInfo = getStatusInfo();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 text-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col md:flex-row p-2 gap-2 border border-slate-700 animate-pop-in" onClick={e => e.stopPropagation()}>
                
                {/* Left Panel: Map */}
                <div className="w-full md:w-2/3 h-1/2 md:h-full bg-slate-800 rounded-md overflow-hidden">
                    <MapComponent incident={incident} unit={status.unit} route={status.route} />
                </div>

                {/* Right Panel: Info & Logs */}
                <div className="w-full md:w-1/3 flex flex-col gap-2">
                    {/* Incident Details */}
                    <div className="bg-slate-800 p-4 rounded-md border border-slate-700">
                        <h2 className="text-lg font-bold text-red-500 border-b border-slate-600 pb-2 mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            ACTIVE INCIDENT
                        </h2>
                        <div className="space-y-2">
                             <div>
                                <p className="text-xs text-slate-400">Location</p>
                                <p className="text-slate-100 font-semibold">{incident.displayName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">DigiPIN</p>
                                <p className="font-mono text-indigo-400">{incident.digiPin}</p>
                            </div>
                             <div>
                                <p className="text-xs text-slate-400">Nature of Call</p>
                                <p className="text-slate-100 font-semibold">{emergencyType}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dispatch Status & Logs */}
                    <div className="bg-slate-800 p-4 rounded-md border border-slate-700 flex-grow flex flex-col min-h-0">
                        <h3 className="text-md font-bold text-slate-200 border-b border-slate-600 pb-2 mb-3">DISPATCH STATUS</h3>
                        {status.unit ? (
                             <div className="grid grid-cols-4 items-center gap-2 text-center py-2 divide-x divide-slate-700">
                                <div className="flex flex-col justify-center px-1">
                                    <p className="text-xs text-slate-400">UNIT</p>
                                    <p className="text-md font-bold text-slate-100 truncate" title={status.unit.id}>{status.unit.id}</p>
                                    <p className="text-xs text-indigo-400">{status.unit.type}</p>
                                </div>
                                <div className="flex flex-col justify-center px-1">
                                    <p className="text-xs text-slate-400">DISTANCE</p>
                                    <p className="text-3xl font-bold text-slate-100">
                                        {status.distance !== undefined ? status.distance.toFixed(1) : '--'}
                                        <span className="text-lg ml-1">km</span>
                                    </p>
                                </div>
                                <div className="flex flex-col justify-center h-full items-center px-1">
                                    <p className="text-xs text-slate-400">STATUS</p>
                                    <span className={`mt-1 inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                                        {statusInfo.text}
                                    </span>
                                </div>
                                <div className="flex flex-col justify-center px-1">
                                    <p className="text-xs text-slate-400">ETA</p>
                                    <p className={`text-4xl font-bold ${getEtaColor()}`}>
                                        {status.eta !== null ? `${status.eta}` : '--'}
                                        <span className="text-xl ml-1">min</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                           (() => {
                                const simulationFailed = status.status === null && status.logs.some(log => log.message.includes('SEARCH COMPLETE'));
                                if (simulationFailed) {
                                    return (
                                        <div className="flex items-center justify-center py-10 text-center text-red-400">
                                            <p>No units available within the dispatch radius.</p>
                                        </div>
                                    );
                                }
                                return (
                                   <div className="flex items-center justify-center py-10">
                                       <Spinner />
                                       <p className="ml-4 text-slate-400">Searching for units...</p>
                                   </div>
                                );
                           })()
                        )}
                        
                        <div className="mt-2 border-t border-slate-600 pt-3 flex-grow flex flex-col min-h-0">
                            <h4 className="text-sm font-semibold text-slate-400 mb-2 flex-shrink-0">DISPATCH LOG</h4>
                            <div ref={logContainerRef} className="flex-grow space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                               {status.logs.map((log, i) => <LogItem key={i} log={log} style={{ animationDelay: `${i*30}ms`}} />)}
                            </div>
                        </div>
                    </div>
                     <button onClick={onClose} className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold py-3 rounded-lg transition-colors flex-shrink-0">
                        End Simulation
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EmergencyResponseModal;
