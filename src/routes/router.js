const stripeRouter = require('./stripe.router');
const stripeConnectRouter = require('./stripe-connect.router');
const router = require('express').Router();

router.get('/', async(req, res) => {
    res.send('Server is running...');
});

router.post('/form-data', async(req, res) => {
    const body = req.body;
    res.send({body});
});


router.use('/stripe', stripeRouter);
router.use('/stripe/connect', stripeConnectRouter);

module.exports = router;