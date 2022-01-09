const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios");
const parseString = require("xml2js").parseString;
const express = require("express");

const app = express();

app.use(bodyParser.json());
app.use(express.static("client-gui"));

const weatherUrl = `https://api.worldweatheronline.com/premium/v1/weather.ashx?key=2001169f333b4d12b60145652212312&num_of_days=1&format=json&q=`;
const weatherLocationUrl = `https://api.worldweatheronline.com/premium/v1/search.ashx?key=2001169f333b4d12b60145652212312&num_of_results=1&format=xml&q=`;
const randomUrl = `https://api.random.org/json-rpc/4/invoke`;

const { publishToQueue } = require('./RabbitMQ/publishToQueue.js')
const { consume } = require('./RabbitMQ/consumer.js')

app.post('/rabbit', async (req, res) => {
  let { exchangeName, payload } = req.body;
  try {
    await publishToQueue(exchangeName, payload);
    return res.status(200).json("Aight lad");
  } catch (err) {
    console.log(err);
  }
})

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

function getOtherTrips(userId) {
  var tripProposals = [];
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function(client) {
    if (client.clientId !== userId) {
      client.trips.forEach(function(trip) {
        const proposalDate = new Date(trip.date);
        if (client!== userId && isDateValid(proposalDate)) {
          tripProposals.push(trip);
        }
      });
    }
  });
  return tripProposals;
}

function getUsersTrips(userId) {
  var tripProposals = [];
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function(client) {
    if (client.clientId === userId) {
      client.trips.forEach(function(trip) {
        tripProposals.push(trip);
      });
    }
  });
  return tripProposals;
}

function getInterestedUsers(tripId) {
  var interestedUsers = [];
  var data = JSON.parse(fs.readFileSync('clients.json'));
  data.clients.forEach(function(client) {
    client.trips.forEach(function(trip) {
      if (trip.tripId === tripId) {
        interestedUsers = trip.interestedUsers;
      }
    });
  });
  return interestedUsers;
}

function isValidUser(userId) {
  var data = JSON.parse(fs.readFileSync('clients.json'));
  for (var i in data.clients) {
    if (data.clients[i].clientId === userId && data.clients[i].userType === "local") {
      return {"valid": true};
    }
  }
  return {"valid": false};
}
app.get(`/validateUserId/:userId`, async (req, res) => {
  res.send(isValidUser(req.params.userId));
});



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
        data.clients.push({clientId: id, userType:"local", trips:[]});
        fs.writeFile('clients.json', JSON.stringify(data), function (err) {
          if (err) {
            console.log(err);
          }
          console.log("The file was saved with new local user!");
        });
      }
    }
    res.send(id);
  } catch (err) {
    console.error(err);
  }
});


app.get(`/weather/:tripId/:location/:date`, async (req, res) => {
  var weather = JSON.parse(fs.readFileSync('weather.json'));
  if (weather.hasOwnProperty(req.params.tripId)) {
    console.log("Sent from weather json file");
    res.send(weather[req.params.tripId]);
  } else {
    try {
      //*create on FE weather graph on RHS of page. For other rest calls display other info on RHS too!
      /*
      //var weather = {};
      for (var i in result.data.data.weather[0].hourly){
        console.log("Hour", i);
        console.log(result.data.data.weather[0].hourly[i]);
        //append to weather json; then make weather graph with icon and time and temp on FE.
      }*/
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
      res.send({"msg": "No weather data for this location"});
      console.error(err);
    }
  }
});

app.get(`/trips/all/:type/:userId`, (req, res) => {
  if (req.params.type === "otherTrips") {
    res.send(getOtherTrips(req.params.userId));
  } else {
    res.send(getUsersTrips(req.params.userId));
  }
});

app.post("/interest", async (req, res) => {
  try {
    await publishToQueue("TRAVEL_INTENT", req.body);
    return res.status(200).json("Interest submitted");
  } catch (err) {
    console.log(err)
  }
  res.send(`Interest Sent`);
});

app.get(`/interest/:tripId/:userId`, (req, res) => {
  var json = {
    tripId: req.params.tripId,
    userId: req.params.userId,
    interestedUsers: getInterestedUsers(req.params.tripId)
  }
  res.send(json);
});


app.post("/trips/submit", async (req, res) => {
  try {
    await publishToQueue("TRAVEL_OFFERS", req.body);
    return res.status(200).json("Trip submitted");
  } catch (err) {
    console.log(err)
  }
  res.send(`Trip submitted`);
});


app.listen(5000, () => {
  consume();
  console.log(`Server is running on port 5000.`);
});