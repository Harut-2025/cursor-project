const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'wishlist',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
  },
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user')(sequelize);
db.Wishlist = require('./wishlist')(sequelize);
db.WishlistItem = require('./wishlistItem')(sequelize);
db.Reservation = require('./reservation')(sequelize);
db.Contribution = require('./contribution')(sequelize);

// Associations
db.User.hasMany(db.Wishlist, { foreignKey: 'ownerId' });
db.Wishlist.belongsTo(db.User, { foreignKey: 'ownerId' });

db.Wishlist.hasMany(db.WishlistItem, { foreignKey: 'wishlistId' });
db.WishlistItem.belongsTo(db.Wishlist, { foreignKey: 'wishlistId' });

db.WishlistItem.hasMany(db.Reservation, { foreignKey: 'itemId' });
db.Reservation.belongsTo(db.WishlistItem, { foreignKey: 'itemId' });

db.User.hasMany(db.Reservation, { foreignKey: 'userId' });
db.Reservation.belongsTo(db.User, { foreignKey: 'userId' });

db.WishlistItem.hasMany(db.Contribution, { foreignKey: 'itemId' });
db.Contribution.belongsTo(db.WishlistItem, { foreignKey: 'itemId' });

db.User.hasMany(db.Contribution, { foreignKey: 'userId' });
db.Contribution.belongsTo(db.User, { foreignKey: 'userId' });

module.exports = db;

