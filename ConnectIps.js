const Gateway = require("@payment/gateway");
const Boom = require("@hapi/boom");
const axios = require("axios");
// const FormData = require('form-data');
const pem = require("pem");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const moment = require("moment");
class ConnectIPS extends Gateway {
    constructor() {
        super();
    }

    transactionIdFieldName() {
        return "txnId";
    }

    async initiatePaymentData(req, transaction) {
        // get config
        const config = this.getConfig();
        const amount = transaction.amount * 1;
        const formData = {
            MERCHANTID: config.merchantId,
            APPID: config.appId,
            APPNAME: config.appName,
            TXNID: transaction.unique_id, // LENGTH MAX 20 chars, cannot use UUIDV4(36 chars) so using unique_id instead
            TXNDATE: moment(transaction.createdAt, "YYYY-MM-DD").format(
                "DD-MM-YYYY"
            ),
            TXNCRNCY: "NPR",
            TXNAMT: amount.toFixed(2) * 100,
            REFERENCEID: transaction.unique_id,
            REMARKS: "test",
            PARTICULARS: "particulars payment",
        };

        // build message
        const message = this.buildMessage(formData);
        // sign message
        const token = await this.signMessage(message);
        // set token
        formData.TOKEN = token;

        return {
            formData,
            transactionUrl: config.transactionUrl,
        };
    }

    buildMessage(formData) {
        const msg = `MERCHANTID=${formData.MERCHANTID},APPID=${formData.APPID},APPNAME=${formData.APPNAME},TXNID=${formData.TXNID},TXNDATE=${formData.TXNDATE},TXNCRNCY=${formData.TXNCRNCY},TXNAMT=${formData.TXNAMT},REFERENCEID=${formData.REFERENCEID},REMARKS=${formData.REMARKS},PARTICULARS=${formData.PARTICULARS},TOKEN=TOKEN`;
        console.log(msg);
        return msg;
    }

    async signMessage(message) {
        let privateKey = await this.getPrivateKeyFromCertificate();
        // privateKey = privateKey.replace(/\\n/gm, "\n");
        //sign message with key
        const signer = crypto.createSign("RSA-SHA256");
        signer.update(message);
        const hash = signer.sign({ key: privateKey }, "base64");
        return hash;
    }

    async getPrivateKeyFromCertificate() {
        const certificateFilePath = path.join(
            __dirname,
            "/path-to-key-provided-by-connect-ips/FILENAME.pfx"
        );
        const pfxFile = fs.readFileSync(certificateFilePath);
        return new Promise((resolve, reject) => {
            pem.readPkcs12(pfxFile, { p12Password: "123" }, (err, cert) => {
                if (!err && cert) {
                    resolve(cert.key);
                } else {
                    reject(err);
                }
            });
        });
    }

    async verifyPayment(req, totalAmountRequired) {
        // validate the request for additionally required fields (txnId)
        const { txnId } = await this.validateRequest(req);

        // verify from esewa api that transaction token with the amount is valid
        const { responseBody, responseStatus } =
        await this.verifyTransactionFromConnectIpsApi(
            txnId,
            totalAmountRequired
        );
        const isVerified = responseStatus == 'SUCCESS';
        const isPaymentSuccess = isVerified;
        return this.verifyPaymentResponse(txnId , responseStatus, responseBody, isVerified, isPaymentSuccess);
    }

    buildMessageForVerification(data) {
        const msg = `MERCHANTID=${data.merchantId},APPID=${data.appId},REFERENCEID=${data.referenceId},TXNAMT=${data.txnAmt}`;
        console.log(msg);
        return msg;
    }

    async verifyTransactionFromConnectIpsApi(txnId, amount) {
        const config = this.getConfig();
        const url = config.verificationUrl;

        const data = {
            merchantId: config.merchantId,
            appId: config.appId,
            referenceId: txnId,
            txnAmt: amount * 100,
        };
        // token
        const msg = this.buildMessageForVerification(data);
        const token = await this.signMessage(msg);
        data.token = token;

        try {
            const response = await axios.post(url, data, {
                auth: {
                    username: config.appId,
                    password: config.appPassword,
                },
            });

            console.log(`Response from connect ips: `, response.data);

            return {
                responseBody: response.data,
                responseStatus: response?.data?.status || response?.status,
            };
        } catch (err) {
            console.log(`DEBUG: error from connect ips`, err.response.data);
            Boom.internal('Error from connectips server during verification');
        }
    }

    async validateRequest(req) {
        const txnId = req.body.txnId;

        if (!txnId || txnId == "") {
            throw Boom.badData("txnId is required");
        }
        return { txnId };
    }
    getConfig() {
        return process.env.CONNECT_IPS_LIVE_MODE == true
            ? {
                merchantId: process.env.LIVE_CONNECT_IPS_MERCHANT_ID,
                appId: process.env.LIVE_CONNECT_IPS_APP_ID,
                appPassword: process.env.LIVE_CONNECT_IPS_APP_PASSWORD,
                appName: process.env.LIVE_CONNECT_IPS_APP_NAME,
                transactionUrl: process.env.LIVE_CONNECT_IPS_TRANSACTION_URL,
                verificationUrl: process.env.LIVE_CONNECT_IPS_VERIFICATION_URL,
            }
            : {
                merchantId: process.env.TEST_CONNECT_IPS_MERCHANT_ID,
                appId: process.env.TEST_CONNECT_IPS_APP_ID,
                appPassword: process.env.TEST_CONNECT_IPS_APP_PASSWORD,
                appName: process.env.TEST_CONNECT_IPS_APP_NAME,
                transactionUrl: process.env.TEST_CONNECT_IPS_TRANSACTION_URL,
                verificationUrl: process.env.TEST_CONNECT_IPS_VERIFICATION_URL,
            };
    }

    isLiveMode() {
        return process.env.CONNECT_IPS_LIVE_MODE == true;
    }
}

module.exports = ConnectIPS;
