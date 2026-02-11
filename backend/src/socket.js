const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join_wishlist', (slug) => {
      if (typeof slug === 'string') {
        socket.join(`wishlist:${slug}`);
      }
    });

    socket.on('leave_wishlist', (slug) => {
      if (typeof slug === 'string') {
        socket.leave(`wishlist:${slug}`);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io не инициализирован');
  }
  return io;
}

module.exports = {
  initSocket,
  getIO,
};

