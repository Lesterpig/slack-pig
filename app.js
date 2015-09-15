var MongoClient = require('mongodb').MongoClient;
var SlackBot    = require('slackbots');
var assert      = require('assert');
var config      = require('./config.json');

var recipes     = null; // To be defined when mongo connects

MongoClient.connect(config.mongo, function(err, db) {
  assert.equal(err, null);
  recipes = db.collection('recipes');
});

var bot = new SlackBot({
  token : config.token,
  name  : 'Pig'
});

bot.on('start', function() {
  console.log('-- Pig is READY.');
});

bot.on('message', function(data) {

  if(data.type !== 'message' || data.reply_to || !data.text) {
    return;
  }

  if(data.text.toLowerCase().substr(0,3) === '!co') {
    triggerCocktail(data);
  }
});

function triggerCocktail(message) {

  var search = {};
  var text   = message.text.substr(3).trim();

  if(text) {
    text   = text.replace(/[^\s]+/g, '"$&"'); // encapsulate words into double quotes
    search = {
      '$text' : { '$search' : text }
    }
  }

  var cursor = recipes.find(search);
  cursor.count(function(err, count) {
    if(err)         return console.log(err);
    if(count === 0) return sendMsg(message.user, ':no_entry_sign: No cocktail found :scream:');

    cursor.skip(getRandom(0, --count)).next(function(err, res) {
      if(err) return console.log(err);
      var str = ':cocktail: *_' + res.name + '_*';

      res.ingredients.forEach(function(i) {
        str  += '\n:black_small_square: ' + i;
      });

      if(res.instruction) {
        str  += '\n_' + res.instruction + '_';
      }

      if(!text) {
        str  += '\n:bulb: _Add keywords to filter results! `!co whisky cola` for instance :pig2:_';
      }

      sendMsg(message.user, str);
    });

  });

}

function sendMsg(to, msg) {
  bot.postMessage(to, msg, {
    icon_emoji: ':pig:'
  });
}

function getRandom(from, to) { // inclusive integer random
  return Math.floor(Math.random() * (to - from + 1)) + from;
}
