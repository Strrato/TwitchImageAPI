require('dotenv').config();
const fs = require("fs");
const gameUrlCacheFile = "./assets/cache/gamesurls.json";
const https = require('https');

const SUBSCRIPTION_KEY = process.env.AZURE_SUBSCRIPTION_KEY;
if (!SUBSCRIPTION_KEY) {
  throw new Error('AZURE_SUBSCRIPTION_KEY is not set.')
}

function getGameUrlCache()
{

  let res = {};

  try {
    const data = fs.readFileSync(gameUrlCacheFile, { encoding: "utf8", flag : 'r' });
    if (data){
      res = JSON.parse(data);
    }
  }catch(e){
    console.log(e);
  }
  
  return res;
}

function cacheGameUrl(gameName, url)
{
  try {
    let cache = getGameUrlCache();
    cache[gameName] = url;
    fs.writeFileSync(gameUrlCacheFile, JSON.stringify(cache));
  }catch(e){

  }
}


function deleteFromCacheUrl(gameName)
{
  try {
    let cache = getGameUrlCache();
    if (typeof cache[gameName] !== typeof void(0)){
      delete cache[gameName];
      fs.writeFileSync(gameUrlCacheFile, JSON.stringify(cache));
    }
  }catch(e){

  }

}

async function getInstantLink(gameName)
{

  let cache = getGameUrlCache();
  if (typeof cache[gameName] !== typeof void(0)){
    console.log('load game url from cache');
    return cache[gameName];
  }

  let query = `site:instant-gaming.com pc acheter "${gameName}"`;

  let results = await bingWebSearch(query);
  console.dir(results, {depth: null});
  let url = null;

  if (typeof results.webPages !== typeof void(0) && results.webPages.value.length > 0){
    const urlPattern = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
    const instantPattern = /(https?:\/\/www.instant-gaming.com\/[A-z]{2}\/\d+-[A-Za-z0-9\-\/]+)/;

    for(let i in results.webPages.value){
      let val = results.webPages.value[i];
      if (urlPattern.test(val.displayUrl) && instantPattern.test(val.displayUrl)){
        url = val.displayUrl;
        break;
      }
    }
  }

  if (url !== null){
    console.log("Url found for game: ", gameName, url);
    cacheGameUrl(gameName, url);
  }
  
  return url;
}

function bingWebSearch(query) {

  return new Promise((resolve, error) => {
    https.get({
      hostname: 'api.bing.microsoft.com',
      path:     '/v7.0/search?q=' + encodeURIComponent(query),
      headers:  { 'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY },
    }, res => {
      let body = ''
      res.on('data', part => body += part)
      res.on('end', () => {
        resolve(JSON.parse(body));
      })
      res.on('error', e => {
        error(e);
      })
    })
  });
}

module.exports = { deleteFromCacheUrl, getInstantLink, cacheGameUrl };