mapboxgl.accessToken = mapToken;
const map = new mapboxgl.Map({
	container: "map",
	style: "mapbox://styles/mapbox/streets-v12",
	projection: "globe",
	center: deviceLocation.geometry.coordinates,
	zoom: 18,
});

new mapboxgl.Marker()
	.setLngLat(deviceLocation.geometry.coordinates)
	.setPopup(
		new mapboxgl.Popup({ offset: 25 }).setHTML(
			`<h3>${deviceLocation.title}</h3><p>${deviceLocation.location}</p>`
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
