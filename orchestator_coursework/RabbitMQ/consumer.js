const fs = require("fs");
const Ajv = require("ajv");
const ajv = new Ajv();
const amqp = require('amqplib/callback_api');
const CONN_URL = 'amqp://student:COMP30231@152.71.155.95';

const offerSchema = {
    type: "object",
    properties: {
        messageId: { type: "string" },
        tripId: { type: "string" },
        creatorUserId: { type: "string" },
        longitude: { type: "string" },
        latitude: { type: "string" },
        date: { type: "string" }
    },
    required: ["messageId", "tripId", "creatorUserId", "longitude", "latitude", "date"]
};

const intentSchema = {
    type: "object",
    properties: {
        messageId: { type: "string" },
        tripId: { type: "string" },
        tripCreatorUserId: { type: "string" },
        userId: { type: "string" }
    },
    required: ["messageId", "tripId", "tripCreatorUserId", "userId"]
};

const validateOffer = ajv.compile(offerSchema);
const validateIntent = ajv.compile(intentSchema);

function checkIfTripDuplicate(data) {
    for (client in data.clients) {
        for (trip in client.trips) {
            if (trip.tripId === jsonObject.tripId) {
                console.log("Trip id:" + trip.tripId + " is already there for user id:" + trip.creatorUserId);
                return true;
            }
        }
    }
    return false;
}

function getClient(clients, property, value) {
    var position = 0;
    for (var i in clients) {
        if (clients[i][property] === value) {
            return [clients[i], position];
        }
        position += 1;
    }
    return [false, false];
}

function saveOffer(data, jsonObject) {
    var offer = {
        messageId: jsonObject.messageId,
        tripId: jsonObject.tripId,
        creatorUserId: jsonObject.creatorUserId,
        longitude: jsonObject.longitude,
        latitude: jsonObject.latitude,
        date: jsonObject.date,
        interestedUsers: []
    };
    //save to client.json the new offer object
    console.log(jsonObject.creatorUserId);
    var [client, position] = getClient(data.clients, "clientId", jsonObject.creatorUserId);
    if (client !== false) {
        if (!checkIfTripDuplicate(data)) {
            data.clients[position].trips.push(offer);
            console.log("Trip id:" + offer.tripId + " was created and saved by EXISTING user id:" + offer.creatorUserId);
        }
    } else {
        // offer.userType = "external";
        data.clients.push({ clientId: jsonObject.creatorUserId, userType: "external", trips: [offer] });
        console.log("Trip id :" + offer.tripId + " was created and saved by NEW user id:" + offer.creatorUserId);
    }
    fs.writeFile('./clients.json', JSON.stringify(data), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}

function saveInterestedUser(data, jsonObject) {
    var [client, position] = getClient(data.clients, "clientId", jsonObject.tripCreatorUserId);
    if (client !== false) {
        data.clients[position].trips.forEach(trip => {
            if (jsonObject.tripId === trip.tripId) {
                if (trip.interestedUsers.includes(jsonObject.userId)) {
                    console.log("User id " + jsonObject.userId + " is already interested in trip id: " + trip.tripId);
                } else {
                    trip.interestedUsers.push(jsonObject.userId);
                    console.log("User id " + jsonObject.userId + " has registered and saved interest in trip id: " + trip.tripId);
                    fs.writeFile('./clients.json', JSON.stringify(data), function (err) {
                        if (err) {
                            return console.log(err);
                        }
                        console.log("The file was saved!");
                    });
                }
                return;
            }
        });
    } else {
        console.log("Cannot register interest for user " + jsonObject.userId + " in trip id:" + jsonObject.tripId + " as it wasn't created by current users. Creator id: " + jsonObject.tripCreatorUserId);
    }
}

module.exports.consume = async () => {
    amqp.connect(CONN_URL, function (err, conn) {
        conn.createChannel(function (err, ch) {
            offersExchange = "TRAVEL_OFFERS";
            intentExchange = "TRAVEL_INTENT";
            ch.assertExchange(offersExchange, 'topic', { durable: false });
            ch.assertExchange(intentExchange, 'topic', { durable: false });
            ch.assertQueue('', { exclusive: "true" }, function (error2, q) {
                if (error2) {
                    throw error2;
                }
                // Tell exchanges to send messages to queue
                ch.bindQueue(q.queue, offersExchange);
                ch.bindQueue(q.queue, intentExchange);
                // Consume queue messages
                ch.consume(q.queue, function (msg) {
                    var jsonObject = JSON.parse(msg.content);
                    if (validateOffer(jsonObject) || validateIntent(jsonObject)) {
                        console.log("Consuming:");
                        var data = JSON.parse(fs.readFileSync('./clients.json'));
                        if (msg.fields.exchange === offersExchange) {
                            saveOffer(data, jsonObject);
                        } else {
                            //save interest to client.json
                            saveInterestedUser(data, jsonObject);
                        }
                    } else {
                        console.log("Invalid json message, so disregarding...");
                        console.log(jsonObject);
                    }
                }, {
                    noAck: true
                });
            });
        });
    });
}


