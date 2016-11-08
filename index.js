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
var http = require('http');
var parseString = require('xml2js').parseString;
/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill'); 
var storage = require('./storage'); 



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

    "ReccomendActivityIntent": function (intent, session, response) {
        console.log('executing Reccomend Activity Intent');
        console.log('intent is ' + JSON.stringify(intent));
        console.log('session is ' + JSON.stringify(session));
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
    var validZip = new RegExp("^[0-9]{5}$");
    if (zipcode != "00000" && validZip.test(zipcode)) {
        console.log("Valid");
    } else {
        console.log("Invalid");
        response.ask("I didn/'t understand, What is your zipcode?");
        return;
    }
    console.log('calling storage.loadUser');
    storage.loadUser(session, function (currentUser) {
        if (currentUser && zipcode.length === 0) {
            response.ask('To get started, What is your zipcode?');
            return;
        }
        else {
            // store zip and get lat long
            currentUser.data.zipcode = zipcode;
            console.log('calling makeWeatherRequest');
            var weatherResults = {};
            weatherResults = makeWeatherRequest(zipcode, function (lat, long, minTemperature, maxTemperature, reccomendation) {
                currentUser.data.lat = lat;
                currentUser.data.long = long;
                console.log('returning activity suggestion')
                currentUser.save(function () {

                    var cardTitle = "Outdoor Engine Activty Reccomendation";
                    var repromptText = "With Outdoor Engine, you can get an outdoor activity recommendation based on the weather in your area.  " +
                        "For example, you could say Outdoor Engine, what should I do today?";
                    var speechText = "";
                    var cardOutput = "";

                    switch(reccomendation) {
                        case "surf":
                            speechText = "With a high of " + maxTemperature + "  degrees with winds below 10 miles an hour, It is time to head to the water to get your surf or paddle on!"
                            cardOutput = "<p>With a high of " + maxTemperature + "  degrees with winds below 10 miles an hour, it is time to head to the water to get your surf or paddle on!</p>";
                            break;
                        case "run":
                            speechText = "With a high of " + maxTemperature + "  degrees with winds above 10 miles an hour, lace up your running shoes and get your run on!"
                            cardOutput = "<p>With a high of " + maxTemperature + "  degrees with winds below 10 miles an hour, lace up your running shoes and get your run on!</p>";
                            break;
                        case "cold":
                            speechText = "With a high of only " + maxTemperature + ", brrrr it is coooold! It is time to make some hot chocolate! Stay warm!"
                            cardOutput = "<p>With a high of " + maxTemperature + ", brrrr it is coooold! It is time to make some hot chocolate! Stay warm!</p>";
                            break;
                        case "rainy":
                            speechText = "Looks like rain today. Take a rest and go catch a movie!"
                            cardOutput = "<p>Looks like rain today. Take a rest and go catch a movie!</p>";
                            break;
                        case "snowing":
                            speechText = "Woo dog it's snowing! Grab your boards and go ride some powder!"
                            cardOutput = "<p>Woo dog it's snowing! Grab your boards and go ride some powder!/p>";
                            break;
                        case "crosscountry":
                            speechText = "It's cold out there, but it is winter. Grab the cross country skiis or snowbike and hit the trails!"
                            cardOutput = "<p>It's cold out there, but it is winter. Grab the cross country skiis or snowbike and hit the trails!</p>";
                            break;    
                        case "error":
                            speechText = "We had a communications error with the weather service. Do you want to try again?"
                            cardOutput = "<p>We had a communications error with the weather service. Do you want to try again?</p>";
                            break; 
                        default:
                            speechText = "Houston we got a problem. "
                            cardOutput = "<p>Houston we got a problem.</p>";
                    }
                   
                    response.tellWithCard(speechText, cardTitle, cardOutput);    
                }); 
            });
        }
    });
    
};




/**
 * Uses NOAA.gov API, documented: http://graphical.weather.gov/xml/SOAP_server/ndfdXMLclient.php
 */
