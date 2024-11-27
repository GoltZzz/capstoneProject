// Initialize map functionality
(function initializeMap() {
    // Validate Mapbox token
    if (!mapToken) {
        console.error('Mapbox token is not defined');
        return;
    }

    mapboxgl.accessToken = mapToken;

    // Validate map container exists
    const mapContainer = document.getElementById('location-map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    // Initialize the map
    console.log('Initializing map...');
    const map = new mapboxgl.Map({
        container: 'location-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [121.549072, 16.690014], // Default center (Philippines)
        zoom: 5
    });

    // Add map load event listener
    map.on('load', () => {
        console.log('Map loaded successfully');
    });

    // Add error event listener
    map.on('error', (e) => {
        console.error('Map error:', e.error);
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true,
            timeout: 10000 // 10 second timeout for geolocation
        },
        trackUserLocation: true,
        showUserHeading: true
    });
    map.addControl(geolocate);

    // Add marker
    let marker;

    // Function to fetch address with timeout and retry
    async function fetchAddressWithRetry(lngLat, retries = 2) {
        const timeout = 5000; // 5 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapToken}`,
                { signal: controller.signal }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                console.warn('Request timed out');
            }

            if (retries > 0) {
                console.log(`Retrying... ${retries} attempts left`);
                return await fetchAddressWithRetry(lngLat, retries - 1);
            }

            throw error;
        }
    }

    // Function to update form inputs with location data
    async function updateLocationInputs(lngLat, placeName = '') {
        try {
            console.log('Updating location inputs with:', lngLat);
            
            // Validate required DOM elements exist
            const lngInput = document.getElementById('lng');
            const latInput = document.getElementById('lat');
            const locationInput = document.getElementById('location');

            if (!lngInput || !latInput || !locationInput) {
                console.error('Required form inputs not found');
                return;
            }

            // Update coordinate inputs
            lngInput.value = lngLat.lng;
            latInput.value = lngLat.lat;
            
            // Show loading state
            locationInput.value = 'Finding address...';
            
            try {
                const data = await fetchAddressWithRetry(lngLat);
                
                if (!data.features || data.features.length === 0) {
                    console.warn('No address found for coordinates');
                    locationInput.value = `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
                    return;
                }

                const address = data.features[0].place_name;
                console.log('Address found:', address);
                locationInput.value = address;
            } catch (error) {
                console.error('Error getting address:', error);
                // Fallback to coordinates if address lookup fails
                locationInput.value = `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
            }
        } catch (error) {
            console.error('Error updating location inputs:', error);
        }
    }

    // Add click event to map
    map.on('click', (e) => {
        try {
            console.log('Map clicked at:', e.lngLat);
            const lngLat = e.lngLat;
            
            // Remove existing marker if it exists
            if (marker) {
                marker.remove();
            }
            
            // Create new marker
            marker = new mapboxgl.Marker({
                draggable: true,
                color: '#ff0000'
            })
            .setLngLat(lngLat)
            .addTo(map);
            
            // Update form inputs
            updateLocationInputs(lngLat);
            
            // Add drag end event to marker
            marker.on('dragend', () => {
                const lngLat = marker.getLngLat();
                console.log('Marker dragged to:', lngLat);
                updateLocationInputs(lngLat);
            });
        } catch (error) {
            console.error('Error handling map click:', error);
        }
    });

    // Handle geolocate events
    geolocate.on('geolocate', (position) => {
        console.log('User location found:', position);
        const lngLat = {
            lng: position.coords.longitude,
            lat: position.coords.latitude
        };
        updateLocationInputs(lngLat);
    });

    geolocate.on('error', (error) => {
        console.error('Geolocation error:', error);
    });

    // Trigger user location on load
    map.on('load', () => {
        try {
            geolocate.trigger();
        } catch (error) {
            console.error('Error triggering geolocation:', error);
        }
    });
})();
