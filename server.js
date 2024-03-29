const fs = require("fs");
const bodyParser = require("body-parser");
const axios = require("axios");
const parseString = require("xml2js").parseString;
const express = require("express");
const router = express.Router();
const path = require('path');
const app = express();

app.use(bodyParser.json());
app.use(express.static("client-gui"));

const weatherUrl = `https://api.worldweatheronline.com/premium/v1/weather.ashx?key=2001169f333b4d12b60145652212312&num_of_days=1&format=json&q=`;
const weatherLocationUrl = `https://api.worldweatheronline.com/premium/v1/search.ashx?key=2001169f333b4d12b60145652212312&num_of_results=1&format=xml&q=`;
const randomUrl = `https://api.random.org/json-rpc/4/invoke`;

const { publish } = require('./RabbitMQ/publisher.js')
const { consume } = require('./RabbitMQ/consumer.js')

//get trips
app.get(`/trips/all/:type/:userId`, (req, res) => {
  if (req.params.type === "otherTrips") {
    res.send(getOtherTrips(req.params.userId));
  } else {
    res.send(getUsersTrips(req.params.userId));
  }
});

function getOtherTrips(userId) {
  var tripProposals = [];
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function (client) {
    if (client.clientId !== userId) {
      client.trips.forEach(function (trip) {
        var status = "not registered for trip";
        const proposalDate = new Date(trip.date);
        if (client !== userId && isDateValid(proposalDate)) {
          if (trip.interestedUsers.includes(userId)) status = "registered for trip";
          delete trip.interestedUsers;
          trip.status = status;
          tripProposals.push(trip);
        }
      });
    }
  });
  return tripProposals;
}

function isDateValid(proposalDate) {
  // today is the minimum date to show a trip
  const todaysDate = new Date();
  todaysDate.setHours(0, 0, 0, 0);
  // 14 days from today is the max date
  const maxDate = new Date(todaysDate.getTime() + 12096e5);
  if (proposalDate >= todaysDate && proposalDate <= maxDate) {
    return true;
  }
  else return false;
}

function getUsersTrips(userId) {
  var tripProposals = [];
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function (client) {
    if (client.clientId === userId) {
      client.trips.forEach(function (trip) {
        tripProposals.push(trip);
      });
    }
  });
  return tripProposals;
}

//post interest in trip
app.post("/interest", async (req, res) => {
  try {
    await publish("TRAVEL_INTENT", req.body);
    return res.status(200).json("Interest submitted");
  } catch (err) {
    console.log(err)
  }
  res.send(`Interest Sent`);
});

//get interest in trip
app.get(`/interest/:tripId/:userId`, (req, res) => {
  var json = {
    tripId: req.params.tripId,
    userId: req.params.userId,
    interestedUsers: getInterestedUsers(req.params.tripId)
  }
  res.send(json);
});

function getInterestedUsers(tripId) {
  var interestedUsers = [];
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function (client) {
    client.trips.forEach(function (trip) {
      if (trip.tripId === tripId) {
        interestedUsers = trip.interestedUsers;
      }
    });
  });
  return interestedUsers;
}

//post trip
app.post("/trips/submit", async (req, res) => {
  try {
    await publish("TRAVEL_OFFERS", req.body);
    return res.status(200).json("Trip submitted");
  } catch (err) {
    console.log(err)
  }
  res.send(`Trip submitted`);
});

//generate an id, if it's a user id make sure the id does not clash with existing id in clients.json
app.get("/generateId/:idType", async (req, res) => {
  var json = {
    "jsonrpc": "2.0",
    "method": "generateIntegers",
    "params": {
      "apiKey": "6e5ab537-e381-44bf-9144-38c7e90d93f7",
      "n": 9,
      "min": 0,
      "max": 9
    },
    "id": 0
  }
  var id = "";
  try {
    result = await axios.post(randomUrl, json);
    (result.data.result.random.data).forEach(number => {
      id += number;
    });
    if (req.params.idType === "user") {
      var data = JSON.parse(fs.readFileSync('clients.json'));
      var duplicateId = false;
      for (i in data.clients) {
        if (data.clients[i].clientId === id) {
          duplicateId = true;
        }
      }
      if (!duplicateId) {
        data.clients.push({ clientId: id, userType: "local", trips: [] });
        saveClientJSONFile(data, "The file was saved with new local user!");
      }
    }
    res.send(id);
  } catch (err) {
    console.error(err);
  }
});

