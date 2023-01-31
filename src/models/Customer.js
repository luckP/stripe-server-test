const mongoose = require('mongoose');

const CustomerSchema = mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    stripePublishableKey: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    is_host: {
        type: Boolean,
        require: true,
        default: false
    }
});

module.exports = mongoose.model('Customer', CustomerSchema);