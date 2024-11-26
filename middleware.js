const { locationSchema, reviewSchema } = require("./schemas");
const Location = require("./models/sfas");
const Review = require("./models/review");
const User = require("./models/user");
const ExpressError = require("./utils/ExpressError");

module.exports.isLoggedIn = (req, res, next) => {
	if (!req.isAuthenticated()) {
		req.session.returnTo = req.originalUrl;
		req.flash("error", "You must be logged in to do that");
		return res.redirect("/login");
	}
	next();
};

module.exports.validateLocation = (req, res, next) => {
	const { error } = locationSchema.validate(req.body);
	if (error) {
		const msg = error.details.map((element) => element.message).join(",");
		throw new ExpressError(msg, 400);
	} else {
		next();
	}
};

module.exports.isOwner = async (req, res, next) => {
	const { id } = req.params;
	const location = await Location.findById(id);
	if (!location.owner.equals(req.user._id) && !req.user.isAdmin) {
		req.flash("error", "You do not have permission to do that!");
		return res.redirect(`/sfas/${id}`);
	}
	next();
};

// review middleware
module.exports.validateReview = (req, res, next) => {
	const { error } = reviewSchema.validate(req.body);
	if (error) {
		const msg = error.details.map((element) => element.message).join(",");
		throw new ExpressError(msg, 400);
	} else {
		next();
	}
};

module.exports.isReviewOwner = async (req, res, next) => {
	const { id, reviewId } = req.params;
	const review = await Review.findById(reviewId);
	if (!review.owner.equals(req.user._id)) {
		req.flash("error", "You do not have permission to do that!");
		return res.redirect(`/sfas/${id}`);
	}
	next();
};

module.exports.isAdmin = (req, res, next) => {
	if (!req.user.isAdmin) {
		req.flash("error", "You do not have permission to access this page");
		return res.redirect("/");
	}
	next();
};
