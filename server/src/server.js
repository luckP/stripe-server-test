require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

// MIDDLEWARE
app.use(express.json());
app.use(cors());

// START APP

app.get('/test', async(req, res) => res.json({message: 'server is running'}))

app.get('/get_publishable_key', async (req, res) =>
  res.json({
    publishable_key:
      'pk_test_51MJeGUEAzW65panglDvuYJ7hUMVcCVMx9uE8jD6TRhnU8ZMehdIivAnCxSdXebrpKGRi29umryoGxlVaZk6c7yTC00cKO3oozq',
  })
);
app.post('/pay', async (req, res) => {
    console.log('pay');
    try{
        const {name} = req.body;
        if(!name) return res.status(400).json({ message: 'Please enter a name' })

        const paymentIntent = await stripe.paymentIntents.create({
          amount: 100,
          currency: 'EUR',
          payment_method_types: ['card'],
          metadata: { name },
        });

        const clientSecret = paymentIntent.client_secret;
        res.json({
            message: 'Payment initiated', clientSecret
        });

    }catch(err){
        console.error(err);
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);

