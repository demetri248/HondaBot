/* 
Bot is powered by LuisDialog to to give the bot a more naturallanguage interface.
The bot can be woken up by typing hello, Bot greets the users and then users can ask questions.
The basic idea is that before we can answer a question we need to know the hondaModel 
to answer the question for. This is the “context” of the question. We’re using a 
LUIS model to identify the question the user would like asked and so for every 
intent handler we have the same two basic steps which we’re representing using a 
waterfall. 

The first step of our waterfall is a function called askHondaModel(). This function 
determines the current hondaModel in one of 3 ways. First it looks to see if the 
hondaModel was passed to us from an LUIS as an entity. This would be the case for a 
query like “what are the features of Pilot?”. If there was no hondaModel passed from LUIS 
then we check to see if we just answered a question about a hondaModel, if so we’ll 
use that as the current context. Finally, if the hondaModel wasn’t passed in and 
there is a current context then we’ll ask the user the name of the hondaModel to use.

In any case the output of askHondaModel() is passed to the second step of the 
waterfall which is a function called answerQuestion(). This function checks to see 
if the hondaModel was passed in (the only way it wouldn’t be is if the user said 
‘nevermind’ when asked for the hondaModel) and then sets that hondaModel to be the 
context for future questions and returns an answer for data that was asked for. 

# INSTALL THE MODEL

    The sample is coded to use a version of the LUIS models deployed to Razorfish 
    LUIS account. This model is rate limited and intended for prototype use only.
    
    Import the model as an Appliction into your LUIS account (http://luis.ai) and 
    assign the models service url to an environment variable called model.
    
         set model="MODEL_URL"

# RUN THE BOT:

    Run the bot from the command line using "node app.js" and then try saying the 
    following.

    Say: what are features of pilot?
    
    Say: what are safety features of pilot?
    
    Say: how much does it cost?
    
    Say: do you have any offers?

-----------------------------------------------------------------------------
*/

var restify = require('restify'); 
var builder = require('botbuilder'); 
var prompts = require('./prompts');
var data = require('./data');

//Add Emoji's 
var emoji = require('node-emoji');


// Create chat bot
var appId = '3e120bda-16f9-4fc5-90d9-f09f05f36360' || "Missing your app ID";
var appPassword = 'i0hHRbgH7smaNTJLu1z8sAE' || "Missing your app Secret"; 

var connector = new builder.ChatConnector({ appId: appId, appPassword: appPassword});
var hondaBot = new builder.UniversalBot(connector);


// // Create bot dialogs
// bot.dialog('/', function (session) {
//     session.send("Hello World");
// });


// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.

//Old
//var model = 'https://api.projectoxford.ai/luis/v1/application?id=2d574c18-23f5-43f6-ba67-ec79d0b8b680&subscription-key=2e9c14bf6298400f881d3106f76dcbb0';

// Demetri's LUIS
var model = 'https://api.projectoxford.ai/luis/v1/application?id=2d574c18-23f5-43f6-ba67-ec79d0b8b680&subscription-key=c90d1d99ef644f17ae5d288b3b7d9ea4'
var recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
hondaBot.dialog('/', intents);
intents.matches('Help', '/help');

//console.log(session.messages.text);

// Intents.matches
intents.matches(/^echo/i, [
    function (session) {
        builder.Prompts.text(session, "What would you like me to say?");
    },
    function (session, results) {
        session.send('Ok... %s', results.response);
    }
]);




// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.PORT || 3000, function() 
{
   console.log('%s listening to %s', server.name, server.url); 
});
server.post('/api/messages', connector.listen());

server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html'
}));



/** Answer website related questions like "give me all features of pilot?" */


/** Answer website related questions like "give me all features of pilot?" */
intents.matches('features', [askHondaModel, answerQuestion('features', prompts.answerFeatures)]);


/** 
 * This function the first step in the waterfall for intent handlers. It will use the hondaModel mentioned
 * in the users question if specified and valid. Otherwise it will use the last hondaModel a user asked 
 * about. If it the hondaModel is missing it will prompt the user to pick one. 
 */
