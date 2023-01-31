const { createLogger, transports, format } = require('winston');

const logger = createLogger({
  transports: [
    new transports.File({
      filename: 'log/error.log',
      level: 'error',
      format: format.combine(
        format.timestamp(),
        format.json(),
        format.printf((info) => `${info.timestamp} ${JSON.stringify(info)}`)
      ),
    }),
    new transports.Console({
      filename: 'log/info.log',
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.simple(),
        format.printf(
          (info) => `${info.timestamp} ${info.level} ${info.message}`
        )
      ),
    }),
    new transports.File({
      filename: 'log/debug.log',
      level: 'debug',
      format: format.combine(
        format.timestamp(),
        format.json(),
        format.printf(
          (info) => `${info.timestamp} ${info.level} ${JSON.stringify(info)}`
        )
      ),
    }),
  ],
});


// LOGGER MIDDLEWARE
logger.loggerRequest = (req, res, next) => {
  // INFO LEVEL
  logger.log('info', req.url);

  const oldEnd = res.end;
  res.end = function (chunk) {
    const body = chunk ? chunk.toString() : '';


    let resBody = '';
    try {
      resBody = JSON.parse(body);
    } catch (err) {
      resBody = body;
    } 

    const url = (req.baseUrl ? req.baseUrl : '') + (req.url || '');

    // DEBUG LEVEL
    logger.log('debug', {
      url: url,
      reqBody: req.body,
      res: resBody,
      status: this.statusCode,
    });

    oldEnd.apply(res, arguments);
  };

  next();
};

module.exports = logger;
