/**
    Copyright 2016 Brand Breadcrumbs, Inc. or its affiliates. All Rights Reserved.
*/

/**
 * This sample shows how to create a Lambda function for handling Alexa Skill requests that:
 *
 * Examples:
 * One-shot model:
 * User:  "Alexa, ask Outdoor Engine What actitivty should I do today"
 * Alexa: "For zipcode 94117 you should go on a bike ride today?"
 * User: "Thanks"
 * Alexa: "Good bye!"
 *
 
 */


/**
 * App ID for the skill
 */
var APP_ID = 'amzn1.ask.skill.fdd79913-a879-4cbb-906b-61a092883496'; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var https = require('https');

var AWS = require("aws-sdk");

var storage = (function () {
    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    /*
     * The User class stores all weather info for the user
     */
    function User(session, data) {
        if (data) {
            this.data = data;
        } else {
            this.data = {
                zipcode: "",
                lat: "",
                long: ""
            };
        }
        this._session = session;
    }

    User.prototype = {
        isEmpty: function () {
            //check if any one had non-zero score,
            //it can be used as an indication of whether the game has just started
            var allEmpty = true;
            var userData = this.data;
            if (userData.zipcode !== 0) {
                allEmpty = false;
            }
            });
            return allEmpty;
        },
        save: function (callback) {
            //save the game states in the session,
            //so next time we can save a read from dynamoDB
            this._session.attributes.currentGame = this.data;
            dynamodb.putItem({
                TableName: 'OutdoorEngineUserData',
                Item: {
                    CustomerId: {
                        S: this._session.user.userId
                    },
                    Data: {
                        S: JSON.stringify(this.data)
                    }
                }
            }, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                }
                if (callback) {
                    callback();
                }
            });
        }
    };

    return {
        loadUser: function (session, callback) {
            if (session.attributes.currentUser) {
                console.log('get user from session=' + session.attributes.currentUser);
                callback(new User(session, session.attributes.currentUser));
                return;
            }
            dynamodb.getItem({
                TableName: 'OutdoorEngineUserData',
                Key: {
                    CustomerId: {
                        S: session.user.userId
                    }
                }
            }, function (err, data) {
                var currentGame;
                if (err) {
                    console.log(err, err.stack);
                    currentGame = new User(session);
                    session.attributes.currentUser = currentUser.data;
                    callback(currentUser);
                } else if (data.Item === undefined) {
                    currentGame = new User(session);
                    session.attributes.currentUser = currentUser.data;
                    callback(currentUser);
                } else {
                    console.log('get game from dynamodb=' + data.Item.Data.S);
                    currentUser = new User(session, JSON.parse(data.Item.Data.S));
                    session.attributes.currentUser = currentUser.data;
                    callback(currentUser);
                }
            });
        },
        newUser: function (session) {
            return new User(session);
        }
    };
})();
module.exports = storage;

/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill') 



/**
 * OutdoorEngine is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var OutdoorEngineSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend lexaSkill
OutdoorEngineSkill.prototype = Object.create(AlexaSkill.prototype);
OutdoorEngineSkill.prototype.constructor = OutdoorEngineSkill;

OutdoorEngineSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("OutdoorEngineSkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session init logic would go here
};

OutdoorEngineSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("OutdoorEngineSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

OutdoorEngineSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

OutdoorEngineSkill.prototype.intentHandlers = {

    //
    "ReccomendActivityIntent": function (intent, session, response) {
        console.log('executing GetZipCodeIntent');
        console.log(JSON.stringify(intent));
        console.log(JSON.stringify(session));
        handleReccomendActivityRequest(intent, session, response);
    },

    "UpdateZipCodeIntent": function (intent, session, response) {
        handleUpdateZipCodeRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "With Outdoor Engine, you can get an outdoor activity recommendation based on the weather in your area.  " +
            "For example, you could say Outdoor Engine, what should I do today?";
        var repromptText = "What is your zip code?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    }
};

/**
 * Function to handle the onLaunch skill behavior
 */

function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var cardTitle = "Outdoor Engine";
    var repromptText = "With Outdoor Engine, you can get an outdoor activity recommendation based on the weather in your area.  " +
            "For example, you could say Outdoor Engine, what should I do today?";
    var speechText = "<p>With Outdoor Engine, you can get an outdoor activity recommendation based on the weather in your area.</p> <p>To get a reccomendation ask Outdoor Engine, What should I do today?</p>";
    var cardOutput = "Outdoor Engine. What is your zip code?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard(speechOutput, repromptOutput, cardTitle, cardOutput);
};

/**
 * Gets a poster prepares the speech to reply to the user.
 */
function handleReccomendActivityRequest(intent, session, response) {

    console.log('intent.slots.ZIPCODE.value is ' + intent.slots.ZIPCODE.value);
    var repromptText = "With Outdoor Engine, you can get a reccomended outdoor activty based on the weather in your area? First what is your zip code?";
    
    var sessionAttributes = {};
    var zipcode = intent.slots.ZIPCODE.value;

    // If the user provides a date, then use that, otherwise use today
    // The date is in server time, not in the user's time zone. So "today" for the user may actually be tomorrow
    if (zipcode === "") {
        response.ask('OK. What is your zip code?', 'What is your zipcode?');
    }
    else {
        //
        // storage.loadUser(session, function (currentUser) {
        //     if (currentUser.data.zipcode.length === 0) {
        //         response.ask('To get started, What is your zipcode?');
        //         return;
        //     }
        //     currentUser.save(function () {
        //         var speechOutput = 'New zipcode '
        //             + currentGame.data.zipcode.length;
        //         speechOutput += '.';
        //         if (skillContext.needMoreHelp) {
        //             speechOutput += '. You can give a player points, add another player, reset all players or exit. What would you like?';
        //             var repromptText = 'You can give a player points, add another player, reset all players or exit. What would you like?';
        //             response.tell(speechOutput);
        //         } 
        //     });
        // });
        //Have Zip - get Lat Long and Weather
        var cardTitle = "Outdoor Engine Activty Reccomendation";
        var repromptText = "With Outdoor Engine, you can get an outdoor activity recommendation based on the weather in your area.  " +
            "For example, you could say Outdoor Engine, what should I do today?";
        var speechText = "<p>The weather for the next 3 hours is forecasted to be 50 to 65 degrees with winds below 10 miles an hour.</p> <p>Time to head to the water to get your surf or paddle on!</p>";
        var cardOutput = "The weather for the next 3 hours is forecasted to be 50 to 65 degrees with winds below 10 miles an hour.Time to head to the water to get your surf or paddle on!";
        response.tellWithCard(speechText, cardTitle, cardOutput);
    };

    //var prefixContent = "<p>For " + monthNames[date.getMonth()] + " " + date.getDate() + ", </p>";
    // var cardContent = "For " + monthNames[date.getMonth()] + " " + date.getDate() + ", ";

    

};





// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HistoryBuff Skill.
    var skill = new OutdoorEngineSkill();
    skill.execute(event, context);
};

