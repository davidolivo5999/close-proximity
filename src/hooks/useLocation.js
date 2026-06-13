import { useState, useCallback } from "react";

export function useUserLocation(privacyZones = []) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insideZone, setInsideZone] = useState(null); // zone name if blocked

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Check if inside any privacy zone
        const blocked = privacyZones.find((zone) => {
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
      },
      () => {
        setError("Please enable location access to discover nearby people");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [privacyZones]);

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