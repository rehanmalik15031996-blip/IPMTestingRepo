import React, { useEffect, useRef } from 'react';

let googleMapsScriptPromise = null;

const loadGoogleMapsScript = (apiKey) => {
    if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key'));
    if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
    if (window.google?.maps?.places) return Promise.resolve(window.google);

    if (!googleMapsScriptPromise) {
        googleMapsScriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-google-maps="places"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.google));
                existing.addEventListener('error', reject);
                return;
            }
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.setAttribute('data-google-maps', 'places');
            script.onload = () => resolve(window.google);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    return googleMapsScriptPromise;
};

const GooglePlacesInput = ({ value, onChange, onPlaceSelected, placeholder, disabled, inputStyle, name }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);

    useEffect(() => {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (!apiKey || !inputRef.current) return;

        let listener = null;

        loadGoogleMapsScript(apiKey)
            .then((google) => {
                if (!inputRef.current || autocompleteRef.current) return;
                autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                    types: ['address'],
                    fields: ['formatted_address', 'address_components', 'name']
                });
                listener = autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current.getPlace();
                    const formatted = place?.formatted_address || place?.name || '';
                    if (formatted) onPlaceSelected(formatted, place);
                });
            })
            .catch(() => {
                // Silent fallback to manual input
            });

        return () => {
            if (listener) listener.remove();
        };
    }, [onPlaceSelected]);

    const handleBlur = () => {
        const currentValue = inputRef.current?.value?.trim();
        if (!currentValue || currentValue === value) return;
        if (currentValue.includes(',')) {
            onPlaceSelected(currentValue, null);
        }
    };

    return (
        <input
            ref={inputRef}
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            style={inputStyle}
            disabled={disabled}
            autoComplete="off"
            className="google-places-input"
        />
    );
};

export default GooglePlacesInput;
