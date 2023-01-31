const mongoose = require('mongoose');

const ConnectSchema = mongoose.Schema({
    id: {
        type: String,
        required: true,
    },
    stripePublishableKey: {
        type: String,
        required: true,
    },
    nif: {
        type: String,
        required: true,
    },
    iban: {
        type: String,
        required: true,
    }

});

module.exports = mongoose.model('Connect', ConnectSchema);