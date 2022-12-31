require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const router = require('./routes/router')
const logger = require('./config/logger');

const app = express();

// CONNECT TO DATABASE
mongoose.set('strictQuery', false);
mongoose.connect(process.env.DB_CONNECTION, () =>
  logger.info(`connected to DB!`)
);

// MIDDLEWARE
app.use(express.json());
app.use(cors());
app.use((req, res, next) => logger.loggerRequest(req, res, next));

// ROUTES
app.use('/', router);

app.listen(process.env.PORT, () =>
  logger.info(`Server running on port ${process.env.PORT}`)
);

