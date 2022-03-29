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


// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });git a

app.use(cors());
const mainRoutes = require("./routes/main");
app.use(mainRoutes);

const PORT = 9229;
app.listen(PORT, () => console.log(`CORS-enabled web server is running in port ${PORT}`));