function makeWeatherRequest(zip, callback) {
    console.log('in makeGetLatLongRequest');
    //var datum = "MLLW";
    var endpoint = 'http://graphical.weather.gov/xml/SOAP_server/ndfdXMLclient.php?whichClient=NDFDgenMultiZipCode&zipCodeList=' + zip +'&product=time-series&maxt=maxt&mint=mint&wspd=wspd&wx=wx&wgust=wgust&wwa=wwa&Submit=Submit';
    //var queryString = '?' + date.requestDateParam;
    //queryString += '&station=' + station;
    //queryString += '&product=predictions&datum=' + datum + '&units=english&time_zone=lst_ldt&format=json';
    console.log(endpoint);
    console.log('callling NOAA');

    var lat, long, minTemperature, maxTemperature, rainy;
    var rainy = "No";
    var windy, weatherCondition, hazards = [];
    var reccomendation;
  
    http.get(endpoint, function (res) {
        console.log('in http.get');
        var noaaResponseString = '';
        console.log('Status Code: ' + res.statusCode);

        if (res.statusCode != 200) {
            console.og('Error' + res.statusCode);
            reccomendation = 'error';
            callback(lat, long, minTemperature, maxTemperature,reccomendation);
        }

        res.on('data', function (data) {
            noaaResponseString += data;
        });

        res.on('end', function () {
            console.log('in res.on end is ' + noaaResponseString);
            parseString(noaaResponseString, function (err, result) {
                console.log('json parse result ' + JSON.stringify(result));
                
                lat = result.dwml.data[0].location[0].point[0].$.latitude;
                long = result.dwml.data[0].location[0].point[0].$.longitude;
                minTemperature = result.dwml.data[0].parameters[0].temperature[0].value[0];
                maxTemperature = result.dwml.data[0].parameters[0].temperature[1].value[0];
                rainy = "No";
                windy = [];
                weatherCondition = [];
                hazards = [];
                for (i = 0; i< 5; i++) {
                  windy[i] = result.dwml.data[0].parameters[0]['wind-speed'][0].value[i];
                  try {
                    if( result.dwml.data[0].parameters[0].weather[0]['weather-conditions'][i] !==  "") {
                    weatherCondition[i] = result.dwml.data[0].parameters[0].weather[0]['weather-conditions'][i].value[0].$['weather-type'];
                    }
                    else {
                     weatherCondition[i] = "Sunny";
                    };
                  }
                  catch (e) {
                    console.error("inner", e.message);
                    weatherCondition[i] = "Sunny"
                  }
                  if ( typeof(result.dwml.data[0].parameters[0].hazards[0]['hazard-conditions'][i]) !== "undefined") {
                    hazards[i] = "none"; 
                  }
                  else {
                    hazards[i] = result.dwml.data[0].parameters[0].hazards[0]['hazard-conditions'][i]; 
                  };
                    
                  console.log(i + ' windy ' + windy[i] + 
                    ' weather condition ' + weatherCondition[i] + ' hazards ' + hazards[i]);
                }
                
                var today = new Date();
                var month = today.getMonth() + 1;
                //weatherCondition[2] = "snow";
                var hour = today.getHours();
                console.log('month ' + month);
                console.log('starting reccomendation if');
                
                if ((month >= 4 && month <= 10) || (lat < 37)) {
                    if (!(weatherCondition[0].includes('rain')) && (!weatherCondition[0].includes('snow')) && (!weatherCondition[1].includes('rain')) && (!weatherCondition[1].includes('snow')) && (!weatherCondition[2].includes('rain')) && (!weatherCondition[2].includes('snow')) && (maxTemperature > 40)) {
                        if ((windy[0] < 11) && (windy[1] < 11) && (windy[2] < 11) && (windy[3] < 11) && (windy[4] < 11)) {
                            console.log('go surf / paddle');
                            reccomendation = 'surf';
                        }
                        else {
                            console.log('go for a run in the woods and stay dry');
                            reccomendation = "run";
                        }
                    }
                    else if (!(weatherCondition[0].includes('rain')) && (!weatherCondition[0].includes('snow')) && (!weatherCondition[1].includes('rain')) && (!weatherCondition[1].includes('snow')) && (!weatherCondition[2].includes('rain')) && (!weatherCondition[2].includes('snow')) && (maxTemperature < 40)) {
                        console.log('its cold out there. Grab a hot chocolate');
                        reccomendation = "cold";
                    }
                    else if (((weatherCondition[0].includes('rain')) || (weatherCondition[1].includes('rain')) ||  (weatherCondition[2].includes('rain'))) && ((!weatherCondition[0].includes('snow')) && (!weatherCondition[1].includes('snow')) && (!weatherCondition[2].includes('snow'))) && (maxTemperature > 40)) {
                        console.log('its rainy out there. Go catch a movie');
                        reccomendation = "rainy";
                    }
                    else if (((weatherCondition[0].includes('rain')) || (weatherCondition[1].includes('rain')) ||  (weatherCondition[2].includes('rain'))) && ((!weatherCondition[0].includes('snow')) && (!weatherCondition[1].includes('snow')) && (!weatherCondition[2].includes('snow'))) && (maxTemperature < 40)) {
                        console.log('its cold out there. Grab a hot chocolate');
                        reccomendation = "cold";
                    }
                }
                else if ((month >= 11 || month < 4) && (lat > 37)) {
                    if ((weatherCondition[0].includes('snow')) || (weatherCondition[1].includes('snow')) ||  (weatherCondition[2].includes('snow'))) {
                        console.log('its snowing! Grab the boards and hit the slopes');
                        reccomendation = "snowing";
                    }
                    else if (!(weatherCondition[0].includes('rain')) && (!weatherCondition[0].includes('snow')) && (!weatherCondition[1].includes('rain')) && (!weatherCondition[1].includes('snow')) && (!weatherCondition[2].includes('rain')) && (!weatherCondition[2].includes('snow'))) {
                        console.log('go cross country ski, snowbike or snowshoe');
                        reccomendation = "crosscountry";
                    }
                
                }
                

                callback(lat, long, minTemperature, maxTemperature,reccomendation);
            });
            
            // if (noaaResponseObject.error) {
            //     console.log("NOAA error: " + noaaResponseObj.error.message);
            //     //tideResponseCallback(new Error(noaaResponseObj.error.message));
            // } else {
            //     console.log('in noaa else')
            
            //     //var highTide = findHighTide(noaaResponseObject);
            //     //tideResponseCallback(null, highTide);
            // }
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        reccomendation = "error";
        callback(lat, long, minTemperature, maxTemperature, reccomendation);
    });
}









// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the HistoryBuff Skill.
    var skill = new OutdoorEngineSkill();
    skill.execute(event, context);
};

