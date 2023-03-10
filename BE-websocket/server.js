const fs = require('fs');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    // origin: "http://localhost:8888",
    methods: ['GET', 'POST'],
  },
});

let waitingList = { l: {}, r: {} };
let socketFE1;

io.on('connection', (socket) => {
  // console.log("New user connected");
  socket.emit('connected', 'You are connected!');
  socket.broadcast.emit('connected', 'Another client has just connected!');

  socket.ip = socket.request.connection.remoteAddress;
  socket.uuid = uuidv4();

  socket.on('connectFE1', () => {
    console.log('FE1 connected');
    socket.fe = 1;
    socketFE1 = socket;
  });

  socket.on('waitingList', (msg) => {
    let freeSlot = checkFreeSlot();
    if (freeSlot && !isWsClientInGame(socket)) {
      waitingList[freeSlot] = { uuid: socket.uuid, ip: socket.ip };
      socket.position = freeSlot;
      // console.log(waitingList);
    }
  });

  socket.on('interaction', (msg) => {
    if (isWsClientInGame(socket)) {
      // console.log(`${socket.position}${msg}`);
      newActivity(socket.uuid);
      socketFE1.emit('interaction', `${socket.position}${msg}`);
    }
  });

  socket.on('disconnect', function () {
    if (socket.fe !== 1) {
      waitingList[socket.position] = {};
      // console.log(waitingList, "disconnected");
    }
  });
});

const PORT = process.env.PORT || 8080;

httpServer.listen(PORT, () => {
  console.log(`Server has started on port number ${PORT}`);
});

var isWsClientInGame = (socket) => {
  if (waitingList.l.ip === socket.ip) return true;
  else if (waitingList.r.ip === socket.ip) return true;
  else return false;
  // return waitingList.some((waitingListClient) => waitingListClient.ip === socket.ip)
};

var checkFreeSlot = () => {
  if (
    JSON.stringify(waitingList.l) === '{}' &&
    JSON.stringify(waitingList.r) === '{}'
  )
    return 'l';
  else if (JSON.stringify(waitingList.l) === '{}') return 'l';
  else if (JSON.stringify(waitingList.r) === '{}') return 'r';
  else return false;
};

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
