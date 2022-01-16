const amqp = require('amqplib/callback_api');
//const CONN_URL = 'amqp://student:COMP30231@152.71.155.95';
const CONN_URL = 'amqps://wtofolaf:jral1GwoT_7I-ldRS5gJqCoSMS_lCGmo@rattlesnake.rmq.cloudamqp.com/wtofolaf';
let ch = null;

amqp.connect(CONN_URL, function (err, conn) {
   conn.createChannel(function (err, channel) {
      ch = channel;
   });
});

module.exports.publishToQueue = async (exchangeName, data) => {
   ch.assertExchange(exchangeName, 'topic', { durable: false });
   ch.publish(exchangeName, '', Buffer.from(JSON.stringify(data)));
}

process.on('exit', (code) => {
   ch.close();
   console.log(`Closing rabbitmq channel`);
});