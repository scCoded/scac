// gets user to enter id or gives the user one before loading page.
var span = document.createElement('span');
//creates 2 week date restriction on submit form - date picker
const todaysDate = new Date();
const maxDate = new Date(todaysDate .getTime() + 12096e5);
document.getElementById("tripDate").setAttribute("min", todaysDate.toISOString().split('T')[0]);
document.getElementById("tripDate").setAttribute("max", maxDate.toISOString().split('T')[0]);
document.getElementById("tripDate").setAttribute("value", todaysDate.toISOString().split('T')[0]);

var userId = "";
startPopup();
async function startPopup(){
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

function getTripWeatherAndInfo(tripType) {
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
                $("#temp").text("Temperature: " + res.FeelsLikeC + "c");
                $("#img").attr("src", res.weatherIconUrl);
                $("#error").text("");
            } else {
                $("#tripId").text("Trip Id: " + tripId);
                $("#date").text("Date: " + date);
                $("#area").text("Area: ");
                $("#region").text("Region: ");
                $("#country").text("Country: ");
                $("#weatherDesc").text("Description: ");
                $("#temp").text("Temperature: ");
                $("#img").attr("src", 'https://upload.wikimedia.org/wikipedia/commons/4/46/Question_mark_%28black%29.svg');
                $("#error").text(res.msg);
            }
        })
        .catch(err => console.log(err));
}
//each time trips dropdown box changed, get data about weather there.
//give option to have location as a city name or as a postcode - 
//https://www.worldweatheronline.com/developer/api/docs/search-api.aspx#q
document.getElementById('otherTrips').onchange = function() {
    $("#interestedUsers").text("");
    getTripWeatherAndInfo('otherTrips'); 
};

document.getElementById('usersTrips').onchange = function() {
    getTripWeatherAndInfo('usersTrips');
    getInterestedUsers();
};

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
        console.log("No other trips right now");
        var select = document.getElementById(tripType);
        if (select.options.length > 0) {
            select.innerHTML = "";
        }  
        document.getElementById(buttonName).style.visibility = "hidden";
    }
}
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
            showTripsWithDropdown(res, "usersTrips", "showUsersTrips", "Choose one of your trip proposals", "getInterestedUsers");

        })
        .catch(err => console.log(err));
};

//confirms interest in a trip proposal
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
        console.log(res);
        })
        .catch(err => console.log(err));
}

//Check intent for a user trip proposal
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
                (res.interestedUsers).forEach(function(user) {
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

//submits a trip proposal
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
        console.log(res);
        })
        .catch(err => console.log(err));
}