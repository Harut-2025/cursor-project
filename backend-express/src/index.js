require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const wishlistRoutes = require('./routes/wishlists');
const publicRoutes = require('./routes/public');
const { initSocket } = require('./socket');

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  }),
);
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/public', publicRoutes);

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initSocket(server);

sequelize
  .sync()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Express backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to sync database', err);
    process.exit(1);
  });

