const Location = require("../models/sfas");
const Review = require("../models/review");
module.exports.createReview = async (req, res, next) => {
	const { id } = req.params;
	const location = await Location.findById(id);
	const review = new Review(req.body);
	review.owner = req.user._id;
	location.reviews.push(review);
	await review.save();
	await location.save();
	req.flash("success", "New Review Added");
	res.redirect(`/sfas/${location._id}`);
};

module.exports.deleteReview = async (req, res, next) => {
	const { id, reviewId } = req.params;
	await Location.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
	await Review.findByIdAndDelete(req.params.reviewId);
	req.flash("success", "Successfully Deleted Review");
	res.redirect(`/sfas/${id}`);
};
