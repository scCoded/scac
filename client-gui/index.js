
var span = document.createElement('span');
//creates 2 week date restriction on submit form - date picker
const todaysDate = new Date();
const maxDate = new Date(todaysDate.getTime() + 12096e5);
document.getElementById("tripDate").setAttribute("min", todaysDate.toISOString().split('T')[0]);
document.getElementById("tripDate").setAttribute("max", maxDate.toISOString().split('T')[0]);
document.getElementById("tripDate").setAttribute("value", todaysDate.toISOString().split('T')[0]);

// gets user to enter valid id or generates the user a new one before loading page.
var userId = "";
startPopup();
async function startPopup() {
    userId = prompt("Enter your user id and hit OK. Or hit Cancel to generate a new userId.", "");
    if (userId == null || userId == "") {
        //generate user id
        userId = await generateId("user");
        welcomeUser(userId);

    } else {
        fetch(`/validateUserId/${userId}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(res => {
                if (res.valid) {
                    welcomeUser(userId);
                } else {
                    alert("User id not a part of local users.");
                    startPopup();
                }
            })
            .catch(err => console.log(err));
    }
}

function welcomeUser(userId) {
    alert("Welcome User " + userId);
    var title = document.getElementById("title");
    const node = document.createTextNode("Welcome User - " + userId);
    span.appendChild(node);
    title.appendChild(span);
}

//get new user id
async function generateId(idType) {
    return await fetch(`/generateId/${idType}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    })
        .then(res => res.text())
        .then(res => {
            return res;
        })
        .catch(err => console.log(err));
};


//gets all trip proposals made by other users
document.getElementById("getOtherTrips").onclick = function () {
    fetch(`/trips/all/otherTrips/${userId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(res => {
            showTripsWithDropdown(res, "otherTrips", "showOtherTrips", "Choose a trip", "confirmInterest");
        })
        .catch(err => console.log(err));
};

//get trip proposals made by user
document.getElementById("getUsersTrips").onclick = function () {
    fetch(`/trips/all/usersTrips/${userId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(res => {
            showTripsWithDropdown(res, "usersTrips", "showUsersTrips", "Choose one of your trip proposals", "sendTripGoAhead");

        })
        .catch(err => console.log(err));
};

//populate dropdown with trips
function showTripsWithDropdown(res, tripType, dropdownName, innerHTML, buttonName) {
    if (res.length != 0) {
        var select = document.getElementById(tripType);
        select.style.visibility = "visible";
        var dropdown = document.getElementById(dropdownName);
        if (select.options.length > 0) {
            select.innerHTML = "";
        }
        if (dropdown.childNodes[0]) {
            dropdown.removeChild(dropdown.childNodes[0]);
        }
        var blankOption = document.createElement("option");
        blankOption.value, blankOption.text = "--select a trip--";
        blankOption.disabled = true;
        select.appendChild(blankOption);
        for (var key in res) {
            var option = document.createElement("option");
            option.value, option.text = JSON.stringify(res[key]);
            select.appendChild(option);
        }
        select.value = blankOption.value;

        var label = document.createElement("label");
        label.innerHTML = innerHTML;
        label.htmlFor = tripType;
        dropdown.appendChild(label).appendChild(select);
        document.getElementById(buttonName).style.visibility = "visible";
    } else {
        notifyUser("No trips right now");
        console.log("No trips right now");
        var select = document.getElementById(tripType);
        if (select.options.length > 0) {
            select.innerHTML = "";
        }
        document.getElementById(buttonName).style.visibility = "hidden";
    }
}

//post interest in trip
document.getElementById("confirmInterest").onclick = async function () {
    var el = document.getElementById("otherTrips");
    var interestedTrip = JSON.parse(el.options[el.selectedIndex].text);
    const messageId = await generateId("messageId");
    fetch("/interest", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messageId: messageId,
            tripId: interestedTrip.tripId,
            tripCreatorUserId: interestedTrip.creatorUserId,
            userId: userId
        })
    })
        .then(res => res.text())
        .then(res => {
            notifyUser(res);
            console.log(res);
        })
        .catch(err => console.log(err));
}

