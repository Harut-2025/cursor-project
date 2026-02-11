const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contribution = sequelize.define(
    'Contribution',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      guestName: {
        type: DataTypes.STRING,
        field: 'guest_name',
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'RUB',
      },
    },
    {
      tableName: 'contributions',
      timestamps: true,
      underscored: true,
    },
  );

  return Contribution;
};

