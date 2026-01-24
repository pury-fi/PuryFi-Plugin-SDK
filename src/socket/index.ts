import WebSocket, { WebSocketServer } from "ws";
import { PuryFiUpstream } from "../core";

export default class PuryFiSocket extends PuryFiUpstream{
    private socketServer: WebSocketServer;
    private clients: WebSocket[] = [];

    send(data: ArrayBuffer | string): void {
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    constructor(port: number = 8080) {
        super();
        this.socketServer = new WebSocketServer({ port });
        this.socketServer.on("connection", (ws: WebSocket) => {
            ws.binaryType = "arraybuffer";
            this.clients.push(ws);
            ws.on("message", (data: WebSocket.Data) => {
                let binaryData = data as ArrayBuffer;
                const listeners = this.listeners["message"];
                if (listeners) {
                    for (const listener of listeners) {
                        listener(binaryData);
                    }
                }
            });
            ws.on("close", () => {
                this.clients.splice(this.clients.indexOf(ws), 1);
                const listeners = this.listeners["close"];
                if (listeners) {
                    for (const listener of listeners) {
                        listener();
                    }
                }
            });
            ws.on("error", (err: Error) => {
                const listeners = this.listeners["error"];
                if (listeners) {
                    for (const listener of listeners) {
                        listener(err.message);
                    }
                }
            });
        });
    }
}