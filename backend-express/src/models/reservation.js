const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define(
    'Reservation',
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
      message: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: 'reservations',
      timestamps: true,
      underscored: true,
    },
  );

  return Reservation;
};

