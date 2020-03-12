const axios = require('axios');
require('dotenv').config();
const knex = require('knex')(require('./knex'));
const Twit = require('twit');

let T = new Twit({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token:         process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_SECRET
});

const tweeting = (tweet, statusId) => {
  return new Promise((resolve, reject) => {
    console.log(tweet)
    T.post('statuses/update', { status: tweet, in_reply_to_status_id: statusId }, (err, data, response) => {
        if (err) {
            reject(err);
        } else {
            resolve(data);
        }
    })
})
}

exports.main = async (req, res) => {
  try {
    const { data } = await axios.get(process.env.GET_URL);
    const countries = data.features;
    const dbCountries = await knex(process.env.TABLE).select();

    for (let i = 0; i < countries.length; i++) {
      const newCountries = countries[i].attributes;
      let check = false

      for (let j = 0; j < dbCountries.length; j++) {

        if (String(dbCountries[j].name) == String(newCountries.Country_Region)) {
          check = true;
          if (dbCountries[j].confirmed !== newCountries.Confirmed || dbCountries[j].deaths !== newCountries.Deaths || dbCountries[j].recovered !== newCountries.Recovered) {
            let tweetData = await tweeting(`[${newCountries.Country_Region}] Confirmed: ${newCountries.Confirmed} | Recovered: ${newCountries.Recovered} | Deaths: ${newCountries.Deaths}`, dbCountries[j].tweet_id);
            await knex(process.env.TABLE).where({
              name: newCountries.Country_Region
            }).update({
              confirmed: newCountries.Confirmed,
              deaths: newCountries.Deaths,
              recovered: newCountries.Recovered,
              tweet_id: tweetData.id_str
            });
            console.log('=== new updates ===');
            console.log(newCountries);
            console.log('=====================');
          }
        }

      }

      if (!check) {
        let tweetData = await tweeting(`[${newCountries.Country_Region}] Confirmed: ${newCountries.Confirmed} | Recovered: ${newCountries.Recovered} | Deaths: ${newCountries.Deaths}`, null);
        await knex(process.env.TABLE).insert({
          name: newCountries.Country_Region,
          confirmed: newCountries.Confirmed,
          deaths: newCountries.Deaths,
          recovered: newCountries.Recovered,
          tweet_id: tweetData.id_str
        });
        console.log('=== new countries ===');
        console.log(newCountries);
        console.log('=====================');
      }

    }

    res.status(200).json({
      message: '#dedelpict'
    });
  } catch (err) {
    console.log(err)
    res.status(500).json({
      message: '#dedelpict',
      error: JSON.stringify(err)
    });
  }
}