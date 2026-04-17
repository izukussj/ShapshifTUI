import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:8765');
const t0 = Date.now();
let gotWelcome = false;
let stage = 0;
const stamp = () => `[${Date.now() - t0}ms]`;
const log = (m) => console.log(`${stamp()} ${m}`);
setTimeout(() => { console.error('timeout'); process.exit(2); }, 180000);
ws.on('open', () => { log('open'); });
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'error') { log(`ERROR ${msg.error}`); process.exit(4); }
  if (msg.type !== 'message') { log(JSON.stringify(msg)); return; }
  const m = msg.message;
  const preview = m.content.replace(/\n/g, ' ').slice(0, 160);
  log(`${m.sender}: ${preview}`);
  if (m.sender === 'ai' && !gotWelcome) {
    gotWelcome = true;
    log('-- sending turn 1: "hey"');
    ws.send(JSON.stringify({ type: 'chat', content: 'hey', interactions: [] }));
    return;
  }
  if (m.sender === 'ai' && gotWelcome && stage === 0) {
    stage = 1;
    setTimeout(() => {
      log('-- sending turn 2 (tests resume path)');
      ws.send(JSON.stringify({ type: 'chat', content: 'list the first 5 files in /tmp with a refresh button', interactions: [] }));
    }, 500);
    return;
  }
  if (m.sender === 'ai' && stage === 1 && /```shapeshiftui/.test(m.content)) {
    log('→ got code block on turn 2, exiting');
    ws.close(); process.exit(0);
  }
});
ws.on('error', (e) => { console.error('[err]', e.message); process.exit(3); });
