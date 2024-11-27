if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

const express = require("express");
const app = express();
const server = require('http').createServer(app);
const socket = require('./config/socket');
const io = socket.init(server);
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const ExpressMongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const { loadNotifications } = require("./middleware/notifications");
const MongoDBStore = require("connect-mongo")(session);
const dbUrl = "mongodb://127.0.0.1:27017/sfas"

// router.use
const locationRoutes = require("./routes/location");
const userRoutes = require("./routes/user");
const notificationRoutes = require("./routes/notification");
const apiRoutes = require("./routes/api");

mongoose
	.connect(dbUrl)
	.then(() => {
		console.log("MONGO Connection Open!!!");
	})
	.catch((err) => {
		console.log("OH NO MONGO CONNECTION ERROR!!!");
		console.log(err);
	});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(ExpressMongoSanitize({ replaceWith: "_" }));

// Increase timeout limit
app.use((req, res, next) => {
	req.setTimeout(300000); // 5 minutes
	res.setTimeout(300000);
	next();
});

const store = new MongoDBStore({
	url: dbUrl,
	secret: "thisshouldbeabettersecret!",
	touchAfter: 24 * 60 * 60,
})
store.on("error", function (e) {
	console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
	store,
	name: "session",
	secret: "thisshouldbeabettersecret!",
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true,
		// secure: true,
		expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
		maxAge: 1000 * 60 * 60 * 24 * 7,
	},
};

app.use(session(sessionConfig));
app.use(flash());

const scriptSrcUrls = [
	"https://stackpath.bootstrapcdn.com/",
	"https://api.tiles.mapbox.com/",
	"https://api.mapbox.com/",
	"https://kit.fontawesome.com/",
	"https://cdnjs.cloudflare.com/",
	"https://cdn.jsdelivr.net",
	"https://kit.fontawesome.com/",
	"https://ka-f.fontawesome.com/",
	"https://unpkg.com/",
];
const styleSrcUrls = [
	"https://kit-free.fontawesome.com/",
	"https://stackpath.bootstrapcdn.com/",
	"https://api.mapbox.com/",
	"https://api.tiles.mapbox.com/",
	"https://fonts.googleapis.com/",
	"https://use.fontawesome.com/",
	"https://cdn.jsdelivr.net",
	"https://ka-f.fontawesome.com/",
	"https://fonts.googleapis.com/",
	"https://unpkg.com/",
	"https://cdnjs.cloudflare.com/",
];
const connectSrcUrls = [
	"https://api.mapbox.com/",
	"https://a.tiles.mapbox.com/",
	"https://b.tiles.mapbox.com/",
	"https://events.mapbox.com/",
	"https://ka-f.fontawesome.com/",
	"https://unpkg.com/",
];
const fontSrcUrls = [
	"'self'",
	"https://ka-f.fontawesome.com/",
	"https://fonts.gstatic.com/",
	"https://use.fontawesome.com/",
	"https://kit.fontawesome.com/",
	"https://cdnjs.cloudflare.com/"
];
app.use(
	helmet.contentSecurityPolicy({
		directives: {
			defaultSrc: [],
			connectSrc: ["'self'", ...connectSrcUrls],
			scriptSrc: [
				"'unsafe-eval'",
				"'unsafe-inline'",
				"'self'",
				...scriptSrcUrls,
			],
			scriptSrcAttr: "'unsafe-inline'",
			styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
			workerSrc: ["'self'", "blob:"],
			objectSrc: [],
			imgSrc: [
				"'self'",
				"blob:",
				"data:",
				`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`,
				"https://images.unsplash.com/",
			],
			fontSrc: ["'self'", ...fontSrcUrls],
			mediaSrc: ["'self'"],  // Allow audio files from our domain
			childSrc: ["'self'", "blob:"]
		},
	})
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(loadNotifications);

app.use(async function (req, res, next) {
	res.locals.currentUser = req.user;

	if (req.user && req.user.isAdmin) {
		try {
			let user = await User.findById(req.user._id)
				.populate("notifications", null, { isRead: false })
				.exec();
			res.locals.notifications = user.notifications.reverse();
		} catch (err) {
			console.log(err.message);
		}
	}

	res.locals.success = req.flash("success");
	res.locals.error = req.flash("error");
	res.locals.path = req.originalUrl;
	next();
});

//register routes
app.use("/", userRoutes);
app.use("/sfas", locationRoutes);
app.use("/notifications", notificationRoutes);
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
	res.render("home");
});

app.all("*", (req, res, next) => {
	next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
	const { statusCode = 500 } = err;
	if (!err.message) err.message = "Oh No, Something Went Wrong!";
	res.status(statusCode).render("error", { err });
});

server.listen(3000, () => {
	console.log("Server running on port 3000");
});
