import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import cors from 'cors';
import {Client, TopicMessageQuery, TopicMessageSubmitTransaction} from '@hashgraph/sdk';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const operatorId = process.env.ADMIN_HEDERA_ADDRESS || '';
const operatorKey = process.env.ADMIN_PRIVATE_KEY || '';
const TOPIC_ID = '0.0.14973703';

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

app.post('/api/messages', async (req, res) => {
  const message = req.body.message;

  try {
    const messageAsString = JSON.stringify(message);
    await new TopicMessageSubmitTransaction()
      .setTopicId(TOPIC_ID)
      .setMessage(messageAsString)
      .execute(client);
    res.sendStatus(200); // OK
  } catch (error) {
    console.error(error);
    res.sendStatus(500); // Internal Server Error
  }
});

wss.on('connection', (ws: WebSocket) => {
  new TopicMessageQuery()
    .setTopicId(TOPIC_ID)
    .subscribe(
      client,
      (error) => console.error('error', error),
      (message) => {
        const decoder = new TextDecoder();
        const messageAsString = decoder.decode(message.contents);
        if (messageAsString !== '') {
          const parsed = JSON.parse(messageAsString);
          parsed.isViewed = false;
          ws.send(JSON.stringify(parsed));
        }
      },

    );
});

server.listen(8080, () => {
  console.log('> Ready on http://localhost:8080');
});
