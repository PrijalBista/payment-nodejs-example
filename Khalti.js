const Gateway = require("@payment/gateway");
const Boom = require("@hapi/boom");
const axios = require("axios");

class Khalti extends Gateway {

    constructor() {
        super();
    }

    transactionIdFieldName() {
        return 'transaction_id';
    }

    //
    async verifyPayment(req, totalAmountRequired) {

        // validate the request for additionally required fields (token, amount)
        const { token, amountInPaisa } =  await this.validateRequest(req);

        const amountInRupees = Math.round(amountInPaisa / 100, 2);

        // verify from khalti api that the transaction token with this amount is valid
        const { khaltiResponseStatus, khaltiResponseBody, alreadyVerified } = await this.verifyTransactionFromKhaltiApi(token, amountInPaisa);

        const isVerified = khaltiResponseStatus == 200;
        const isPaymentSuccess = amountInRupees == totalAmountRequired ? true : false;
        console.log('DEBUG');
        console.log(khaltiResponseBody);
        return this.verifyPaymentResponse(token, khaltiResponseStatus, khaltiResponseBody, isVerified, isPaymentSuccess, alreadyVerified);
    }

    async validateRequest(req) {
        const token = req.body.token;
        const amountInPaisa = req.body.amount;

        if(!token || token == ''){
            throw Boom.badData('Token is required');
        }

        if(!amountInPaisa || amountInPaisa == '') {
            throw Boom.badData('Amount (in Paisa) is required');
        }

        return { token, amountInPaisa };
    }

    async verifyTransactionFromKhaltiApi(token, amount) {
        const url = 'https://khalti.com/api/v2/payment/verify/';

        const data = {
            token,
            amount
        };

        const config = {
            headers: { 'Authorization': `Key ${this.getSecretKey()}` }
        };

        let khaltiResponseBody = null;
        let khaltiResponseStatus = null;
        let alreadyVerified = false;
        try {
            const response = await axios.post(url, data, config);
            khaltiResponseBody = response.data;
            khaltiResponseStatus = response.status;

            return { khaltiResponseStatus, khaltiResponseBody };
        } catch(err) {

            // handle transaction already verified case
            const errorKey = err?.response?.data?.error_key || null;
            if( errorKey == 'already_verified') {
                alreadyVerified = true;
                khaltiResponseStatus = 200; // override 400 to 200 as transaction is already verified
            } else {
                khaltiResponseStatus = err?.response?.status || err?.status || null;
            }

            khaltiResponseBody = err?.response?.data || null;

            return { khaltiResponseStatus, khaltiResponseBody, alreadyVerified };
        }
    }

    getSecretKey() {
        const  secretKey =  this.isLiveMode()
            ? process.env.LIVE_KHALTI_SECRET_KEY
            : process.env.TEST_KHALTI_SECRET_KEY;
        return secretKey;
    }

    isLiveMode() {
        return process.env.KHALTI_LIVE_MODE == true;
    }
}



module.exports = Khalti;