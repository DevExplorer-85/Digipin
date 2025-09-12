// FIX: Converted all interfaces to type aliases to resolve complex generic type resolution issues with the Supabase client.
export type Address = {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
}

export type Place = {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    boundingbox: string[];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
    icon?: string;
    address: Address;
    digiPin: string;
}

export type SelectedPlaceData = {
    digiPin: string;
    displayName: string;
    lat: string;
    lon: string;
    class?: string; // For landmark identification
    type?: string;  // For landmark identification
}

export type User = {
    id: string; // Supabase user ID
    email: string;
    name?: string;
    pictureUrl?: string;
    createdAt?: string; // Timestamp from Supabase
}

// FIX: Flattened SavedPin type to remove intersection, which can cause issues with Supabase type inference.
export type SavedPin = {
    digiPin: string;
    displayName: string;
    lat: string;
    lon: string;
    class?: string;
    type?: string;
    id: string; // Pin's own UUID from database
    user_id: string;
    created_at: string; // Timestamp from database
}

// --- Types for Emergency Response System ---

export type UnitType = 'Ambulance' | 'Fire Truck' | 'Police';

export type EmergencyCenter = {
    id:string;
    type: UnitType;
    lat: number;
    lon: number;
    station: string;
}

export type LogEntry = {
    timestamp: string;
    message: string;
    type: 'info' | 'route' | 'success' | 'warning';
}

export type UnitStatus = 'Dispatching' | 'En Route' | 'Rerouting' | 'On Scene';

// FIX: Added a standard `Json` type to correctly type JSONB columns in Supabase.
// Using a specific object type like `SelectedPlaceData` directly can cause
// the Supabase client's generic type inference to fail.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DispatchStatus = {
    unit: EmergencyCenter | null;
    eta: number | null;
    route: [number, number][];
    logs: LogEntry[];
    status: UnitStatus | null;
    distance?: number;
}

export type EmergencyIncident = {
    id: string;
    user_id: string;
    created_at: string;
    emergencyType: string;
    // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
    location: Json;
}

// FIX: Extracting inline object types into named types to help with TS resolution.
export type PersonalPlace = {
  user_id: string;
  // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
  home: Json | null;
  // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
  work: Json | null;
  updated_at: string;
};

// FIX: Extracting inline object types into named types to help with TS resolution.
export type Signup = {
  id: number;
  created_at: string;
  user_id: string;
  email: string;
};


// For typed Supabase client
// FIX: Renamed DbSchema to Database. Using a type alias for the schema is crucial for resolving Supabase client generic types.
export type Database = {
  public: {
    Tables: {
      pins: {
        Row: SavedPin;
        // FIX: The Insert type for `pins` is made explicit to fix a TypeScript resolution error with Supabase client generics.
        Insert: {
          digiPin: string;
          displayName: string;
          lat: string;
          lon: string;
          class?: string;
          type?: string;
          user_id: string;
        };
        // FIX: The Update type for `pins` is made explicit to avoid a circular reference that was breaking all table type resolutions.
        // FIX: Removed non-updatable fields like id, user_id, and created_at to correct type inference.
        Update: {
          digiPin?: string;
          displayName?: string;
          lat?: string;
          lon?: string;
          class?: string;
          type?: string;
        };
        // FIX: Add Relationships property to satisfy Supabase client's generic constraints, preventing type resolution failures.
        Relationships: [];
      };
      personal_places: {
        Row: PersonalPlace;
        // FIX: The Insert type for `personal_places` is defined to allow partial updates for `home` or `work`, which is how the `upsert` function is used.
        Insert: {
          user_id: string;
          // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
          home?: Json | null;
          // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
          work?: Json | null;
          updated_at: string;
        };
        // FIX: The Update type for `personal_places` is made explicit to avoid a circular reference to `DbSchema` while it is being defined. This was causing TS to fail resolving all table types.
        // FIX: Removed the primary key `user_id` as it should not be updatable.
        Update: {
          // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
          home?: Json | null;
          // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
          work?: Json | null;
          updated_at?: string;
        };
        // FIX: Add Relationships property to satisfy Supabase client's generic constraints, preventing type resolution failures.
        Relationships: [];
      };
      emergency_incidents: {
        Row: EmergencyIncident;
        // FIX: The Insert type for `emergency_incidents` is made explicit to fix a TypeScript resolution error with Supabase client generics.
        Insert: {
          user_id: string;
          emergencyType: string;
          // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
          location: Json;
        };
        // FIX: The Update type for `emergency_incidents` is made explicit to avoid a circular reference that was breaking all table type resolutions.
        // FIX: Removed non-updatable fields like id, user_id, and created_at to correct type inference.
        Update: {
          emergencyType?: string;
          // FIX: Switched from `SelectedPlaceData` to `Json` for Supabase compatibility.
          location?: Json;
        };
        // FIX: Add Relationships property to satisfy Supabase client's generic constraints, preventing type resolution failures.
        Relationships: [];
      };
      signups: {
        Row: Signup;
        Insert: {
          user_id: string;
          email: string;
        };
        // FIX: The Update type for `signups` is made explicit to avoid a circular reference that was breaking all table type resolutions.
        Update: {
          email?: string;
        };
        // FIX: Add Relationships property to satisfy Supabase client's generic constraints, preventing type resolution failures.
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
}