const fs = require('fs');
const express = require('express')
const http = require("http")
const WebSocket = require('ws')
var app = express()

const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const port = 8080

wss.on('connection', function connection(ws) {
    ws.binaryType = 'arraybuffer';
    ws.on('error', console.error);

    ws.on('message', function message(data) {
        console.log(`L${data.toString()}`);
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(`L${data.toString()}`)
            }
        });
    });

    ws.send('You are connected!');
});

server.listen(port, () => {
    console.log(`Websocket server started on port ` + port);
});