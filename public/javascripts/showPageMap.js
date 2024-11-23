maptilersdk.config.apiKey = maptilerApiKey;

const map = new maptilersdk.Map({
	container: "map",
	style: maptilersdk.MapStyle.BRIGHT,
	center: locations.geometry.coordinates, // starting position [lng, lat]
	zoom: 15, // starting zoom
});

new maptilersdk.Marker()
	.setLngLat(locations.geometry.coordinates)
	.setPopup(
		new maptilersdk.Popup({ offset: 25 }).setHTML(
			`<h3>${locations.title}</h3><p>${locations.location}</p>`
		)
	)
	.addTo(map);
