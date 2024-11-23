const mongoose = require("mongoose");
const Location = require("../models/sfas");
const cities = require("./cities");
const { places, descriptors } = require("./seedHelpers");

mongoose
	.connect("mongodb://127.0.0.1:27017/sfas")
	.then(() => {
		console.log("MONGO Connection Open!!!");
	})
	.catch((err) => {
		console.log("OH NO MONGO CONNECTION ERROR!!!");
		console.log(err);
	});

const sample = (array) => array[Math.floor(Math.random() * array.length)];

const seedDB = async () => {
	await Location.deleteMany({});
	for (let i = 0; i < 10; i++) {
		const random5 = Math.floor(Math.random() * 5);
		const location = new Location({
			owner: "67190d0c0fcf9c6c8e8d0b40",
			location: `${cities[random5].city}, ${cities[random5].island}`,
			title: `${sample(descriptors)} ${sample(places)}`,
			geometry: {
				type: "Point",
				coordinates: [cities[random5].longtitude, cities[random5].latitude],
			},
			description:
				"Lorem ipsum dolor sit amet consectetur adipisicing elit. Officiis, dolor.",
			images: [
				{
					url: "https://res.cloudinary.com/dp3zv0db3/image/upload/v1730571113/Sfas/k1vdfppliobkbkqvnbay.png",
					filename: "Sfas/k1vdfppliobkbkqvnbay",
				},
				{
					url: "https://res.cloudinary.com/dp3zv0db3/image/upload/v1730571113/Sfas/ljoe2kwjnvgkteozoidl.png",
					filename: "Sfas/ljoe2kwjnvgkteozoidl",
				},
			],
		});
		await location.save();
	}
};

seedDB().then(() => {
	mongoose.connection.close();
});
