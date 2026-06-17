import { useState, useCallback, useEffect, useRef } from "react";

export function useUserLocation(privacyZones = []) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insideZone, setInsideZone] = useState(null);

  const privacyZonesRef = useRef(privacyZones);
  useEffect(() => { privacyZonesRef.current = privacyZones; }, [privacyZones]);

  const watchIdRef = useRef(null);

  const handlePosition = useCallback((position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const blocked = privacyZonesRef.current.find((zone) => {
      const distM = calculateDistance(lat, lon, zone.latitude, zone.longitude) * 1000;
      return distM <= zone.radius_m;
    });

    if (blocked) {
      setInsideZone(blocked.name);
      setLocation(null);
    } else {
      setInsideZone(null);
      setLocation({ latitude: lat, longitude: lon });
    }
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err) => {
    console.error("Geolocation error:", err?.code, err?.message);
    setError("Please enable location access to discover nearby people");
    setLoading(false);
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Clear any existing watch before starting a new one
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setLoading(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [handlePosition, handleError]);

  const requestLocation = useCallback(() => {
    startWatch();
  }, [startWatch]);

  // Start watching on mount if previously granted, clean up on unmount
  useEffect(() => {
    // Always try — browser will use cached permission on repeat visits (no second prompt)
    startWatch();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return { location, error, loading, insideZone, requestLocation };
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}