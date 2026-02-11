const express = require('express');
const { Wishlist, User, WishlistItem, Contribution, Reservation } = require('../models');
const { getIO } = require('../socket');

const router = express.Router();

// Публичный просмотр вишлиста
router.get('/wishlists/:slug', async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({
      where: { shareSlug: req.params.slug, isPublic: true },
      include: [
        {
          model: User,
          attributes: ['name'],
        },
        {
          model: WishlistItem,
          include: [Contribution, Reservation],
        },
      ],
    });

    if (!wishlist) {
      return res.status(404).json({ error: 'Список не найден' });
    }

    const mapped = {
      id: wishlist.id,
      title: wishlist.title,
      description: wishlist.description,
      occasion: wishlist.occasion,
      eventDate: wishlist.eventDate,
      createdAt: wishlist.createdAt,
      ownerName: wishlist.User?.name || 'Друг',
      shareSlug: wishlist.shareSlug,
      items: wishlist.WishlistItems.map((item) => {
        const totalContributed = item.Contributions.reduce((sum, c) => sum + c.amount, 0);
        const reserved = item.Reservations.length > 0;
        return {
          id: item.id,
          title: item.title,
          url: item.url,
          imageUrl: item.imageUrl,
          price: item.price,
          currency: item.currency,
          notes: item.notes,
          allowGroupFunding: item.allowGroupFunding,
          targetAmount: item.targetAmount,
          minContribution: item.minContribution,
          createdAt: item.createdAt,
          totalContributed,
          isFullyFunded:
            item.allowGroupFunding && item.targetAmount
              ? totalContributed >= item.targetAmount
              : reserved,
          reserved,
        };
      }),
    };

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось получить публичный список' });
  }
});

// Публичное резервирование подарка
router.post('/items/:itemId/reserve', async (req, res) => {
  try {
    const { guestName, message } = req.body;

    const item = await WishlistItem.findOne({
      where: { id: req.params.itemId },
      include: [{ model: Wishlist }, { model: Reservation }],
    });

    if (!item || !item.Wishlist.isPublic) {
      return res.status(404).json({ error: 'Подарок не найден' });
    }

    if (item.Reservations.length > 0 && !item.allowGroupFunding) {
      return res.status(400).json({ error: 'Подарок уже зарезервирован' });
    }

    const reservation = await Reservation.create({
      itemId: item.id,
      guestName: guestName?.trim() || null,
      message: message?.trim() || null,
    });

    const io = getIO();
    io.to(`wishlist:${item.Wishlist.shareSlug}`).emit('reservation_updated', {
      wishlistSlug: item.Wishlist.shareSlug,
      itemId: item.id,
    });

    res.status(201).json({ id: reservation.id, itemId: reservation.itemId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось зарезервировать подарок' });
  }
});

// Публичный вклад в групповой подарок
router.post('/items/:itemId/contribute', async (req, res) => {
  try {
    const { amount, guestName } = req.body;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма' });
    }

    const item = await WishlistItem.findOne({
      where: { id: req.params.itemId },
      include: [{ model: Wishlist }, { model: Contribution }],
    });

    if (!item || !item.Wishlist.isPublic) {
      return res.status(404).json({ error: 'Подарок не найден' });
    }

    if (!item.allowGroupFunding) {
      return res.status(400).json({ error: 'Для этого подарка не включён сбор' });
    }

    if (item.minContribution && numericAmount < item.minContribution) {
      return res
        .status(400)
        .json({ error: `Минимальный вклад: ${item.minContribution} ${item.currency}` });
    }

    const contribution = await Contribution.create({
      itemId: item.id,
      guestName: guestName?.trim() || null,
      amount: numericAmount,
      currency: item.currency,
    });

    const io = getIO();
    io.to(`wishlist:${item.Wishlist.shareSlug}`).emit('contribution_updated', {
      wishlistSlug: item.Wishlist.shareSlug,
      itemId: item.id,
    });

    res.status(201).json({
      id: contribution.id,
      itemId: contribution.itemId,
      amount: contribution.amount,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось внести вклад' });
  }
});

module.exports = router;

