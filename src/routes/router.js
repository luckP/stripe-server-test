const stripeRouter = require('./stripe.router');


const router = require('express').Router();

router.use('/stripe', stripeRouter);


// You can require and use your routes here ;)


module.exports = router;