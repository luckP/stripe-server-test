require('dotenv').config();
const router = require('express').Router();
const Customer = require('../models/Customer');
const Connect = require('../models/Connect');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');
const {getConnectUserId} = require('../util');

router.post('/account-links-create', async (req, res) => {
  const {nif: nif, iban} = req.body;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  let connect = await Connect.findOne({nif, stripePublishableKey});
  if(connect){
    const loginLink = await createLoginLinkById(connect.id);
    if(loginLink) return res.send({loginLink});
    await stripeAccountDelete(connect.id)
  }

  connect = await createAccount(req.body)
  return createAccountLinks(connect.id, res);
});

router.get('/account-create-login-link/:id', async (req, res) => {
  const id = req.params.id;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  let connect = await Connect.findOne({id, stripePublishableKey});
  if(connect){
    const loginLink = await createLoginLinkById(connect.id);
    if(loginLink) return res.send({loginLink});
    
    // CANT CREATE LINK
    const connectAccount = await createAccount({nif: connect.nif, iban: connect.iban})
    await stripeAccountDelete(id);
    connect.id = connectAccount.id;
    connect.save();
    return createAccountLinks(connect.id, res);
  }
  
  connect = await createAccount({id})
  return createAccountLinks(connect.id, res);
});

// router.post('/test-checkout-session', async (req, res) => {
//   const {unit_amount, phone, client_phone} = req.body;
  
//   // CREATE PRODUCT
//   const product = await stripe.products.create({
//     name: 'test-taximeter',
//   });

//   // CREATE PRICE
//   const price = await stripe.prices.create({
//     unit_amount: unit_amount,
//     currency: 'eur',
//     product: product.id,
//   });

//   // SELECT CONNECTED ACCOUNT;
//   const connectAccount = await Customer.find({phone});

//   const customer = await Customer.find({phone: client_phone});
//   console.log(customer)

//   const paymentIntents = await stripe.paymentIntents.create({
//     customer: customer.id,
//     setup_future_usage: 'off_session',
//     amount: unit_amount,
//     currency: 'eur',
//     automatic_payment_methods: {
//       enabled: true,
//     },
//     payment_method_types: ['card'],
//     application_fee_amount: unit_amount * 0.15,
//     transfer_data: {
//       destination: connectAccount[0].id,
//     },
//   });

//   res.send({paymentIntents})
// })

router.post('/', async (req, res) => {
  res.send('post');
});

router.get('/', async (req, res) => {
  res.send(`get`);
});

router.get('/:id', async (req, res) => {
  res.send(`get ${JSON.stringify(req.params)}`);
});

router.patch('/', async (req, res) => {
  res.send('patch');
});

router.delete('/', async (req, res) => {
  await Connect.deleteMany({});
  let accounts = await stripe.accounts.list({ limit: 100 });
  const deletedAccounts = {}
  while(accounts.data.length > 0) {
    for(let {id} of accounts.data){
      try{
        const deleted = await stripe.accounts.del( id );
        deletedAccounts[id] = true;
      }
      catch(err) {
        deletedAccounts[id] = false;
        logger.error(err)
      }
    }
    accounts = await stripe.accounts.list({ limit: 100 });
  }

  res.send(deletedAccounts)
});

// UTILS
async function createLoginLinkById(id){
    try{
      const loginLink = await stripe.accounts.createLoginLink(id);
      return loginLink;
    }
    catch(e){
      logger.error({function: 'createLoginLinkById', error: e})
    }

    return null;
}

// async function createLoginLink(id){
//   try{
//     const loginLink = await stripe.accounts.createLoginLink(id);
//     return loginLink;
//   }
//   catch(e){
//     logger.error(e);
//     throw "Error when try to create Login Link";
//   }
// }

async function createAccount({nif, iban}){
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const stripeAccount = await stripeAccountsCreate({nif, iban});
  const connect = new Connect({
    stripePublishableKey,
    nif,
    iban,
    id: stripeAccount.id,
  })
  
  connect.save();
  return connect;
}

async function stripeAccountsCreate({nif, iban}){

  const type = 'express';
  const country = 'PT';
  const business_type = 'individual';
  const business_profile = {
    url: 'https://www.geolink.pt',
    mcc: '4121'
  };
  const capabilities = {
      card_payments: { requested: true },
      transfers: { requested: true },
    };
  const external_account = {
        "object": 'bank_account',
        "country": 'PT',
        "currency": 'eur',
        "account_number": iban
    }
  const metadata = {nif, iban}

  try{
    const stripeAccount = await stripe.accounts.create({
      type,
      country,
      business_type,
      business_profile,
      business_type,
      capabilities,
      metadata,
      external_account
    });
    logger.debug('Created Stripe account: ' + JSON.stringify(stripeAccount))

    return stripeAccount;
  }
  catch(e){
    logger.error({'function': stripeAccountsCreate,
    error: e})
  }
}

async function stripeAccountDelete(id){
  try{
    const deleted = await stripe.accounts.del( id );
    return deleted;
  }
  catch(e){
    logger.error({function: 'stripeAccountDelete', error: e})
  }
}

async function createAccountLinks(id, res){
  try {
    const loginLink = await stripe.accountLinks.create({
      account: id,
      refresh_url: `http://localhost:5500/pages/account-create-login-link/?id=${id}`,
      return_url: `http://localhost:5500/pages/account-create-login-link/?id=${id}`,
      type: 'account_onboarding',
    });
    res.send({ loginLink, id });
  } catch (e) {
    logger.error(e);
    res.send(`error: ${e}`);
  }
}

async function getConnectAccountById(id){
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const connect = Connect.findOne({ id, stripePublishableKey});
  if(!connect){
    logger.error({function: 'recreateStripeAccount', error: `No connect account found with id ${id} in the database`})
    return null;
  }

  return connect;
}

module.exports = router;
