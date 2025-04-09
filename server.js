import { WebSocketServer } from "ws";

const wss = new WebSocketServer({port: 55455});

const clients = [];

wss.on('connection', connection);

function connection(ws, ...others) {
  console.log(`client connected from ${JSON.stringify(ws, null, 4)} &  ${JSON.stringify(others, null, 4)}`);

  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
    if (data == 'hello server!') {
      ws.send('hello client!')
    }
  });

  ws.send('something');

}