//get interest in trip
function getInterestedUsers() {
    var el = document.getElementById("usersTrips");
    var userProposalToCheck = JSON.parse(el.options[el.selectedIndex].text);
    var tripId = userProposalToCheck.tripId;
    var userId = userProposalToCheck.creatorUserId;
    fetch(`/interest/${tripId}/${userId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
    })
        .then(res => res.json())
        .then(res => {
            console.log(res);
            if (res.interestedUsers.length != 0) {
                var intesteredUserIds = [];
                (res.interestedUsers).forEach(function (user) {
                    intesteredUserIds.push(user);
                });
                $("#interestedUsers").text("Interested Users: " + intesteredUserIds);
                console.log("interested user ids: " + intesteredUserIds);
            } else {
                $("#interestedUsers").text("Interested Users: No one is interested in this trip for now.");
                console.log("No one is interested in this trip for now.")
            }

        })
        .catch(err => console.log(err));
}

//post a trip
document.addEventListener("submit", sendData);
async function sendData(e) {
    e.preventDefault();
    const tripId = await generateId("tripId");
    const messageId = await generateId("messageId");
    const longitude = document.getElementById("longitude").value;
    const latitude = document.getElementById("latitude").value;
    //make sure date is not in the past + not further than 14 days away.
    const date = document.getElementById("tripDate").value;
    fetch("/trips/submit", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messageId: messageId,
            tripId: tripId,
            creatorUserId: userId,
            longitude: longitude,
            latitude: latitude,
            date: date
        })
    })
        .then(res => res.text())
        .then(res => {
            notifyUser(res);
            console.log(res);
        })
        .catch(err => console.log(err));
}

//when drop down changes get that trips info + weather data (trips made by other users)
document.getElementById('otherTrips').onchange = function () {

    var trip = JSON.parse(document.getElementById('otherTrips').value);
    var creatorUserId = trip.creatorUserId;
    var status = trip.status;
    $("#interestedUsers").text("Your registration status: " + status);
    getTripWeatherAndInfo('otherTrips', ' (Made by User ' + creatorUserId + ")");
};

//when drop down changes get that trips info + weather data (trips made by current users)
document.getElementById('usersTrips').onchange = function () {
    getTripWeatherAndInfo('usersTrips', ' (Made by You)');
    getInterestedUsers();
};

//get weather information for trip
function getTripWeatherAndInfo(tripType, madeBy) {
    var interestedTrip = JSON.parse(document.getElementById(tripType).value);
    var longitude = interestedTrip.longitude;
    var latitude = interestedTrip.latitude;
    var tripId = interestedTrip.tripId;
    var location = `${longitude},${latitude}`;
    var date = interestedTrip.date;
    fetch(`/weather/${tripId}/${location}/${date}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    })
        .then(res => res.json())
        .then(res => {
            console.log(res);
            if (!res.hasOwnProperty("msg")) {
                $("#tripId").text("Trip Id: " + tripId);
                $("#date").text("Date: " + date);
                $("#area").text("Area: " + res.locationData[0].areaName[0]);
                $("#region").text("Region: " + res.locationData[0].region[0]);
                $("#country").text("Country: " + res.locationData[0].country[0]);
                $("#weatherDesc").text("Description: " + res.weatherDesc);
                $("#img").attr("src", res.weatherIconUrl);
                $("#error").text("");
                $("#madeBy").text(madeBy);
                loadChart(res.hourly, res.locationData[0].region[0], date);
                document.getElementById('weatherChart').style.visibility = "visible";
            } else {
                $("#tripId").text("Trip Id: " + tripId);
                $("#date").text("Date: " + date);
                $("#area").text("Area: ");
                $("#region").text("Region: ");
                $("#country").text("Country: ");
                $("#weatherDesc").text("Description: ");
                $("#img").attr("src", 'https://upload.wikimedia.org/wikipedia/commons/4/46/Question_mark_%28black%29.svg');
                $("#error").text(res.msg);
                document.getElementById('weatherChart').style.visibility = "hidden";
                $("#madeBy").text(madeBy);
            }
        })
        .catch(err => console.log(err));
}

//create weather chart
function loadChart(hourlyData, region, date) {
    var x = [];
    var y = [];
    var pointStyles = [];
    hourlyData.forEach(hour => {
        var img = new Image();
        img.src = hour.weatherIconUrl[0].value;
        img.height = 20;
        img.width = 20;
        pointStyles.push(img);
        x.push(hour.time);
        y.push(hour.tempC);
    });
    new Chart(document.getElementById('weatherChart'), {
        type: 'line',
        plugins: {
            afterUpdate: chart => {
                chart.getDatasetMeta(0).data.forEach((d, i) => d._model.pointStyle = pointStyles[i]);
            }
        },
        data: {
            labels: x,
            datasets: [{
                data: y,
                pointRadius: 3
            }]
        },
        options: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: 'Temperature against Time for ' + region + ' on the ' + date
            },
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Time (3 Hour Intervals)'
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Temperature oC'
                    }
                }]
            }
        }
    });
}

$("#location").blur(function() {
    getCoordinates();
})

$("#location").bind('keyup', function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        getCoordinates();
    }
});

function getCoordinates() {
    var location = document.getElementById("location").value;
    console.log(location);
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode( { "address": location}, function(results, status) {
        console.log(status);
        console.log(results);
        if (status == "OK") {
            $("#longitude").val(results[0].geometry.location.lat());
            $("#latitude").val(results[0].geometry.location.lng());
        } else {
            notifyUser("This location is not acceptable");
        }
    });
}

//sends email to interested users in selected trip
document.getElementById("sendTripGoAhead").onclick = function () {
    var trip = JSON.parse(document.getElementById('usersTrips').value);
    var interestedUsers = trip.interestedUsers;
    var tripId = trip.tripId;
    if (interestedUsers.length === 0) {
        notifyUser("No users to send an email about this trip to.");
        console.log("No users to send an email about this trip to.");
    } else {
        interestedUsers.forEach(async function (user) {
            await sendEmail(tripId, user);
        })
        notifyUser("sent confirmation email to users");
    }
}

async function sendEmail(tripId, interestedUser) {
    return await Email.send({
        Host: "smtp.mailtrap.io",
        Username: "aa42014ef14a30",
        Password: "81c38ff6c90b23",
        To: `user-${interestedUser}@SophiesTrips.com`,
        From: `user-${userId}@SophiesTrips.com`,
        Subject: `Hello User ${interestedUser} you are confirmed to go on Trip ${tripId}`,
        Body: `<html><p>Hello User ${interestedUser},</p><br><p>You are confirmed to go on Trip ${tripId}. More info later.</p><br><p> Thanks!</p><br><p>From User ${userId}.</p></html>`
    }).then(
        console.log("sent confirmation email to user " + interestedUser)
    );
}

//message popup
function notifyUser(msg) {
    $('body').prepend(`<div id="alert">${msg}</div>`);
    $('#alert').fadeOut(2000);
}