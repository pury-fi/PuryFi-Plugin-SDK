/**
 * PuryFi Plugin SDK - Chromium Bridge
 *
 * This bridge enables efficient binary communication between PuryFi and Chromium-based browser extensions, bypassing the JSON encoding of runtime messaging.
 *
 * Do not modify this file. It is designed to be copied into your extension's root directory and loaded by `bridge.html`. The SDK will automatically use this bridge on Chromium browsers and ignore it on Firefox.
 */

let peerPort = null;
let sessionId = null;
const bc = new BroadcastChannel("puryfi-binary-bus");

function uuidv4() {
   return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
         +c ^
         (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
      ).toString(16)
   );
}

window.addEventListener("message", (e) => {
   if (!e.data || e.data.type !== "INIT_PORT") return;

   if (peerPort) {
      bc.postMessage({ type: "CLOSE" });
      peerPort.close();
      peerPort = null;
   }

   const port = e.ports && e.ports[0];
   if (!port) return;

   peerPort = port;
   sessionId = uuidv4();

   bc.postMessage({
      type: "OPEN",
      sessionId: sessionId,
   });

   peerPort.onmessage = (evt) => {
      const ab = toTightArrayBuffer(evt.data);

      if (ab.byteLength === 1 && new Uint8Array(ab)[0] === 0x09) {
         bc.postMessage({ type: "HEARTBEAT" });
         return;
      }

      bc.postMessage({ type: "MESSAGE_FROM_PURYFI", data: ab }, [ab]);
   };

   peerPort.onmessageerror = (err) => {
      bc.postMessage({ type: "ERROR", data: `peerPort messageerror: ${err}` });
   };

   peerPort.start();
});

bc.onmessage = (e) => {
   const msg = e.data;
   if (!msg) return;

   if (msg.type === "OPEN") {
      bc.postMessage({
         type: "OPEN",
         sessionId: sessionId,
      });
   } else if (msg.type === "SEND_TO_PURYFI") {
      if (!peerPort) return;

      const ab = msg.data;
      if (!(ab instanceof ArrayBuffer)) {
         console.warn("[bridge] SEND_TO_PURYFI ab not ArrayBuffer:", ab);
         return;
      }

      peerPort.postMessage(ab, [ab]);
   } else if (msg.type === "CLOSE") {
      peerPort.close();
      peerPort = null;
   }
};

function toTightArrayBuffer(data) {
   if (data instanceof ArrayBuffer) return data;

   if (ArrayBuffer.isView(data)) {
      const u8 = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
   }

   return new TextEncoder().encode(String(data)).buffer;
}
