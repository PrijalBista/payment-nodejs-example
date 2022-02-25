
const supportedGateways = [
    {
        name: 'Khalti',
        slug: 'khalti',
        class: 'Khalti',
        isActive: 'true',
    },
    {
        name: 'Esewa',
        slug: 'esewa',
        class: 'Esewa',
        isActive: 'true',
    },
    {
        name: 'Connect IPS',
        slug: 'connectIps',
        class: 'ConnectIPS',
        isActive: 'true',
    },
];

const supportGatewaySlugsArray = [
    'khalti',
    'esewa',
    'connectIps',
];

module.exports = {
    supportedGateways,
    supportGatewaySlugsArray,
};