import { PuryFiUpstream } from "../core/upstream.js";

export const extension = globalThis.browser ?? globalThis.chrome;

interface BroadcastMessage {
    type: "SEND_TO_PURYFI" | "MESSAGE_FROM_PURYFI" | "CLOSE" | "ERROR";
    data: ArrayBuffer | string;
}

export function isChromiumExtension(): boolean {
    return chrome.runtime.getManifest().manifest_version === 3;
}

export class PuryFiBrowser extends PuryFiUpstream {
    private upstream: BroadcastChannel | browser.runtime.Port;

    constructor(channelName: string = "puryfi-binary-bus") {
        super();
        if (isChromiumExtension()) {
            this.upstream = new BroadcastChannel(channelName);
            this.upstream.onmessage = (event) => {
                let data = event.data as BroadcastMessage;
                if (data.type === "MESSAGE_FROM_PURYFI") {
                    this.emit("message", data.data as ArrayBuffer);
                } else if (data.type === "CLOSE") {
                    this.emit("close");
                } else if (data.type === "ERROR") {
                    this.emit("error", data.data as string);
                }
            };
        } else {
            this.upstream = extension.runtime.connect({ name: channelName });
            this.upstream.onMessage.addListener((message) => {
                let tmpRaw = message as Record<string, unknown>;
                if (tmpRaw.data instanceof ArrayBuffer) {
                    this.emit("message", tmpRaw.data);
                }
            });
            this.upstream.onDisconnect.addListener(() => {
                this.emit("close");
            });
        }
    }

    send(data: ArrayBuffer | string): void {
        if (this.upstream instanceof BroadcastChannel) {
            this.upstream.postMessage({ type: "SEND_TO_PURYFI", data });
        } else {
            this.upstream.postMessage({ data });
        }
    }
}