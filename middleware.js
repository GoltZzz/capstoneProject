const { locationSchema } = require("./schemas");
const Location = require("./models/sfas");
const User = require("./models/user");
const ExpressError = require("./utils/ExpressError");
const BaseJoi = require("joi");
const sanitizeHtml = require("sanitize-html");

const extension = (joi) => ({
	type: "string",
	base: joi.string(),
	messages: {
		"string.escapeHTML": "{{#label}} must not include HTML!",
	},
	rules: {
		escapeHTML: {
			validate(value, helpers) {
				const clean = sanitizeHtml(value, {
					allowedTags: [],
					allowedAttributes: {},
				});
				if (clean !== value)
					return helpers.error("string.escapeHTML", { value });
				return clean;
			},
		},
	},
});

const Joi = BaseJoi.extend(extension);

module.exports.isLoggedIn = (req, res, next) => {
	if (!req.isAuthenticated()) {
		req.session.returnTo = req.originalUrl;
		req.flash("error", "You must be logged in to do that");
		return res.redirect("/login");
	}
	next();
};

module.exports.validateLocation = (req, res, next) => {
	const locationSchema = Joi.object({
		title: Joi.string().optional().escapeHTML(),
		location: Joi.string().optional().escapeHTML(),
		description: Joi.string().optional().escapeHTML(),
		deleteImages: Joi.array(),
		lng: Joi.number().required(),
		lat: Joi.number().required(),
		_id: Joi.string(),
	});

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

module.exports.isAdmin = (req, res, next) => {
	if (!req.user.isAdmin) {
		req.flash("error", "You do not have permission to access this page");
		return res.redirect("/");
	}
	next();
};
