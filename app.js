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
var appId = '3e120bda-16f9-4fc5-90d9-f09f05f36360' || "Missing your app ID";
var appPassword = 'i0hHRbgH7smaNTJLu1z8sAE' || "Missing your app Secret"; 

var connector = new builder.ChatConnector({ appId: appId, appPassword: appPassword});
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