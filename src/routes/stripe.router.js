require('dotenv').config();
const router = require('express').Router();
const Customer = require('../models/Customer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');

router.get('/', (req, res) => {
  // console.log(req)

  res.json({
    message: 'stripe is working',
  });
});

router.get('/get_publishable_key', async (req, res) =>
  res.json({
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
  })
);

router.post('/pay', async (req, res) => {
  try {
    const { name, amount } = req.body;
    if (!name) return res.status(400).json({ message: 'Please enter a name' });
    if (amount === undefined)
      return res.status(400).json({ message: 'Please enter a amount' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'EUR',
      payment_method_types: ['card'],
      metadata: { name },
    });

    const clientSecret = paymentIntent.client_secret;
    res.json({
      message: 'Payment initiated',
      clientSecret,
    });
  } catch (err) {
    logger.log('error', err);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

router.post('/payment-sheet', async (req, res) => {
    try {
        const customerId = await getCustomerId(req.body);
        const ephemeralKey = await stripe.ephemeralKeys.create(
            { customer: customerId},
            { apiVersion: '2022-11-15' }
            );
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
    });
    res.json({
      setupIntent: setupIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
    });
  } catch (err) {
    logger.log('error', err);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

// UTILS
const getCustomerId = async ({ phone }) => {
  try {
    const customers = await Customer.find({ phone });
    if (customers.length) return customers[0].id;

    const stripeCustomer = await stripe.customers.create();
    const customer = new Customer({
      phone,
      id: stripeCustomer.id,
    });
    await customer.save();

    logger.log('debug', {
      message: `New customer created`,
      status: customer,
    });

    return stripeCustomer.id;
  } catch (err) {
    throw err;
  }
};

module.exports = router;
