const fs = require('fs');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

var app = express();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 8080;

wss.on('connection', function connection(ws) {
  ws.binaryType = 'arraybuffer';
  ws.on('error', console.error);

  ws.uuid = ws._socket.remoteAddress;

  ws.on('message', function message(data) {
    console.log(`L${data.toString()}`);
    newActivity(ws.uuid);

    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(`L${data.toString()}`);
      }
    });
  });

  ws.send('You are connected!');
});

server.listen(port, () => {
  console.log(`Websocket server started on port ` + port);
});

app.get('/click-analytics', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const analytics = getActivity();
  res.send(JSON.stringify(analytics));
});

const filepath = '/data/click.analytics.json';
function newActivity(uuid) {
  let rawdata;
  let dataRead = [];
  if (fs.existsSync(filepath)) {
    rawdata = fs.readFileSync(filepath);
    dataRead = JSON.parse(rawdata);
  }

  dataRead.push({ uuid: uuid, timestamp: new Date() });

  let data = JSON.stringify(dataRead);
  fs.writeFileSync(filepath, data);
}

function getActivity() {
  if (fs.existsSync(filepath)) {
    let rawdata = fs.readFileSync(filepath);
    let dataRead = JSON.parse(rawdata);

    result = dataRead.reduce(function (r, a) {
      r[a.uuid] = r[a.uuid] || [];
      r[a.uuid].push(a);
      return r;
    }, Object.create(null));

    return { users: Object.keys(result).length, clicks: dataRead.length };
  }
}
