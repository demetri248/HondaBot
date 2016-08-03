// Add your requirements
var restify = require('restify'); 
var builder = require('botbuilder'); 

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.PORT || 3000, function() 
{
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat bot
var appId = process.env.MY_APP_ID || "Missing your app ID";
var appId = process.env.MY_APP_SECRET || "Missing your app Secret"; 

var connector = new builder.ChatConnector({ appId: process.env.MY_APP_ID, appPassword: process.env.MY_APP_SECRET });
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Create bot dialogs
bot.dialog('/', function (session) {
    session.send("Hello World");
});

server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html'
}));