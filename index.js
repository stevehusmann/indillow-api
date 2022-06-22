const express = require("express");
const bodyParser = require("body-parser");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
var cors = require('cors');
const app = express();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(passport.initialize());
app.use(cors());
const mainRoutes = require("./routes/main");
app.use(mainRoutes);

app.post(
  "/login",
  passport.authenticate("login", {
    successRedirect: "/success",
    failureRedirect: "/login",
    session: false,
  })
);

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Web server is running in port ${PORT}`));

passport.use(
  "login",
  new LocalStrategy((username, password, done) => {
    const authenticated = username === "John" && password === "Smith";

    if (authenticated) {
      return done(null, { myUser: "user", myID: 1234 });
    } else {
      return done(null, false);
    }
  })
);