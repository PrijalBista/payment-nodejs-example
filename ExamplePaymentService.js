
const { supportedGateways } = require("@constant/payment");

class PaymentService {


    async initiatePayment(req) {
        const gateway = await this.getPaymentGateway(req);
    }

    async verifyPayment(req) {
        const gateway = await this.getPaymentGateway(req);
    }

    async getPaymentGateway(req, type="instance") {
        const paymentMethodSlug = req.validData.payment_method;
        const paymentMethodClassName = supportedGateways.filter(el => el.slug == paymentMethodSlug)[0]?.class || null;
        if (!paymentMethodClassName) {
            throw { type: 'CustomPaymentException', message: `Couldnot resolve payment Method Class form ${paymentMethodSlug}` };
        }

        try {

            const gatewayClass = require(`./${paymentMethodClassName}`);
            return type == "instance" ? new gatewayClass() : gatewayClass;

        } catch (err) {
            console.log(err);
            throw { type: 'CustomPaymentException', message: `Couldnot load payment Method Class: ./${paymentMethodClassName}` };

        }
    }
}