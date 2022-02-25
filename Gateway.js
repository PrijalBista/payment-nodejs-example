
//  Generic Gateway Interafce
class Gateway {

    // eslint-disable-next-line
    async verifyPayment(req) {
       throw new Error('TODO IMPLEMENT VERIFY PAYMENT METHOD');
    }

    // eslint-disable-next-line
    async validateRequest(req) {
        throw new Error('TODO IMPLEMENT VERIFY PAYMENT METHOD');
    }

    customPaymentException(message) {
        return { type: 'CustomPaymentException', message };
    }

    verifyPaymentResponse(gatewayUniqueId, gatewayResponseStatus, gatewayResponseBody, isVerified, isPaymentSuccess, alreadyVerified = false) {
        return {
            gatewayUniqueId,
            gatewayResponseStatus,
            gatewayResponseBody,
            isVerified,
            isPaymentSuccess,
            alreadyVerified,
        };
    }

    transactionIdFieldName() {
        throw new Error('TODO SPECIFY TRANSACTION ID FIELD NAME');
    }

    isLiveMode() {
        throw new Error('TODO IMPLEMENT IS LIVE MODE');
    }
}


module.exports = Gateway;