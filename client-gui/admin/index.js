//remove user
document.getElementById("deleteUserButton").onclick = function () {
    var deleteUserId = document.getElementById("deleteUserValue").value;
    fetch("/deleteUser", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            deleteUserId: deleteUserId
        })
    })
        .then(res => res.text())
        .then(res => {
            notifyUser(res);
            console.log(res);
        })
        .catch(err => console.log(err));
}

//remove trip with trip id
document.getElementById("deleteTripButton").onclick = function () {
    var deleteTripId = document.getElementById("deleteTripValue").value;
    fetch("/deleteTrip", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            deleteTripId: deleteTripId
        })
    })
        .then(res => res.text())
        .then(res => {
            notifyUser(res);
            console.log(res);
        })
        .catch(err => console.log(err));
}

//remove interested user from trip
document.getElementById("deleteUserFromTripButton").onclick = function () {
    var tripId = document.getElementById("deleteUserFromTripValue_trip").value;
    var deleteUserId = document.getElementById("deleteUserFromTripValue_user").value;
    fetch("/deleteUserFromTrip", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tripId: tripId,
            deleteUserId: deleteUserId
        })
    })
        .then(res => res.text())
        .then(res => {
            notifyUser(res);
            console.log(res);
        })
        .catch(err => console.log(err));
}

//remove all interested users from trip
document.getElementById("deleteUsersFromTripButton").onclick = function () {
    var tripId = document.getElementById("deleteUsersFromTripValue").value;
    fetch("/deleteUsersFromTrip", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tripId: tripId
        })
    })
        .then(res => res.text())
        .then(res => {
            notifyUser(res);
            console.log(res);
        })
        .catch(err => console.log(err));
}

//message popup
function notifyUser(msg) {
    $('body').prepend(`<div id="alert">${msg}</div>`);
    $('#alert').fadeOut(2000);
}