//get weather for trip, send data from weather.json if data exists already, if not call weather api + save to weather.json + send to user. 
app.get(`/weather/:tripId/:location/:date`, async (req, res) => {
  var weather = JSON.parse(fs.readFileSync('weather.json'));
  if (weather.hasOwnProperty(req.params.tripId)) {
    console.log("Sent from weather json file");
    res.send(weather[req.params.tripId]);
  } else {
    try {
      result = await axios.get(`${weatherUrl}${req.params.location}&date=${req.params.date}`);
      var json = {
        weatherIconUrl: result.data.data.current_condition[0].weatherIconUrl[0].value,
        weatherDesc: result.data.data.current_condition[0].weatherDesc[0].value,
        observation_time: result.data.data.current_condition[0].observation_time,
        FeelsLikeC: result.data.data.current_condition[0].FeelsLikeC,
        hourly: result.data.data.weather[0].hourly,
        locationData: []
      }
      try {
        result_next = await axios.get(`${weatherLocationUrl}${req.params.location}`);
        parseString(result_next.data, function (err, parsedXML) {
          json["locationData"].push(parsedXML.search_api.result[0]);
          weather[req.params.tripId] = json;
          fs.writeFile('weather.json', JSON.stringify(weather), function (err) {
            if (err) {
              console.log(err);
            }
            console.log("The weather for trip id: " + req.params.tripId + " were saved.");
          });
          res.send(json);
        });
      } catch (err) {
        console.error(err);
      }
    } catch (err) {
      res.send({ "msg": "No weather data for this location" });
      console.error(err);
    }
  }
});

//validate user is part of local users in clients.json file
app.get(`/validateUserId/:userId`, async (req, res) => {
  res.send(isValidUser(req.params.userId));
});

function isValidUser(userId) {
  var data = JSON.parse(fs.readFileSync('clients.json'));
  for (var i in data.clients) {
    if (data.clients[i].clientId === userId && data.clients[i].userType === "local") {
      return { "valid": true };
    }
  }
  return { "valid": false };
}

app.get('/admin',function(req,res){
  res.sendFile((path.join(__dirname+'/client-gui/admin/index.html')));
});

//ADMIN panel endpoints
//remove user
app.post("/deleteUser", async (req, res) => {
  var response = "Could not remove user. Make sure id is correct.";
  const deleteUserId = req.body.deleteUserId;
  console.log(deleteUserId);
  var data = JSON.parse(fs.readFileSync('clients.json'));
  for (var i in data.clients) {
    if (data.clients[i].clientId === deleteUserId) {
      data.clients.splice(i, 1);
      response = "Deleted user " + deleteUserId + " and their trips successfully.";
      saveClientJSONFile(data, "The file was saved with deleted user.");
    }
  }
  res.send(response);
});

//remove trip with trip id
app.post("/deleteTrip", async (req, res) => {
  var response = "Could not remove trip. Make sure id is correct."; 
  const deleteTripId = req.body.deleteTripId;
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function (client) {
    client.trips.forEach(function (trip) {
      if (trip.tripId === deleteTripId) {
        client.trips.splice(client.trips.indexOf(trip), 1);
        response = "Deleted trip " + deleteTripId + " successfully.";
        saveClientJSONFile(data, "The file was saved with deleted trip.");
        return
      }
    });
  });
  res.send(response);
});

//remove interested user from trip
app.post("/deleteUserFromTrip", async (req, res) => {
  var response = "Could not remove interested user from trip. Make sure id's is correct."; 
  const tripId = req.body.tripId;
  const deleteUserId = req.body.deleteUserId;
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function (client) {
    client.trips.forEach(function (trip) {
      if (trip.tripId === tripId && trip.interestedUsers.includes(deleteUserId)) {
        var i = trip.interestedUsers.indexOf(deleteUserId);
        trip.interestedUsers.splice(i, 1);
        response = "Deleted user " + deleteUserId + " from trip "+ tripId + "successfully.";
        saveClientJSONFile(data, "The file was saved with deleted interested user.");
        return;
      }
    });
  });
  res.send(response);
});

//remove all interested users from trip
app.post("/deleteUsersFromTrip", async (req, res) => {
  var response = "Could not remove interested user from trip. Trip may have no interested users. Make sure id is correct."; 
  const tripId = req.body.tripId;
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function (client) {
    client.trips.forEach(function (trip) {
      if (trip.tripId === tripId && trip.interestedUsers.length > 0) {
        trip.interestedUsers = [];
        response = "Deleted all interested users from " + tripId + " successfully.";
        saveClientJSONFile(data, "The file was saved with all interested users deleted.");
        return;
      }
    });
  });
  res.send(response);
});

function saveClientJSONFile(data, msg) {
  fs.writeFile('clients.json', JSON.stringify(data), function (err) {
    if (err) {
      console.log(err);
    }
    console.log(msg);
  });
}

app.listen((process.env.PORT || 5000), () => {
  consume();
  console.log(`Server is running on port 5000.`);
});