const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const avatarSchema = new Schema({
	url: String,
	filename: String,
});

avatarSchema.virtual("thumbnail").get(function () {
	return this.url.replace("/upload", "/upload/w_300");
});

const userSchema = new Schema({
	email: {
		type: String,
		required: true,
		unique: true,
	},
	avatars: [avatarSchema],
	firstName: String,
	lastName: String,
	isAdmin: {
		type: Boolean,
		default: false,
	},
	locations: [
		{
			type: Schema.Types.ObjectId,
			ref: "Location",
		},
	],
	notifications: [
		{
			type: Schema.Types.ObjectId,
			ref: "Notification",
		},
	],
});
userSchema.statics.countAll = async function () {
	return await this.countDocuments();
};
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
