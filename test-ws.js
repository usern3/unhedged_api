// Simple WebSocket test client
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', function open() {
  console.log('✅ Connected to trollbox WebSocket');

  // Send a ping
  console.log('📤 Sending ping...');
  ws.send(JSON.stringify({ type: 'ping' }));

  // Simulate broadcasting a message
  setTimeout(() => {
    console.log('📤 Broadcasting test message...');
    ws.send(JSON.stringify({
      type: 'message',
      payload: {
        id: 'test-123',
        content: 'Hello from WebSocket!',
        userId: 'test-user',
        createdAt: new Date().toISOString()
      }
    }));
  }, 1000);

  // Simulate a reaction
  setTimeout(() => {
    console.log('📤 Broadcasting test reaction...');
    ws.send(JSON.stringify({
      type: 'reaction',
      payload: {
        emoji: '🚀',
        messageId: 'test-123',
        userId: 'test-user'
      }
    }));
  }, 2000);
});

ws.on('message', function message(data) {
  const parsed = JSON.parse(data.toString());
  console.log('📥 Received:', JSON.stringify(parsed, null, 2));
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('❌ Disconnected from trollbox');
  process.exit(0);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('\n🛑 Closing connection...');
  ws.close();
}, 5000);
