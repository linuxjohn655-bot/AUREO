const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 12722;
// THIS IS THE FIX: Adding "0.0.0.0" tells it to listen to the internet
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});