require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const router = require('./routes/router')
const logger = require('./config/logger');

const os = require("os");
const formData = require("express-form-data");


const app = express();


/**
 * Options are the same as multiparty takes.
 * But there is a new option "autoClean" to clean all files in "uploadDir" folder after the response.
 * By default, it is "false".
 */
const options = {
  uploadDir: os.tmpdir(),
  autoClean: true
};

// CONNECT TO DATABASE
mongoose.set('strictQuery', false);
mongoose.connect(process.env.DB_CONNECTION, (err) => {
    if(err) logger.error(err)
    else logger.info(`connected to DB!`)
  }
);



// MIDDLEWARE
// app.use(express.json());
// parse data with connect-multiparty. 
app.use(formData.parse(options));
// delete from the request all empty files (size == 0)
app.use(formData.format());
app.use(cors());
app.use((req, res, next) => logger.loggerRequest(req, res, next));

// ROUTES
app.use('/', router);

// ERROR HANDLE
// process.on('uncaughtException', (err, origin) => {
//   logger.error({err, origin});
// });

app.listen(process.env.PORT, () =>
  logger.info(`Server running on port ${process.env.PORT}`)
);

