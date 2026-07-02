import { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { FormInputField } from './form/FormInputField';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { messages } from '../../messages/messages';
import { messages as sharedMessages } from '@hermyx/shared';

// Main component
export const Map = ({
  onLocationSelected,
  initialLocation,
  readOnly = false,
  description,
}) => {
  const [pin, setPin] = useState(initialLocation || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState(
    initialLocation || { lat: 40.4168, lng: -3.7038 },
  );
  const [errors, setErrors] = useState('');

  // Logic for cleaning errors in fields when modifications are done
  const [clearedFields, setClearedFields] = useState({});

  const handleMapClick = (coords) => {
    if (readOnly) return;
    setPin(coords);
    setMapCenter(coords);
    if (onLocationSelected) onLocationSelected(coords);
  };

  const { mutate, isError, error, isPending } = useMutation({
    mutationFn: async (queryText) => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&limit=1`,
      );
      if (!response.ok) throw new Error(messages.MAP.MAP_SERVICE_ERROR);
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };

        setMapCenter(coords);
        setPin(coords);
        if (onLocationSelected) onLocationSelected(coords);
      } else {
        setErrors(new Error(messages.MAP.LOCATION_NOT_FOUND));
      }
    },
    onError: (error) => {
      setErrors(new Error(error));
    },
    onSettled: () => {
      setClearedFields({});
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setErrors(new Error(sharedMessages.FIELD_REQUIRED));
      setClearedFields({});
      return;
    }
    mutate(searchQuery);
  };

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
    setErrors();
  };

  return (
    <div className='w-full space-y-4'>
      {!readOnly && (
        <form
          onSubmit={handleSearch}
          noValidate
          className='flex items-center space-x-2'
        >
          <FormInputField
            id='mapLocation'
            label='Location:'
            description={description}
            error={!clearedFields.location && (errors?.message || error)}
            invalid={!clearedFields.location && (isError || !!errors)}
            type='text'
            name='location'
            defaultValue={searchQuery}
            autoComplete='off'
            required
            aria-invalid={!clearedFields.location && (isError || !!errors)}
            disabled={isPending}
            onChange={(e) => {
              handleFieldChange(e);
              setSearchQuery(e.target.value); // Text is saved
            }}
          />
          <Button
            type='submit'
            disabled={isPending}
            className='relative -top-2.5'
          >
            {isPending ? 'Searching...' : 'Search'}
          </Button>
        </form>
      )}

      <div className='w-full h-100 rounded-lg overflow-hidden border border-gray-300 z-0'>
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={13}
          className='w-full h-full'
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />

          <MapController center={mapCenter} />
          <MapClickHandler onMapClick={handleMapClick} />

          {pin && (
            <>
              <Circle
                center={[pin.lat, pin.lng]}
                radius={300}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
              <Marker position={[pin.lat, pin.lng]} icon={customIcon} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

// Animated pint with Tailwind
const customIcon = L.divIcon({
  html: `<span class="flex h-6 w-6 relative justify-center items-center">
           <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span class="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white shadow-lg"></span>
         </span>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component that moves the camera when searching (is a fly to action)
const MapController = ({ center }) => {
  const map = useMap();
  if (center) {
    map.flyTo([center.lat, center.lng], 14, { animate: true, duration: 1.5 });
  }
  return null;
};

// Component that captures user clicks
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (event) => {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
};
