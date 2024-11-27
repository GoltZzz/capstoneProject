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
		console.log('Starting location creation...');
		const location = new Location(req.body);
		
		console.log('Setting geometry...');
		// Set the geometry directly from the coordinates
		location.geometry = {
			type: "Point",
			coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
		};

		console.log('Processing images...');
		location.images = req.files.map((f) => ({
			url: f.path,
			filename: f.filename,
		}));
		location.owner = req.user._id;
		
		console.log('Saving location...');
		await location.save();
		console.log('Location saved successfully:', location);
		
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
	const location = await Location.findById(id).populate("owner");
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
	try {
        console.log('Starting location edit...');
        const { id } = req.params;

        const notifications = await Notification.find({ isAdmin: true }).populate(
            "location"
        );

        console.log('Finding location...');
        const location = await Location.findById(id);

        if (!location) {
            req.flash("error", "Location not found");
            return res.redirect("/sfas");
        }

        console.log('Updating basic fields...');
        // Merge existing location data with new data
        location.title = req.body.title || location.title;
        location.description = req.body.description || location.description;

        // Update coordinates if provided
        if (req.body.lng && req.body.lat) {
            console.log('Updating coordinates...');
            location.geometry = {
                type: "Point",
                coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
            };
            location.location = req.body.location;
        }

        // Handle image uploads
        if (req.files && req.files.length > 0) {
            console.log('Processing new images...');
            const imgs = req.files.map((f) => ({
                url: f.path,
                filename: f.filename,
            }));
            location.images.push(...imgs);
        }

        // Handle image deletion
        if (req.body.deleteImages) {
            console.log('Deleting images...');
            for (let filename of req.body.deleteImages) {
                try {
                    await cloudinary.uploader.destroy(filename);
                } catch (err) {
                    console.error('Error deleting image from Cloudinary:', err);
                }
            }
            await location.updateOne({
                $pull: {
                    images: { filename: { $in: req.body.deleteImages } },
                },
            });
        }

        console.log('Saving location...');
        await location.save();

        console.log('Update complete!');
        req.flash("success", "Successfully Updated Device Location!");
        res.redirect(`/sfas/${location._id}`);
    } catch (err) {
        console.error('Error in editLocation:', err);
        req.flash("error", "Error updating location: " + err.message);
        res.redirect(`/sfas/${req.params.id}`);
    }
};

module.exports.deleteLocation = async (req, res) => {
	const { id } = req.params;
	await Location.findByIdAndDelete(id);
	req.flash("success", "Successfully Deleted Device Location!");
	res.redirect("/sfas");
};
