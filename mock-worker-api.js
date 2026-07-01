const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/api/profiles' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Worker API received JWT:', data.jwt);
        // Mock service role token
        const serviceToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiJzdXBhYmFzZSIsInJlZiI6Im1iY2RiY2xvc29tcXBmYm95ZmZqIiwicm9sZSI6InNlcnZpY2UifQ.example';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: { id: 'test-user-123', email: 'suporte04@baeletrica.com.br', role: 'admin', profile: { id: 'prof-123', full_name: 'Admin User', role: 'admin' } } }));
      } catch(e) {
        console.error('Parse error:', e);
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(8080, () => {
  console.log('Mock Worker API server running on port 8080');
});