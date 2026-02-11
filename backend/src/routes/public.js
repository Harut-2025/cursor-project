const express = require('express');
const { prisma } = require('../prisma');
const { getIO } = require('../socket');

const router = express.Router();

// Публичное получение вишлиста по slug
router.get('/wishlists/:slug', async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findFirst({
      where: { shareSlug: req.params.slug, isPublic: true },
      include: {
        owner: {
          select: { name: true },
        },
        items: {
          include: {
            contributions: true,
            reservations: true,
          },
        },
      },
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
      ownerName: wishlist.owner?.name || 'Друг',
      shareSlug: wishlist.shareSlug,
      items: wishlist.items.map((item) => {
        const totalContributed = item.contributions.reduce((sum, c) => sum + c.amount, 0);
        const reserved = item.reservations.length > 0;
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

// Зарезервировать подарок (гость или авторизованный)
router.post('/items/:itemId/reserve', async (req, res) => {
  try {
    const { guestName, message } = req.body;

    const item = await prisma.wishlistItem.findUnique({
      where: { id: req.params.itemId },
      include: {
        wishlist: true,
        reservations: true,
      },
    });

    if (!item || !item.wishlist.isPublic) {
      return res.status(404).json({ error: 'Подарок не найден' });
    }

    if (item.reservations.length > 0 && !item.allowGroupFunding) {
      return res.status(400).json({ error: 'Подарок уже зарезервирован' });
    }

    const reservation = await prisma.reservation.create({
      data: {
        itemId: item.id,
        userId: req.userId || null,
        guestName: req.userId ? null : guestName?.trim() || null,
        message: message?.trim() || null,
      },
    });

    const io = getIO();
    io.to(`wishlist:${item.wishlist.shareSlug}`).emit('reservation_updated', {
      wishlistSlug: item.wishlist.shareSlug,
      itemId: item.id,
    });

    res.status(201).json({
      id: reservation.id,
      itemId: reservation.itemId,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось зарезервировать подарок' });
  }
});

// Внести вклад в групповой подарок
router.post('/items/:itemId/contribute', async (req, res) => {
  try {
    const { amount, guestName } = req.body;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма' });
    }

    const item = await prisma.wishlistItem.findUnique({
      where: { id: req.params.itemId },
      include: {
        wishlist: true,
        contributions: true,
      },
    });

    if (!item || !item.wishlist.isPublic) {
      return res.status(404).json({ error: 'Подарок не найден' });
    }

    if (!item.allowGroupFunding) {
      return res.status(400).json({ error: 'Для этого подарка не включён сбор' });
    }

    if (item.minContribution && numericAmount < item.minContribution) {
      return res
        .status(400)
        .json({ error: `Минимальный вклад для этого подарка: ${item.minContribution}` });
    }

    const contribution = await prisma.contribution.create({
      data: {
        itemId: item.id,
        userId: req.userId || null,
        guestName: req.userId ? null : guestName?.trim() || null,
        amount: numericAmount,
        currency: item.currency,
      },
    });

    const io = getIO();
    io.to(`wishlist:${item.wishlist.shareSlug}`).emit('contribution_updated', {
      wishlistSlug: item.wishlist.shareSlug,
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

