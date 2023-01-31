require('dotenv').config();
const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');
const { getCustomerId } = require('../util');
const Customer = require('../models/Customer');
const Connect = require('../models/Connect');

router.get('/', (req, res) => {
  res.json({
    message: 'stripe is working',
  });
});

router.get('/get_publishable_key', async (req, res) =>{
  res.send({
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
  })}
);

/**
 * https://stripe.com/docs/payments/save-and-reuse?platform=react-native&ui=payment-sheet
 */
router.post('/payment-sheet', async (req, res) => {
    try {
      const customerId = await getCustomerId(req.body);
      const ephemeralKey = await stripe.ephemeralKeys.create(
          { customer: customerId},
          { apiVersion: '2022-11-15' }
          );

      const setupIntent = await stripe.setupIntents.create({ 
          customer: customerId,
          payment_method_types: ['card'],
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

router.post('/payment-sheet-test-pay', async (req, res) => {
  // Use an existing Customer ID if this is a returning customer.
  const ephemeralKey = await stripe.ephemeralKeys.create(
    {customer: 'cus_NEdNzG60FHGV2Y'},
    {apiVersion: '2022-11-15'}
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1099,
    currency: 'eur',
    customer: 'cus_NEdNzG60FHGV2Y',
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.send({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: 'cus_NEdNzG60FHGV2Y',
  });
});

// router.get('/express-accounts', async(req, res) => {
//   const account = await stripe.accounts.create({ type: 'express' });
//   res.json({ account });
// });

router.post('/pay-trip', async(req, res) => {
  const {phone, amount, dev_id: devId} = req.body;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const customer = await Customer.findOne({phone, stripePublishableKey});

  if( !customer) return res.send({error: 'No user found'})

  const customerId = customer.id;

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  if( paymentMethods.length == 0) return res.send({error: 'No card found'})

  const connectAccount = await Connect.findOne({devId, stripePublishableKey});
  if(!connectAccount) return res.send({error: 'No connect account found'})

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      customer: customerId,
      payment_method: paymentMethods.data[0].id,
      off_session: true,
      confirm: true,
      application_fee_amount: parseInt(amount * 0.015),
      transfer_data: {
        destination: connectAccount.id,
      },
    });

    const loginLink = await stripe.accounts.createLoginLink(connectAccount.id);

    return res.send({paymentIntent, loginLink});
} catch (err) {
  logger.error('Error code is: ', err);
  // const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
  // logger.error('PI retrieved: ', paymentIntentRetrieved.id);
  return res.send({error: 'api error'})
}
});

router.post('/checkout', async(req, res) => {
  const {phone, unit_amount: unitAmount, dev_id: devId} = req.body;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  const customer = await Customer.findOne({phone, stripePublishableKey});

  if(!customer) return res.send({error: 'No user found'})

  const connectAccount = await Connect.findOne({devId, stripePublishableKey});
  if(!connectAccount) return res.send({error: 'No connect account found'})
  

  // CREATE PRODUCT
  const product = await stripe.products.create({
    name: 'test-taximeter',
  });

  // CREATE PRICE
  const price = await stripe.prices.create({
    unit_amount: unitAmount,
    currency: 'eur',
    product: product.id,
  });

  const session = await stripe.checkout.sessions.create({
    success_url: 'https://example.com/success',
    line_items: [
      {price: price.id, quantity: 1},
    ],
    mode: 'payment',
    customer: customer.id,
    payment_intent_data: {
      setup_future_usage: 'on_session',
      transfer_data:{
        destination: connectAccount.id,
        amount: parseInt(unitAmount * 0.985)
      }
    }
  });

  return res.send({
    session
  })
});

router.post('/payout-test', async (req, res) => {
  const {amount, description_phone} = req.body;
  const customer = await Customer.find({phone: description_phone, stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,});
  if(customer.length == 0) return res.send({error: 'No customer found'});

  try{
    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: "eur",
      destination: customer[0].id,
    });
    
    return res.send({transfer})
  } catch(e){
    res.send({error: e})
  }
});



router.get('/:id', async (req, res) => {
  const customerId = req.params.id;
  const customer = await stripe.customers.retrieve(customerId);
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  res.send({customer, paymentMethods})
});

module.exports = router;
