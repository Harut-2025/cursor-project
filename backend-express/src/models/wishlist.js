const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Wishlist = sequelize.define(
    'Wishlist',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      occasion: {
        type: DataTypes.STRING,
      },
      eventDate: {
        type: DataTypes.DATE,
        field: 'event_date',
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        field: 'is_public',
        defaultValue: true,
      },
      shareSlug: {
        type: DataTypes.STRING,
        field: 'share_slug',
        unique: true,
      },
    },
    {
      tableName: 'wishlists',
      timestamps: true,
      underscored: true,
    },
  );

  return Wishlist;
};

