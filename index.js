require('dotenv').config();
const TwitchApi = require("node-twitch").default;
const express = require('express');
const app = express();
const APPLICATION_TOKEN = process.env.APPLICATION_TOKEN;
const fs = require('fs');
const cors = require('cors');

let cache = {};
let usersCache;

const twitch = new TwitchApi({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET
});

const getCache = (userId) => {
  return cache[userId];
};

const addCache = (userId, userImage) => {
  cache[userId] = userImage;
  let strCache = JSON.stringify(cache, null, 2);
  fs.writeFile("./assets/cache/users.json", strCache, err => {
    if (err){
      console.log("Error writing cache user", err);
    }else {
      console.log("Cache user written");
    }
  })
};

app.use(cors({
  origin: '*'
}));

app.listen(2000, () => {
  console.log('Server listen on port 2000');
});

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.get('/api/userimage/:ids', (req, res) => {
  console.log('get on api/userimage');

  let headerToken = req.header('X-AUTH-TOKEN');
  if ( typeof headerToken === typeof void(0) || !headerToken){
    res.status(403).send("UNAUTHORIZED 1");
    return;
  }

  if ( headerToken !== APPLICATION_TOKEN ){
    res.status(403).send("UNAUTHORIZED 2");
    return;
  }

  let ids = req.params.ids;
  
  if (typeof ids === typeof void(0) || ids === ""){
    res.status(404).send("Missings ids in request");
    return;
  }

  let arIds = ids.split('_');
  if (arIds.length < 1){
    res.status(404).send("Invalid ids format");
    return;
  }
  let results = {};

  for(let i in arIds){
    let id = arIds[i];
    if (typeof cache[id] !== typeof void(0)){
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