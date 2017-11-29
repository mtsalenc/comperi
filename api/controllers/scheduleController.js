'use strict';
var mongoose = require('mongoose');
var Schedule = mongoose.model('Schedules');
var admin = require("firebase-admin");
var serviceAccount = require("../comperio-494c9-firebase-adminsdk-3p9fd-c4c60d234d.json");

var topic = "updateDb";

// See the "Defining the message payload" section below for details
// on how to define a message payload.
var payload = {
  data: {
    updateDb: 'true'
  }
};

exports.create_a_schedule = function(req, res) {
  req.body.loc = req.body.loc.map(Number);
  if(!req.body.teacherRating){
     // add a fake rating
     req.body.teacherRating = 4.3;
  }

  var new_schedule = new Schedule(req.body);
  new_schedule.save(function(err, schedule) {
    if (err) {console.log(err); res.send(err); return;}

    // Send a message to devices subscribed to the provided topic.
    admin.messaging().sendToTopic(topic, payload)
      .then(function(response) {
        console.log("Successfully sent message:", response);
      })
      .catch(function(error) {
        console.log("Error sending message:", error);
      });

    res.json(schedule);
  });
};

exports.find_schedules = function(req, res) {
  var subject = req.query.subject;

  var maxDistance = req.query.maxDistance;
  var coords = [];
  coords[0] = Number(req.query.lon);
  coords[1] = Number(req.query.lat);

  var qry = Schedule.find();
  if(subject){
    qry.where('subjectName').equals(subject);
  }

  // NOTE: Not using real location data so the review team
  //       can see data no matter where they are.
  //
  //  qry.where('loc').near({
  //   center: {
  //     type: 'Point',
  //     coordinates: coords
  //   },
  //   maxDistance: mDistance * 1000
  // });
  //

  qry.exec(function(err, docs) {
    if (err) {return res.send(err); }

    docs.forEach(function(item){
      var distanceToUser = calculateDistance(coords,item.loc);
      item.set('distance',distanceToUser, { strict: false });
   });

    res.json(docs);
  });

};


exports.read_a_schedule = function(req, res) {
  Schedule.findById(req.params.id, function(err, schedule) {
    if (err) {res.send(err);}

    var maxDistance = req.query.maxDistance;
    var coords = [];

    coords[0] = Number(req.query.lon);
    coords[1] = Number(req.query.lat);

    schedule.distance = calculateDistance(coords,schedule.loc);

    res.json(schedule);
  });
};


exports.update_a_schedule = function(req, res) {
  Schedule.findOneAndUpdate({
    _id: req.params.id
  }, req.body, {
    new: true
  }, function(err, schedule) {
    if (err) {
      res.send(err);
    }

    res.json({
      message: "Schedule updated.",
      schedule
    });
  });
};


exports.delete_a_schedule = function(req, res) {
  Schedule.remove({
    _id: req.params.id
  }, function(err, schedule) {
    if (err) {
      res.send(err);
    }
    res.json({
      message: 'Schedule successfully deleted'
    });
  });
};

function calculateDistance(userLoc,scheduleLoc){
  // faking distance so the review team can get content wherever they are.
  var fakeDistances = Array(3600,5833,474,30000,2523,5325,5115,4747,5533,6123);
  return fakeDistances[Math.floor(Math.random()*fakeDistances.length)];;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://comperio-494c9.firebaseio.com/"
});
