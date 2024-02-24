require('dotenv').config();
const fetch = require('node-fetch');
const UrlScrapper = require('./UrlScraper.js');

const langMatches = {
    'fr' : 'french',
    'en' : 'english',
    'es' : 'spanish'
  };
  
  
function getSteamDescription(gameName, lang)
{
  gameName = gameName.toLowerCase();
  console.log('steam description requested', gameName);
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
              console.log('loading game description for : '+ gameName);
              console.log('Prefered language : ' + lang);
              fetch('https://store.steampowered.com/api/appdetails?l='+ lang +'&appids=' + o.appid)
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

function getGameInfos(twitch, id)
{
    return new Promise((resolve, reject) => {
        
        twitch.getStreams({ channel : id }).then(result => {
            if (result.data.length > 0){
                let data = result.data[0];

                twitch.getGames(data.game_id).then(async result2 => {
                    if (result2.data.length > 0){
                        let gameInfo = {
                            game : result2.data[0],
                            data : data,
                            description : null,
                            instantLink : null
                        };
                        console.log('ginfo', gameInfo);
                        let lang = typeof langMatches[data.language] !== typeof void(0) ? langMatches[data.language] : 'english';

                        let url = await UrlScrapper.getInstantLink(gameInfo.game.name);
                        gameInfo.instantLink = url;

                        // Try to get steam description
                        getSteamDescription(gameInfo.game.name, lang).then(result3 => {
                            gameInfo.description = result3.data.short_description;
                            resolve(JSON.stringify(gameInfo));
                        }, err => {
                            resolve(JSON.stringify(gameInfo));
                        });

                    }else {
                        reject("Cannot get game info");
                    }
                }).catch(err => {
                    console.log(err);
                    reject("Twitch api error");
                });
                return;
            }
            reject("Offline");
        }).catch(err => {
            console.log(err);
            reject("Twitch api error");
        })
    });
}

module.exports = { getGameInfos };