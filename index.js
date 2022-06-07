const express = require("express");
const bodyParser = require("body-parser");
var cors = require('cors');
const app = express();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(cors());
const mainRoutes = require("./routes/main");
app.use(mainRoutes);

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`CORS-enabled web server is running in port ${PORT}`));

