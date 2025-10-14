import { useState, useEffect } from 'react';

interface GeolocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  city: string | null;
  department: string | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<GeolocationData>({
    latitude: null,
    longitude: null,
    accuracy: null,
    city: null,
    department: null,
    error: null,
    loading: true,
  });

  const fetchCityAndDepartment = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const properties = data.features[0].properties;
        const city = properties.city || properties.village || properties.town || properties.municipality || 'Ville inconnue';
        const postcode = properties.postcode || '';
        const department = postcode.substring(0, 2);

        return { city, department };
      }

      return { city: 'Ville inconnue', department: '' };
    } catch (error) {
      console.error('Error fetching city and department:', error);
      return { city: 'Ville inconnue', department: '' };
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        accuracy: null,
        city: null,
        department: null,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const acc = position.coords.accuracy;

        const { city, department } = await fetchCityAndDepartment(lat, lon);

        setLocation({
          latitude: lat,
          longitude: lon,
          accuracy: acc,
          city,
          department,
          error: null,
          loading: false,
        });
      },
      (error) => {
        setLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          city: null,
          department: null,
          error: error.message,
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return location;
};
