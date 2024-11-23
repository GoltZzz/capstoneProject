const Location = require("../models/sfas");
const { cloudinary } = require("../cloudinary");
const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;

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
		const locations = await Location.find({});
		res.render("device/index", { locations });
	}
};

module.exports.renderForm = (req, res) => {
	res.render("device/new");
};

module.exports.createLocation = async (req, res) => {
	const geoData = await maptilerClient.geocoding.forward(req.body.location, {
		limit: 1,
	});
	if (!geoData || !geoData.features || geoData.features.length === 0) {
		req.flash("error", "Unable to find location. Please try again.");
		return res.redirect("/sfas/new");
	}
	const location = new Location(req.body);
	location.geometry = geoData.features[0].geometry;
	location.images = req.files.map((f) => ({
		url: f.path,
		filename: f.filename,
	}));
	location.owner = req.user._id;
	await location.save();
	console.log(location);
	req.flash("success", "New Device Location Added!");
	res.redirect(`/sfas/${location._id}`);
};

module.exports.showDevices = async (req, res) => {
	const { id } = req.params;
	const location = await Location.findById(id)
		.populate({ path: "reviews", populate: { path: "owner" } })
		.populate("owner");
	console.log(location);
	if (!location) {
		req.flash("error", "Device Location Not Found!");
		return res.redirect("/sfas");
	}
	res.render("device/show", { location });
};

module.exports.renderEditLocation = async (req, res) => {
	const { id } = req.params;
	const location = await Location.findById(id);
	if (!location) {
		req.flash("error", "Device Location Not Found!");
		return res.redirect("/sfas");
	}
	res.render("device/edit", { location });
};

module.exports.editLocation = async (req, res) => {
	const { id } = req.params;
	console.log(req.body);
	const geoData = await maptilerClient.geocoding.forward(req.body.location, {
		limit: 1,
	});
	location.geometry = geoData.features[0].geometry;
	console.log(geoData);
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
	res.redirect(`/sfas/${location._id}`);
};

module.exports.deleteLocation = async (req, res) => {
	const { id } = req.params;
	await Location.findByIdAndDelete(id);
	req.flash("success", "Successfully Deleted Device Location!");
	res.redirect("/sfas");
};
