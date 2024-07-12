import http from 'http';
import { server as WebSocketServer } from 'websocket';

const socketPort = 9898;

class WebSocketHandler {
    constructor(service, eventEmitter) {
        this.service = service;
        this.eventEmitter = eventEmitter;
        this.subscriptionManager = {};

        this.eventEmitter.on('fetched', (data) => {
            if (this.wsServer) {
                this.pushUpdatesDownStream(data);
            } else {
                this.initializeWebSocket();
            }
        });
    }

    initializeWebSocket() {
        console.log('initializing web socket');

        const server = http.createServer();
        server.listen(socketPort);

        this.wsServer = new WebSocketServer({
            httpServer: server,
        });

        console.log(`Websocket started on port: ${socketPort}`);

        this.wsServer.on('request', (request) => {
            const connection = request.accept(null, request.origin);
            console.log('Client connected');

            connection.on('message', ({ utf8Data }) => {
                try {
                    let requestString = utf8Data.substring(utf8Data.lastIndexOf('{'), utf8Data.lastIndexOf('}') + 1);
                    let message = JSON.parse(requestString);
                    this.processMessage(message, connection);
                } catch (e) {
                    console.error('Error while processing client request: ' + e);
                }
            });
        });
    }

    pushUpdatesDownStream(data) {
        if (this.wsServer) {
            let messageType = 599;
            let subscribers = this.subscriptionManager[messageType];

            if (subscribers && data && data.length) {
                Object.values(subscribers).forEach((connection) => {
                    if (connection) {
                        this.sendMessage(data, messageType, connection);
                    }
                });
            }
        }
    }

    pushInitialStateStream(connection) {
        let top100 = this.service.dataStore.top100;

        if (top100.length && connection) {
            this.sendMessage(top100, 599, connection);
        }
    }

    processMessage(receivedMsg, connection) {
        const messageKeys = Object.keys(receivedMsg);
        let message;
        let messageType;

        switch (messageKeys[0]) {
            case 'AUTHVER':
                [messageType, message] = this.processAuthMessage(receivedMsg, connection);
                break;

            case '40':
                [messageType, message] = this.processExchangeSubscriptionMessage(receivedMsg, connection);
                break;

            case '41':
                [messageType, message] = this.processExchangeUnsubscriptionMessage(receivedMsg, connection);
                break;

            case '0':
                [messageType, message] = [0, { t: 0 }];
                break;

            default:
                break;
        }

        if (message) {
            this.sendMessage(message, messageType, connection);
        }
    }

    sendMessage(data, messageType, connection) {
        if (connection.connected && connection.isAuthenticated) {
            let messages = Array.isArray(data) ? data : [data];

            messages.forEach((message) => {
                const strigifiedMsg = JSON.stringify({ 1: messageType, ...message });
                const out = strigifiedMsg.length + strigifiedMsg;

                connection.sendUTF(out);
            });
        } else {
            console.warn('message sending failed: User is not connected or authenticated');
        }
    }

    processAuthMessage(message, connection) {
        let messageType = 150;

        let out = {
            AUTHMSG: ' ',
            AUTHSTAT: 1,
            BILLINGCODE: 'ISI',
            EXCHANGEPARA: 'SYS,137.0|TDWL,32.0,1.0|GLOBAL,0.0,14.0',
            EXPDATE: '20221231',
            METAVER: '1',
            NWSP: 'MUBASHER',
            PAYTYPE: '1',
            SID: 'C2650CB2-9B4E-413E-9282-6C2C81B203E2',
            SM: 'TDWL|1~2~3~10~11~6',
            UE: 'TDWL,0,1|GLOBAL,0,0',
            UEM: 'MTMyfDEyOQ==',
            UID: '138914',
            UNM: message.UNM,
            WT: 'SYS,5,6,7,8,10,12,13,16,17,19,21,27,29,39,47,48,49,50,51,52,53,56,59,64,65,66,67,68,69,70,72,75,112,120,213,221|TDWL,132,1,2,3,11,14,20,22,23,28,41,42,45,46,60,61,62,63,74,116,129,300',
        };

        connection.isAuthenticated = true;
        connection.id = out.UID;

        return [messageType, out];
    }

    processExchangeSubscriptionMessage(message, connection) {
        try {
            let out;
            let messageType = parseInt(message['40'], 10);
            let resposeMessageType;

            switch (messageType) {
                case 213:
                    console.log('Processing message type: ' + messageType);

                    this.subscriptionManager[messageType] = this.subscriptionManager[messageType] || {};
                    this.subscriptionManager[messageType][connection.id] = connection;
                    resposeMessageType = 213;
                    out = this.service.dataStore.top100;
                    break;

                default:
                    console.warn('Cannot process unimplemented message type: ' + messageType);
                    break;
            }

            return [resposeMessageType, out];
        } catch (e) {
            console.error(`Error while processing exchange subscription message ${message['50']}: ${e}`);
        }
    }

    processExchangeUnsubscriptionMessage(message, connection) {
        try {
            let messageType = parseInt(message['40'], 10);

            switch (messageType) {
                case 213:
                    this.subscriptionManager[messageType][connection.id] = null;
                    break;

                default:
                    break;
            }
        } catch (e) {
            console.error(`Error while processing exchange unsubscription message ${message['50']}: ${e}`);
        }
    }
}

export default WebSocketHandler;
