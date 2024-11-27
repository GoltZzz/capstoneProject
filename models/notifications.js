const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
	name: String,
	email: String,
	message: String,
	isAdmin: {
		type: Boolean,
		default: false,
	},
	isRead: {
		type: Boolean,
		default: false,
	},
	sender: {
		type: Schema.Types.ObjectId,
		ref: "User",
	},
	location: {
		type: Schema.Types.ObjectId,
		ref: "Location",
	},
	timestamp: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Notification", notificationSchema);
