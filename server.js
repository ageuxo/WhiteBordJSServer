import { WebSocket, WebSocketServer } from "ws";
import { createServer } from "http";

const server = createServer();
const wss = new WebSocketServer({server });
wss.on('headers', (headers, req) => {
  console.log(`headers: ${JSON.stringify(headers)}. Request: ${JSON.stringify(req)}`);
});

server.on('request', (req, reply) => {
  console.log(`Got request: ${JSON.stringify(req)}, replied: ${JSON.stringify(reply)}`);
});

server.on('error', (e)=> {
  console.error(e);
});

server.on('upgrade', (req, socket, head) => {
  console.log(`Upgrade request: ${JSON.stringify(req.headers)}`);
});

server.listen(55455)
console.log("Server started");

const entities = [];
let clientIdx = 0;
const clients = [];

class Client {
  constructor(ws) {
    this.ws = ws;
    this.id = clientIdx++;
  }

  send(payload) {
    this.ws.send(payload);
  }
}

function sendToClients(payload, ...clientIds) {
  const jsonPayload = JSON.stringify(payload);
  for (const client of clients) {
    if (isInside(client.id, clientIds) && client.ws.readyState === WebSocket.OPEN) {
      client.send(jsonPayload);
    }
  }
}

function sendToClientsExcept(payload, ...excludeClientIds) {
  const jsonPayload = JSON.stringify(payload);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN && !isInside(client.id, excludeClientIds)) {
      client.send(jsonPayload);
    }
  }
}

function isInside(value, it) {
  for (const entry of it) {
    if (value === entry) {
      return true;
    }
  }
  return false;
}

function addClientEntity(clientId, entity) {
  const confirmAdd = {
    type: "added",
    oldId: entity.id
  }
  // TODO plug this huge security hole
  entity.id = entities.push(entity) - 1;
  confirmAdd.newId = entity.id;
  const payload = {
    type: "add",
    entity: entity
  }
  sendToClientsExcept(payload, clientId);
  sendToClients(confirmAdd, clientId);
}

function handlePayload(clientId, payload) {
  switch (payload.type) {
    case "add":
      verifyPayloadFields(payload, "entity");
      addClientEntity(clientId, payload.entity);
      break;
  
    default:
      console.log(`Error handling payload from client ${clientId}: type is not recognized! type: ${payload.type}`);
      break;
  }

  function verifyPayloadFields(payload, ...fields) {
    let failed =  [];
    for (const field of fields) {
      if (payload[field] == null) {
        failed.push(field);
      }
    }
    console.assert(failed.length == 0, 'Client %s Payload missing required fields: %s', clientId, JSON.stringify(payload, fields, 4));
  }
}

wss.on('listening', ()=>{
  console.log(`Listening for connections on ${wss.options.server != null ? JSON.stringify(wss.options.server.address()) : JSON.stringify(wss.address())} ...`);
})

wss.on('connection', (ws)=>connection(ws));

function connection(ws) {
  const client = new Client(ws);
  clients.push(client);
  console.log(`New client with id ${client.id} connected`);

  ws.on('open', function opened(e) {
    console.log('Opened connection: %s', e);
  })

  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
    handlePayload(client.id, JSON.parse(data));
  });

  ws.on('close', function close(code, reason) {
    console.log(`Client ${client.id} disconnected. Code: ${code}, reason: ${reason}`);
    clients.splice(clients.indexOf(client), 1);
    console.log(`Client ${client.id} removed from clients list`);
  });

}

