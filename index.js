require('dotenv').config();
const TwitchApi = require("node-twitch").default;
const express = require('express');
const app = express();
const APPLICATION_TOKEN = process.env.APPLICATION_TOKEN;
const cors = require('cors');
const SECURITY_REGEX = /["'`]+/;

const UrlScrapper = require('./assets/js/UrlScraper.js');
const GameInfo = require('./assets/js/GameInfo.js');
const admin = require('./admin.js');


let cache = {};
let cacheCreated = new Date();

let twitch = new TwitchApi({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET
});


app.use(cors({
  origin: '*'
}));

app.use(express.json());

app.listen(2000, () => {
  console.log('Server listen on port 2000');
});

app.get('/', (req, res) => {
  res.send('Hello World!')
});

admin.registerAdmin(app);

function getHoursDiff(startDate, endDate) {
  var msInHour = 1000 * 60 * 60;
  return Math.round(Math.abs(endDate - startDate) / msInHour);
}


app.get('/api/userimage/:ids', (req, res) => {
  console.log('get on api/userimage');

  let headerToken = req.header('X-AUTH-TOKEN');
  headerToken = headerToken.replace(SECURITY_REGEX, "Invalid");
  
  if ( typeof headerToken === typeof void(0) || !headerToken){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  if ( headerToken !== APPLICATION_TOKEN ){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  let ids = req.params.ids;
  ids = ids.replace(SECURITY_REGEX, "");
  if (typeof ids === typeof void(0) || ids === ""){
    res.status(404).send("Missings ids in request");
    return;
  }

  let arIds = ids.split(',');
  if (arIds.length < 1){
    res.status(404).send("Invalid ids format");
    return;
  }
  let results = {};

  let now = new Date();
  if (getHoursDiff(cacheCreated, now) >= 1){
    console.log("reset cache");
    cache = {};
    cacheCreated = new Date();
  }

  for(let i in arIds){
    let id = arIds[i];
    if (id in cache){
      results[id] = cache[id];
      arIds.splice(i, 1);
    }
  }

  if (arIds.length == 0){
    console.log('send images from cache');
    res.status(200).send(JSON.stringify(results));
    return;
  }

  // Call twitch API
  console.log('Call twitch api');
  twitch.getUsers(arIds).then(result => {
    for(let data of result.data){
      results[data.id] = data.profile_image_url;
      cache[data.id] = data.profile_image_url;
    }

    res.status(200).send(JSON.stringify(results));

  }).catch(err => {
    console.log(err);
    res.status(500).send("Twitch api error");
  })

});

app.get('/api/gameimage/:id', async (req, res) => {
  console.log('get on api/gameimage');

  let headerToken = req.header('X-AUTH-TOKEN');
  headerToken = headerToken.replace(SECURITY_REGEX, "Invalid");
  
  if ( typeof headerToken === typeof void(0) || !headerToken){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  if ( headerToken !== APPLICATION_TOKEN ){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  let id = req.params.id;
  id = id.replace(SECURITY_REGEX, "");

  console.log('Game info requested by', id);

  try {
    res.status(200).send(await GameInfo.getGameInfos(twitch, id));
  }catch(e){
    console.log(e);
    res.status(500).send(e);
  }
  return;
});

app.get('/api/renew', async (req, res) => {
  console.log('get on api/renew');

  let headerToken = req.header('X-AUTH-TOKEN');
  headerToken = headerToken.replace(SECURITY_REGEX, "Invalid");
  
  if ( typeof headerToken === typeof void(0) || !headerToken){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  if ( headerToken !== APPLICATION_TOKEN ){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  twitch = new TwitchApi({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  });

  res.status(200).send('OK');
  return;
});

app.get('/api/resetCache/:gameName', async (req, res) => {
  console.log('get on api/resetCache');

  let headerToken = req.header('X-AUTH-TOKEN');
  headerToken = headerToken.replace(SECURITY_REGEX, "Invalid");
  if ( typeof headerToken === typeof void(0) || !headerToken){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  if ( headerToken !== APPLICATION_TOKEN ){
    res.status(403).send("UNAUTHORIZED");
    return;
  }
  
  let gameName = decodeURIComponent(req.params.gameName);
  UrlScrapper.deleteFromCacheUrl(gameName);
  res.status(200).send("OK");
  return;
});

app.post('/api/setUrlCache', async (req, res) => {
  console.log('post on api/setUrlCache');

  let headerToken = req.header('X-AUTH-TOKEN');
  headerToken = headerToken.replace(SECURITY_REGEX, "Invalid");
  if ( typeof headerToken === typeof void(0) || !headerToken){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  if ( headerToken !== APPLICATION_TOKEN ){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  if (!req.body.name || !req.body.url){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  let gameName = req.body.name;
  let url = req.body.url;

  UrlScrapper.cacheGameUrl(gameName, url);

  res.status(200).send("OK");
  return;
});