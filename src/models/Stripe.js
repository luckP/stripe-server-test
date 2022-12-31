const mongoose = require('mongoose');

const StripeSchema = mongoose.Schema({
  cardId: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
});


module.exports = mongoose.model('Stripe', StripeSchema);