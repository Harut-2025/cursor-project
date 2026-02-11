require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const authRoutes = require('./routes/auth');
const wishlistRoutes = require('./routes/wishlists');
const publicRoutes = require('./routes/public');
const { initSocket } = require('./socket');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: false,
  }),
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/public', publicRoutes);

const PORT = process.env.PORT || 1000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

