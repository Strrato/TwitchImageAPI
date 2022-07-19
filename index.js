require('dotenv').config();
const TwitchApi = require("node-twitch").default;
const express = require('express');
const app = express();
const APPLICATION_TOKEN = process.env.APPLICATION_TOKEN;
const fs = require('fs');
const cors = require('cors');

let cache = require('./assets/cache/users.json');
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

app.listen(3000, () => {
  console.log('Server listen on port 3000');
});


app.get('/api/userimage/:ids', (req, res) => {
  console.log('get on api/userimage');

  let headerToken = req.header('X-AUTH-TOKEN');
  if ( typeof headerToken === typeof void(0) || !headerToken){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  let apiToken = Buffer.from(headerToken, "base64").toString("utf-8");
  if ( apiToken !== APPLICATION_TOKEN ){
    res.status(403).send("UNAUTHORIZED");
    return;
  }

  let ids = req.params.ids;
  
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

  let i = 0;
  for(let id of arIds){
    if (!id){
      arIds.splice(i, 1);
      continue;
    }
    let image = getCache(id);
    if (typeof image !== typeof void(0) && image !== null){
      console.log(`cache ${id} found`);
      results[id] = image;
    }
    arIds.splice(i, 1);
    i++;
  }

  if (arIds.length === 0){
    console.log('send results from cache');
    res.status(200).send(JSON.stringify(results));
    return;
  }

  // Call twitch API
  twitch.getUsers(ids).then(result => {
    for(let data of result.data){
      results[data.id] = data.profile_image_url;
      addCache(data.id, data.profile_image_url);
    }

    res.status(200).send(JSON.stringify(results));

  }).catch(err => {
    console.log(err);
    res.status(500).send("Twitch api error");
  })
});