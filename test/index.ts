import PuryFiSocket from "@puryfi/puryfi-plugin-sdk/socket";
import { PuryFi } from "@puryfi/puryfi-plugin-sdk";

const pureSocket = new PuryFiSocket(3000);
pureSocket.setDebug(true);

const puryfiSDK = new PuryFi(
    pureSocket,
    {
        name: "Test Plugin",
        intents: ["detection"],
        version: "1.0.0",
        description: "A test plugin for PuryFi",
    },
    { 
        cool: { 
            value: true, 
            valueType: "boolean", 
            displayName: "Cool Setting" 
        } 
    }
);

puryfiSDK.setDebug(true);
/**
 * PuryFi connected and handshake complete.
 */
puryfiSDK.on("ready", () => {
    puryfiSDK.actions.connectPurevision();
});

/**
 * Configuration was changed in PuryFi UI.
 */
puryfiSDK.on("config", (fieldName: string, value: any) => {
    console.log(`Config field ${fieldName} changed to ${value}`);
});

/**
 * Error from PuryFi or upstream connection.
 */
puryfiSDK.on("error", (error: string) => {
    console.error("Error from PuryFi:", error);
}); 

/**
 * Upstream connection closed.
 */
puryfiSDK.on("close", () => {
    console.log("Connection to PuryFi closed.");
});

/**
 * Event message received from PuryFi.
 */
puryfiSDK.on("event", (message) => {
    console.log("Received event:", message);
});