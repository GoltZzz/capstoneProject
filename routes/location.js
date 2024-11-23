const express = require("express");
const router = express.Router();
const Location = require("../models/sfas");
const location = require("../controllers/location");
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn, validateLocation, isOwner } = require("../middleware");
const multer = require("multer");
const { storage } = require("../cloudinary");
const upload = multer({ storage });

router
	.route("/")
	.get(isLoggedIn, catchAsync(location.index))
	.post(
		isLoggedIn,
		upload.array("image"),
		validateLocation,
		catchAsync(location.createLocation)
	);

router.get("/new", isLoggedIn, location.renderForm);

router
	.route("/:id")
	.get(catchAsync(location.showDevices))
	.put(
		isLoggedIn,
		isOwner,
		upload.array("image"),
		validateLocation,
		catchAsync(location.editLocation)
	)
	.delete(isLoggedIn, isOwner, catchAsync(location.deleteLocation));

router.get(
	"/:id/edit",
	isLoggedIn,
	isOwner,
	catchAsync(location.renderEditLocation)
);

module.exports = router;
