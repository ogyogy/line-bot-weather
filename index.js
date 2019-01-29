'use strict';

const line = require('@line/bot-sdk');
const express = require('express');
const request = require('request');
const common = require('./common');

const citys = common.citys;
const days = common.days;
const emojis = common.emojis;

// create LINE SDK config from env variables
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// event handler
function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }
    var str = event.message.text;
    var id = null;
    for (var key in citys) {
        if (str.match(key)) {
            id = citys[key];
            break;
        }
    }
    if (id) {
        request.get({
            url: 'http://weather.livedoor.com/forecast/webservice/json/v1',
            qs: {
                city: id
            },
            json: true
        }, function (error, response, body) {
            var idx = 0;
            var day = '今日'
            for (var key in days) {
                if (str.match(key)) {
                    idx = days[key];
                    day = key;
                    break;
                }
            }
            var msg = `${day}の天気情報が取得できませんでした`;
            if (body.forecasts[idx]) {
                // 日付
                msg = `${body.forecasts[idx].dateLabel}は ${body.forecasts[idx].date}\n`;
                // 天気
                msg = `${msg}${body.title}\n${body.forecasts[idx].telop}`;
                var len = body.forecasts[idx].telop.length
                if (len >= 4) {
                    msg = `${msg} ${emojis[body.forecasts[idx].telop.charAt(0)]}${emojis[body.forecasts[idx].telop.charAt(len - 1)]}\n`;
                } else {
                    msg = `${msg} ${emojis[body.forecasts[idx].telop.charAt(0)]}\n`;
                }
                // 気温
                if (body.forecasts[idx].temperature.max && body.forecasts[idx].temperature.max.celsius) {
                    msg = `${msg}最高気温 ${body.forecasts[idx].temperature.max.celsius}℃\n`;
                }
                if (body.forecasts[idx].temperature.min && body.forecasts[idx].temperature.min.celsius) {
                    msg = `${msg}最低気温 ${body.forecasts[idx].temperature.min.celsius}℃\n`;
                }
                // リンク
                msg = `${msg}${body.link}`;
            }

            // create a echoing text message
            var echo = { type: 'text', text: msg };

            // use reply API
            return client.replyMessage(event.replyToken, echo);
        });
    } else {
        var msg = '未対応の都道府県です';

        // create a echoing text message
        var echo = { type: 'text', text: msg };

        // use reply API
        return client.replyMessage(event.replyToken, echo);
    }
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});