function askHondaModel(session, args, next) {
    // First check to see if we either got a hondaModel from LUIS or have a an existing hondaModel
    // that we can multi-turn over.
    
    var hondaModel;
    //console.log(args);

    var entity = builder.EntityRecognizer.findEntity(args.entities, 'Model');

    if (entity) {
        // The user specified a hondaModel so lets look it up to make sure its valid.
        // * This calls the underlying function Prompts.choice() uses to match a users response
        //   to a list of choices. When you pass it an object it will use the field names as the
        //   list of choices to match against. 
        //If entity.entity is civic or accord prompt user to pick proper civic or accord

        hondaModel = builder.EntityRecognizer.findBestMatch(data, entity.entity);
        
    } else if (session.dialogData.hondaModel) {
        // Just multi-turn over the existing hondaModel
         
        hondaModel = session.dialogData.hondaModel;
    }
    
    // Prompt the user to pick a model if they didn't specify a valid one.
    if (!hondaModel) {
        // Lets see if the user just asked for a model we don't know about.
        var txt = entity ? session.gettext(prompts.hondaModelUnknown, { hondaModel: entity.entity }) : prompts.hondaModelUnknown;
        console.log("inside not mode. "+txt);
        // Prompt the user to pick a model from the list. They can also ask to cancel the operation.
         console.log("hi");
        builder.Prompts.choice(session, txt, data);

    } else {
        // Great! pass the model to the next step in the waterfall which will answer the question.
        // * This will match the format of the response returned from Prompts.choice().
        next({ response: hondaModel })
    }
}


/**
 * This function generates a generic answer step for an intent handlers waterfall. The hondaModel to answer
 * a question about will be passed into the step and the specified field from the data will be returned to 
 * the user using the specified answer template. 
 */
function answerQuestion(field, answerTemplate) {
    return function (session, results) {
        // Check to see if we have a hondaModel. The user can cancel picking a hondaModel so IPromptResult.response
        // can be null. 
        if (results.response) {
            // Save hondaModel for multi-turn case and compose answer            
            var hondaModel = session.dialogData.hondaModel = results.response;
            var answer = { hondaModel: hondaModel.entity, value: data[hondaModel.entity][field] };
            session.send(answerTemplate, answer);
        } else {
            session.send(prompts.cancel);
        }
    };
}

/** 
 * This function handles general questions related to honda, which may not be model specific.
 */

function answerGeneralHonda(field, answerTemplate) {
    return function (session, results) {
          console.log("inside general honda");
           //console.log(emoji.get('coffee'));
            var answer = { value: general[field] };
            session.send(answerTemplate, answer);

    };
}

/*
function askIntro(session, args, next) {
    
        // Great! pass the model to the next step in the waterfall which will answer the question.
        // * This will match the format of the response returned from Prompts.choice().
         var introAnswer;
        if(session.userData.name)
        {
           console.log(session.userData.name);
          //  session.send("Hi %s, I can help you with questions about Honda Cars", session.userData.name); 
           introAnswer = "Hi" + session.userData.name;

        }
         else
         {
          introAnswer = "Hi, I can help you with questions about Honda Cars";
         }
       
        next({ response: introAnswer })
       
    }





function answerIntro(field, answerTemplate) {
    return function (session, results) {
          console.log("inside Hi honda");
          
          var answer = results.response;
         // var answer = (emoji.emojify('I :heart: :coffee:!'))
           session.send(answerTemplate, answer);
           // session.send((emoji.emojify('I :heart: :coffee:!')));
            
    };
}

**/

function askInvalidQuestion(session, args, next) {
    
        // Great! pass the model to the next step in the waterfall which will answer the question.
        // * This will match the format of the response returned from Prompts.choice().
        console.log(session.userData.name);
        next({ response: args })
    }



/** 
 * This function handles general questions related to honda, which may not be model specific.
 */

function answerInvalidQuestions(field, answerTemplate) {
    return function (session, results) {
          console.log("inside Invalid honda");
          
          var answer = { value: general[field] };
         // var answer = (emoji.emojify('I :heart: :coffee:!'))
           session.send(answerTemplate, answer);
           // session.send((emoji.emojify('I :heart: :coffee:!')));
            
    };
}
