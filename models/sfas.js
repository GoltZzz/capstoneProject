const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const imageSchema = new Schema({
	url: String,
	filename: String,
});

imageSchema.virtual("thumbnail").get(function () {
	return this.url.replace("/upload", "/upload/w_200");
});

const opts = { toJSON: { virtuals: true } };

const locationSchema = new Schema(
	{
		title: String,
		images: [imageSchema],
		geometry: {
			type: {
				type: String,
				enum: ["Point"],
				required: true,
			},
			coordinates: {
				type: [Number],
				required: true,
			},
		},
		description: String,
		location: String,
		owner: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	opts
);

locationSchema.virtual("properties.popUpMarkup").get(function () {
	return `
    <strong><a href="/sfas/${this._id}">${this.title}</a></strong>
    <p>${this.description.substring(0, 20)}...</p>`;
});

module.exports = mongoose.model("Location", locationSchema);
