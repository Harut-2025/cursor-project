const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WishlistItem = sequelize.define(
    'WishlistItem',
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
      url: {
        type: DataTypes.STRING,
      },
      imageUrl: {
        type: DataTypes.STRING,
        field: 'image_url',
      },
      price: {
        type: DataTypes.FLOAT,
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'RUB',
      },
      notes: {
        type: DataTypes.TEXT,
      },
      allowGroupFunding: {
        type: DataTypes.BOOLEAN,
        field: 'allow_group_funding',
        defaultValue: false,
      },
      targetAmount: {
        type: DataTypes.FLOAT,
        field: 'target_amount',
      },
      minContribution: {
        type: DataTypes.FLOAT,
        field: 'min_contribution',
      },
    },
    {
      tableName: 'wishlist_items',
      timestamps: true,
      underscored: true,
    },
  );

  return WishlistItem;
};

