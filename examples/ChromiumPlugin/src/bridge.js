let peerPort = null;
const bc = new BroadcastChannel('puryfi-binary-bus');

let params = new URLSearchParams(window.location.search);
bc.postMessage({
      type: 'OPEN',
      data: params.get('version') + '|' + params.get('apiVersion'),
    });

window.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'INIT_PORT') return;

  const port = e.ports && e.ports[0];
  if (!port) return;

  peerPort = port;

  peerPort.onmessage = (evt) => {
    const ab = toTightArrayBuffer(evt.data);

    bc.postMessage({ type: 'MESSAGE_FROM_PURYFI', data: ab }, [ab]);
  };

  peerPort.onmessageerror = (err) => {
    bc.postMessage({ type: 'ERROR', data: `peerPort messageerror: ${err}` });
  };

  peerPort.start();
});

bc.onmessage = (e) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'OPEN') {
    bc.postMessage({
      type: 'OPEN',
      data: params.get('version') + '|' + params.get('apiVersion'),
    });
  } else if (msg.type === 'SEND_TO_PURYFI') {
    if (!peerPort) return;
    const ab = msg.data;
    if (!(ab instanceof ArrayBuffer)) {
      console.warn('[bridge] SEND_TO_PURYFI ab not ArrayBuffer:', ab);
      return;
    }

    peerPort.postMessage(ab, [ab]);
  } else {
    if (msg.type === 'CLOSE') {
      if(peerPort !== null) {
         peerPort.postMessage("CLOSE");
      }
    }
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
