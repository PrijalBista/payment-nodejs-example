const Gateway = require("@payment/gateway");
const Boom = require("@hapi/boom");
const axios = require("axios");
const FormData = require('form-data');

class Esewa extends Gateway {

    constructor() {
        super();
    }

    transactionIdFieldName() {
        return 'oId';
    }

    async verifyPayment(req, totalAmountRequired) {
        // validate the request for additionally required fields (amount, oId, refId)
        const { oId, refId, amount } = await this.validateRequest(req);


        // verify from esewa api that transaction token with the amount is valid
        const  { esewaResponseBody, esewaResponseStatus } = await this.verifyTransactionFromEsewaApi(oId, refId, amount);
        const isVerified = this.parseResponseToGetIsVerified(esewaResponseBody);
        const isPaymentSuccess = amount == totalAmountRequired ? true : false;

        return this.verifyPaymentResponse(refId, esewaResponseStatus, esewaResponseBody, isVerified, isPaymentSuccess);
    }

    parseResponseToGetIsVerified(esewaResponseBody) {
        console.log(esewaResponseBody, 'isVerified: ', esewaResponseBody.includes('<response_code>\nSuccess\n</response_code>'));
        return esewaResponseBody
            ? esewaResponseBody.includes('<response_code>\nSuccess\n</response_code>')
            : false;
    }

    async validateRequest(req) {
        const oId = req.body.oId;
        const refId = req.body.refId;
        const amount = req.body.amount;

        if(!oId || oId == ''){
            throw Boom.badData('oId is required');
        }
        if(!refId || refId == ''){
            throw Boom.badData('refId is required');
        }

        if(!amount || amount == '') {
            throw Boom.badData('Amount is required');
        }

        return { oId, refId, amount };
    }

    async verifyTransactionFromEsewaApi(oId, refId, amount) {
        const url = "https://uat.esewa.com.np/epay/transrec";

        // const data= {
        //     amt: amount,
        //     rid: refId,
        //     pid: oId,
        //     scd: "EPAYTEST",
        // };
        // form data
        const formData = new FormData();
        formData.append('amt', amount);
        formData.append('rid', refId);
        formData.append('pid', oId);
        formData.append('scd', this.getServiceCode());

        let esewaResponseBody = null;
        let esewaResponseStatus = null;
        try {
            const config = {
                headers: {
                    ...formData.getHeaders(),
                }
            };
            const response = await axios.post(url, formData, config);
            esewaResponseBody = response.data;
            esewaResponseStatus = response.status;
            return { esewaResponseBody, esewaResponseStatus };
        } catch(err) {
            console.log(`DEBUG: error from connect ips`, err);
            Boom.internal('Error from esewa server during verification.');
        }

    }

    getServiceCode() {
        return process.env.ESEWA_LIVE_MODE == true
            ? process.env.LIVE_ESEWA_SCD
            : process.env.TEST_ESEWA_SCD;
    }

    isLiveMode() {
        return process.env.ESEWA_LIVE_MODE == true;
    }
}



module.exports = Esewa;