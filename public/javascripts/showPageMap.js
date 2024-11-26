mapboxgl.accessToken = mapToken;
const map = new mapboxgl.Map({
	container: "map",
	style: "mapbox://styles/mapbox/streets-v12",
	projection: "globe",
	center: locations.geometry.coordinates,
	zoom: 10,
});

new mapboxgl.Marker()
	.setLngLat(locations.geometry.coordinates)
	.setPopup(
		new mapboxgl.Popup({ offset: 25 }).setHTML(
			`<h3>${locations.title}</h3><p>${locations.location}</p>`
		)
	)
	.addTo(map);

map.addControl(new mapboxgl.NavigationControl());
map.addControl(
	new mapboxgl.GeolocateControl({
		positionOptions: {
			enableHighAccuracy: true,
		},
		// When active the map will receive updates to the device's location as it changes.
		trackUserLocation: true,
		// Draw an arrow next to the location dot to indicate which direction the device is heading.
		showUserHeading: true,
	})
);
