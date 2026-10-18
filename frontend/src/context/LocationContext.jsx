import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [coords, setCoords] = useState(() => {
    try {
      const saved = localStorage.getItem('mediresq_live_coords');
      return saved ? JSON.parse(saved) : { lat: 28.6139, lng: 77.2090, isLive: false };
    } catch {
      return { lat: 28.6139, lng: 77.2090, isLive: false };
    }
  });

  const [locationName, setLocationName] = useState('Acquiring live coordinates...');
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);

  // Function to capture live device coordinates
  const fetchLiveCoords = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by this browser.');
      setLocationName('GPS unavailable (using default coordinates)');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setLocLoading(true);
    setLocError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            isLive: true,
          };
          setCoords(newCoords);
          setLocationName(`Live GPS: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (±${Math.round(pos.coords.accuracy)}m)`);
          localStorage.setItem('mediresq_live_coords', JSON.stringify(newCoords));
          setLocLoading(false);
          resolve(newCoords);
        },
        (err) => {
          console.warn('[Location] GPS permission notice:', err.message);
          setLocError(err.message);
          // Fallback to Delhi default
          const fallback = { lat: 28.6139, lng: 77.2090, isLive: false };
          setCoords(fallback);
          setLocationName('GPS permission not granted (using fallback coordinates)');
          setLocLoading(false);
          resolve(fallback);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  // Automatically acquire live coordinates every time on mount
  useEffect(() => {
    fetchLiveCoords();
  }, [fetchLiveCoords]);

  return (
    <LocationContext.Provider
      value={{
        coords,
        locationName,
        locLoading,
        locError,
        fetchLiveCoords,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
