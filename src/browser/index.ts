import { PuryFiUpstream } from "../core";

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
                    const listeners = this.listeners["message"];
                    if (listeners) {
                        for (const listener of listeners) {
                            listener(event.data);
                        }
                    }
                } else if (data.type === "CLOSE") {
                    const listeners = this.listeners["close"];
                    if (listeners) {
                        for (const listener of listeners) {
                            listener();
                        }
                    }
                } else if (data.type === "ERROR") {
                    const listeners = this.listeners["error"];
                    if (listeners) {
                        for (const listener of listeners) {
                            listener(event.data);
                        }
                    }
                }
            };
        } else {
            this.upstream = extension.runtime.connect({ name: channelName });
            this.upstream.onMessage.addListener((message) => {
                let tmpRaw = message as Record<string, unknown>;
                if (tmpRaw.data instanceof ArrayBuffer) {
                    const listeners = this.listeners["message"];
                    if (listeners) {
                        for (const listener of listeners) {
                            listener(message);
                        }
                    }
                }
            });
            this.upstream.onDisconnect.addListener(() => {
                const listeners = this.listeners["close"];
                if (listeners) {
                    for (const listener of listeners) {
                        listener();
                    }
                }
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