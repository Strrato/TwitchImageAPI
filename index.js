require('dotenv').config();
const TwitchApi = require("node-twitch").default;
const express = require('express');
const app = express();
const APPLICATION_TOKEN = process.env.APPLICATION_TOKEN;
const cors = require('cors');
const SECURITY_REGEX = /["'`]+/;
const fetch = require('node-fetch');

let cache = {};
let cacheCreated = new Date();

const twitch = new TwitchApi({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET
});

app.use(cors({
  origin: '*'
}));

app.listen(2000, () => {
  console.log('Server listen on port 2000');
});

app.get('/', (req, res) => {
  res.send('Hello World!')
});

function getHoursDiff(startDate, endDate) {
  var msInHour = 1000 * 60 * 60;
  return Math.round(Math.abs(endDate - startDate) / msInHour);
}


function getSteamDescription(gameName)
{
  gameName = gameName.toLowerCase();
  throwErr = true;
  return new Promise((resolve, reject) => {
    var result = {};
    // Try to get steam description
    fetch('https://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json')
    .then(res => res.json())
    .then(json => {
        if (typeof json.applist !== typeof void(0) && json.applist.apps.length > 0){
          for(var o of json.applist.apps){
            if (gameName === o.name.toLowerCase()){
              throwErr = false;
              fetch('https://store.steampowered.com/api/appdetails?l=french&appids=' + o.appid)
              .then(res => res.json())
              .then(gameData => {
                result = gameData[Object.keys(gameData)[0]];
                if (result.success){
                  resolve(result);
                }else {
                  reject('Not found');
                }
              });
            }
          }
          if (throwErr){
            reject('Not found');
          }
        }
    });
  });

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

app.get('/api/gameimage/:id', (req, res) => {
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

  twitch.getStreams({ channel : id }).then(result => {
    if (result.data.length > 0){
      let data = result.data[0];

      twitch.getGames(data.game_id).then(result2 => {
        if (result2.data.length > 0){
          let gameInfo = {
            game : result2.data[0],
            data : data,
            description : null
          };

          // Try to get steam description
          getSteamDescription(gameInfo.game.name).then(result3 => {
            gameInfo.description = result3.data.short_description;
            res.status(200).send(JSON.stringify(gameInfo));
          }, err => {
            res.status(200).send(JSON.stringify(gameInfo));
          });

        }else {
          res.status(500).send("Cannot get game info");
        }
      }).catch(err => {
        console.log(err);
        res.status(500).send("Twitch api error");
      })
      return;
    }

    res.status(500).send("Offline");
  }).catch(err => {
    console.log(err);
    res.status(500).send("Twitch api error");
  })
});