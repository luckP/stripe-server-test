require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Customer = require('../models/Customer');
const Connect = require('../models/Connect');
const logger = require('../config/logger');

// UTILS
const getCustomerId = async ({ phone, email, name }) => {
  try {
    const customers = await Customer.find({
      phone,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });

    if (customers.length) return customers[0].id;

    const stripeCustomer = await stripe.customers.create({
      description: 'taxi-link customer',
      email: email || '',
      name: name || '',
      phone: phone,
    });
    const customer = new Customer({
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
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

const getConnectUserId = async ({ phone, email, dev_id: devId }) => {
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  try {
    const connect = await Connect.find({ 
      devId,
      stripePublishableKey,
    });

    if (connect.length) return connect[0].id;

    const stripeAccount = await stripe.accounts.create({
      type: 'express',
      country: 'PT',
      email: email,
      business_type: 'individual',
      business_profile: {url: 'https://www.geolink.pt'},
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },

      metadata: {
        devId,
        phone
      }
    });

    const newConnect = new Connect({
      stripePublishableKey,
      phone,
      email,
      devId,
      id: stripeAccount.id,
    });

    await newConnect.save();

    logger.log('debug', {
      message: `New account created`,
      connect: newConnect,
    });

    return newConnect.id;
  } catch (err) {
    logger.error(err)
    throw err;
  }
};

module.exports = {
  getCustomerId,
  getConnectUserId,
};
