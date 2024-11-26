const Location = require("../models/sfas");
const Notification = require("../models/notifications");
const { cloudinary } = require("../cloudinary");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });

function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports.index = async (req, res) => {
	const { search } = req.query;
	if (search) {
		const regex = new RegExp(escapeRegex(search), "gi");
		const locations = await Location.find({ title: regex });
		if (locations.length < 1) {
			req.flash("error", "No Devices Found!");
			return res.redirect("/sfas");
		}
		res.render("device/index", { locations });
	} else {
		const notifications = await Notification.find({ isAdmin: true }).populate(
			"location"
		);
		const locations = await Location.find({});
		res.render("device/index", { locations, notifications });
	}
};

module.exports.renderForm = async (req, res) => {
	const notifications = await Notification.find({ isAdmin: true }).populate(
		"location"
	);
	res.render("device/new", { notifications });
};

module.exports.createLocation = async (req, res) => {
	try {
		const geoData = await geocoder
			.forwardGeocode({
				query: req.body.location,
				limit: 1,
			})
			.send();
		const location = new Location(req.body);
		location.geometry = geoData.body.features[0].geometry;
		location.images = req.files.map((f) => ({
			url: f.path,
			filename: f.filename,
		}));
		location.owner = req.user._id;
		await location.save();
		console.log(location);
		req.flash("success", "New Device Location Added!");
		res.redirect(`/sfas/${location._id}`);
	} catch (error) {
		console.error("Error adding location:", error);
		req.flash("error", "An error occurred while adding the location.");
		return res.redirect("/sfas/new");
	}
};

module.exports.showDevices = async (req, res) => {
	const { id } = req.params;
	const notifications = await Notification.find({ isAdmin: true }).populate(
		"location"
	);
	const location = await Location.findById(id)
		.populate({ path: "reviews", populate: { path: "owner" } })
		.populate("owner");
	console.log(location);
	if (!location) {
		req.flash("error", "Device Location Not Found!");
		return res.redirect("/sfas");
	}
	res.render("device/show", { location, notifications });
};

module.exports.renderEditLocation = async (req, res) => {
	const { id } = req.params;
	const notifications = await Notification.find({ isAdmin: true }).populate(
		"location"
	);
	const location = await Location.findById(id);
	if (!location) {
		req.flash("error", "Device Location Not Found!");
		return res.redirect("/sfas");
	}
	res.render("device/edit", { location, notifications });
};

module.exports.editLocation = async (req, res) => {
	const { id } = req.params;
	const notifications = await Notification.find({ isAdmin: true }).populate(
		"location"
	);
	const geoData = await maptilerClient.geocoding.forward(req.body.location, {
		limit: 1,
	});
	location.geometry = geoData.features[0].geometry;
	console.log(location.geometry);
	const imgs = req.files.map((f) => ({
		url: f.path,
		filename: f.filename,
	}));
	location.images.push(...imgs);
	await location.save();
	if (req.body.deleteImages) {
		for (let filename of req.body.deleteImages) {
			await cloudinary.uploader.destroy(filename);
		}
		await location.updateOne({
			$pull: {
				images: { filename: { $in: req.body.deleteImages } },
			},
		});
		console.log(location);
	}
	req.flash("success", "Successfully Updated Device Location!");
	res.redirect(`/sfas/${location._id}`, { notifications });
};

module.exports.deleteLocation = async (req, res) => {
	const { id } = req.params;
	await Location.findByIdAndDelete(id);
	req.flash("success", "Successfully Deleted Device Location!");
	res.redirect("/sfas");
};
