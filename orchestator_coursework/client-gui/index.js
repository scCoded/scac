// gets user to enter id or gives the user one before loading page.
var span = document.createElement('span');
let userId = prompt("Enter your user id and hit OK. Or hit Cancel to generate a new userId.", "");
if (userId == null || userId == "") {   
    //generate user id
    generateId();
} else {
    welcomeUser(userId);
}

function welcomeUser(userId) {
    alert("Welcome User " + userId); 
    var title = document.getElementById("title");
    const node = document.createTextNode("Welcome User - " + userId);
    var span = document.createElement('span');
    span.style.fontSize = "10px";
    span.appendChild(node);
    title.appendChild(span);
}

//get new user id
function generateId() {
    fetch("/generateId", {
        method: "GET",
        headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
        }
    })
        .then(res => res.text())
        .then(res => {
            userId = res;
            welcomeUser(userId);
        })
        .catch(err => console.log(err));
};

//each time trips dropdown box changed, get data about weather there.
document.getElementById('trips').onchange = function(){
    var interestedTrip = JSON.parse(document.getElementById('trips').value);
    //give option to have location as a city name or as a postcode - 
    //https://www.worldweatheronline.com/developer/api/docs/search-api.aspx#q
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
                $("#area").text("Area: " + res.locationData[0].areaName[0]);
                $("#region").text("Region: " + res.locationData[0].region[0]);
                $("#country").text("Country: " + res.locationData[0].country[0]);
                $("#weatherDesc").text("Description: " + res.weatherDesc);
                $("#temp").text("Temperature: " + res.FeelsLikeC + "C");
                $("#img").attr("src", res.weatherIconUrl);
                $("#error").text("");
            } else {
                $("#tripId").text("Trip Id: ");
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
            if (res.length != 0) {
                var select = document.getElementById('trips');
                select.style.visibility = "visible";
                var dropdown = document.getElementById("showTrips");
                if (select.options.length > 0) {
                    select.innerHTML = "";
                }  
                for (var key in res) {
                    if (dropdown.childNodes[0]) {
                        dropdown.removeChild(dropdown.childNodes[0]);
                    }
                    var option = document.createElement("option");
                    option.value, option.text = JSON.stringify(res[key]);
                    select.appendChild(option);
                }
            
                var label = document.createElement("label");
                label.innerHTML = "Choose your trip: "
                label.htmlFor = "trips";
                dropdown.appendChild(label).appendChild(select);
                document.getElementById("confirmInterest").style.visibility = "visible";
            } else {
                console.log("No other trips right now");
                var select = document.getElementById('trips');
                if (select.options.length > 0) {
                    select.innerHTML = "";
                }  
                document.getElementById("confirmInterest").style.visibility = "hidden";
                
            }
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
            if (res.length != 0) {
                var select = document.getElementById('usersTrips');
                select.style.visibility = "visible";
                var dropdown = document.getElementById("showUsersTrips");
                if (select.options.length > 0) {
                    select.innerHTML = "";
                } 
                for (var key in res) {
                    if (dropdown.childNodes[0]) {
                        dropdown.removeChild(dropdown.childNodes[0]);
                    }
                    var option = document.createElement("option");
                    option.value, option.text = JSON.stringify(res[key]);
                    select.appendChild(option);
                }
                var label = document.createElement("label");
                label.innerHTML = "Choose one of your trip proposals: "
                label.htmlFor = "usersTrips";
                dropdown.appendChild(label).appendChild(select);
                document.getElementById("getInterestedUsers").style.visibility = "visible";
            } else {
                console.log("You have no trips right now");
                var select = document.getElementById('usersTrips');
                if (select.options.length > 0) {
                    select.innerHTML = "";
                } 
                document.getElementById("getInterestedUsers").style.visibility = "hidden";
            }
        })
        .catch(err => console.log(err));
};

//confirms interest in a trip proposal
document.getElementById("confirmInterest").onclick = function () {
    var el = document.getElementById("trips");
    var interestedTrip = JSON.parse(el.options[el.selectedIndex].text);
    console.log("creator id:")
    console.log(interestedTrip.creatorUserId);
    fetch("/interest", {
        method: "POST",
        headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
        }, 
        body: JSON.stringify({
            messageId:(Math.floor(Math.random() * 9000) + 1000).toString(),
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
document.getElementById("getInterestedUsers").onclick = function () {
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
                console.log("interested user ids: " + intesteredUserIds);
            } else {
                console.log("No one is interested in this trip for now.")
            }
            
        })
        .catch(err => console.log(err));
}

//creates 2 week date restriction on submit form - date picker
const todaysDate = new Date();
const maxDate = new Date(todaysDate .getTime() + 12096e5);
document.getElementById("tripDate").setAttribute("min", todaysDate.toISOString().split('T')[0]);
document.getElementById("tripDate").setAttribute("max", maxDate.toISOString().split('T')[0]);
document.getElementById("tripDate").setAttribute("value", todaysDate.toISOString().split('T')[0]); 

//submits a trip proposal
document.addEventListener("submit", sendData);
function sendData(e) {
    e.preventDefault();
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
        messageId:(Math.floor(Math.random() * 9000) + 1000).toString(),
        tripId: (Math.floor(Math.random() * 9000) + 1000).toString(),
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