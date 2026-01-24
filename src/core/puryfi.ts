import { decode, encode } from "@msgpack/msgpack";
import { PluginConfiguration, PluginCustomConfiguration } from "./config";
import { BasicMessage, ConfigurationMessageField, generateConfigMessage } from "./messages";
import { PuryFiPluginActions } from "./actions";
import { WebSocket } from "ws";

type ClientEvents = {
    error: (error: string) => void;
    event: (event: BasicMessage) => void;
    config: (key: string, value: string | number | boolean) => void;
    close: () => void;
    ready: () => void;
};

export abstract class PuryFiUpstream {
    protected listeners: { [K: string]: Set<(...args: any[]) => void> } = {};
    abstract send(data: ArrayBuffer | string): void;

    onMessage(callback: (data: ArrayBuffer | string) => void): void {
        this.listeners["message"].add(callback);
    }
    onClose(callback: () => void): void {
        this.listeners["close"].add(callback);
    }
    onError(callback: (error: string) => void): void {
        this.listeners["error"].add(callback);
    }
}

export class PuryFi {
    config: PluginConfiguration;
    customConfig: PluginCustomConfiguration;
    actions: PuryFiPluginActions;

    upstream: PuryFiUpstream;

    /**
     * Create a new PuryFi SDK instance.
     * @param upstream The upstream connection (WebSocket/Port)
     * @param config General Plugin Configuration
     * @param customConfig Custom Config fields to display in the PuryFi UI
     */
    constructor(upstream: PuryFiUpstream, config: PluginConfiguration, customConfig: PluginCustomConfiguration) {
        this.upstream = upstream;
        this.customConfig = customConfig;
        this.config = config;
        this.actions = new PuryFiPluginActions(this);
    }

    private listeners: { [K in keyof ClientEvents]?: Set<ClientEvents[K]> } = {};

    private getSet<K extends keyof ClientEvents>(type: K): Set<ClientEvents[K]> {
        const existing = this.listeners[type];
        if (existing) return existing;

        const created = new Set<ClientEvents[K]>();
        // @ts-ignore yes typescript, I know what I'm doing
        this.listeners[type] = created;
        return created;
    }

    /**
     * Register an event listener.
     * @param type The event
     * @param callback The callback
     * @returns 
     */
    addListener<K extends keyof ClientEvents>(type: K, callback: ClientEvents[K]): this {
        this.getSet(type).add(callback);
        return this;
    }

    /**
     * Alias for addListener
     */
    on = this.addListener;

    /**
     * Unregister an event listener.
     * @param type The event
     * @param callback The callback
     * @returns 
     */
    off<K extends keyof ClientEvents>(type: K, callback: ClientEvents[K]): this {
        this.listeners[type]?.delete(callback);
        return this;
    }

    /**
     * Register a one-time event listener.
     * @param type The event
     * @param callback The Callback
     * @returns 
     */
    once<K extends keyof ClientEvents>(type: K, callback: ClientEvents[K]): this {
        const wrapper = ((...args: Parameters<ClientEvents[K]>) => {
            this.off(type, wrapper as ClientEvents[K]);
            (callback as any)(...args);
        }) as ClientEvents[K];

        this.addListener(type, wrapper);
        return this;
    }

    /**
     * Emit an event.
     * @param type The event
     * @param args The event arguments
     */
    protected emit<K extends keyof ClientEvents>(
        type: K,
        ...args: Parameters<ClientEvents[K]>
    ): void {
        this.listeners[type]?.forEach((cb) => (cb as any)(...args));
    }

    /**
     * Send a message to PuryFi.
     * If you are using this SDK, you probably don't need to use this function directly.
     * Look at PuryFi.actions for higher level functions.
     * @param message Message Object to send to PuryFi
     */
    sendMessage(message: BasicMessage) {
        let encoded = encode(message);
        const arrayBuffer = encoded.buffer.slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength
        );
        this.upstream.send(arrayBuffer);
        return;
    }

    private handleMessage(payload: any) {
        let message = decode(payload) as BasicMessage;
        switch (message.type) {
            case "handshake":
                this.handleHandshake(message);
                break;
            case "event":
                this.emit("event", message);
                break;
        }
    }

    /**
     * Handle upstream connection close event.
     */
    private handleClose() {
        this.emit("close");
    }

    /**
     * Handle error event from upstream connection.
     * @param error Error message
     */
    private handleError(error: string) {
        this.emit("error", error);
    }

    private handleHandshake(message: BasicMessage) {
        switch (message.name) {
            case "hello":
                this.sendMessage({
                    type: "handshake",
                    name: "config",
                    data: {
                        intents: this.config.intents
                    }
                })
                break;
            case "ok":
                this.sendMessage({
                    type: "handshake",
                    name: "config",
                    data: generateConfigMessage(this.config, this.customConfig)
                })
                break;
            case "refused":
                this.emit("error", "Connection refused by PuryFi client. Intents rejected.");
                break;
            case "config":
                let configData = message.data as ConfigurationMessageField[];
                configData.forEach(field => {
                    if (this.customConfig[field.fieldName] === undefined || this.customConfig[field.fieldName].value !== field.value) {
                        this.customConfig[field.fieldName] = {
                            value: field.value,
                            valueType: field.valueType,
                            displayName: field.displayName
                        }
                        this.emit("config", field.fieldName, field.value);
                    }
                });
                this.emit("ready");
                break;
        }
    }

}