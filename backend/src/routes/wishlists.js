const express = require('express');
const { prisma } = require('../prisma');
const auth = require('../middleware/auth');
const { getIO } = require('../socket');

const router = express.Router();

router.use(auth);

// Получить вишлисты текущего пользователя
router.get('/', async (req, res) => {
  try {
    const wishlists = await prisma.wishlist.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            contributions: true,
            reservations: true,
          },
        },
      },
    });

    const mapped = wishlists.map((wl) => ({
      id: wl.id,
      title: wl.title,
      description: wl.description,
      occasion: wl.occasion,
      eventDate: wl.eventDate,
      isPublic: wl.isPublic,
      shareSlug: wl.shareSlug,
      createdAt: wl.createdAt,
      items: wl.items.map((item) => ({
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
        totalContributed: item.contributions.reduce((sum, c) => sum + c.amount, 0),
        reservedCount: item.reservations.length,
      })),
    }));

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось получить вишлисты' });
  }
});

// Создать вишлист
router.post('/', async (req, res) => {
  try {
    const { title, description, occasion, eventDate, isPublic = true } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Название списка обязательно' });
    }

    const shareSlug = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

    const wishlist = await prisma.wishlist.create({
      data: {
        title,
        description,
        occasion,
        eventDate: eventDate ? new Date(eventDate) : null,
        isPublic,
        shareSlug,
        ownerId: req.userId,
      },
    });

    res.status(201).json(wishlist);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось создать вишлист' });
  }
});

// Получить один вишлист владельца
router.get('/:id', async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
      include: {
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
      isPublic: wishlist.isPublic,
      shareSlug: wishlist.shareSlug,
      createdAt: wishlist.createdAt,
      items: wishlist.items.map((item) => ({
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
        totalContributed: item.contributions.reduce((sum, c) => sum + c.amount, 0),
        reservedCount: item.reservations.length,
      })),
    };

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось получить вишлист' });
  }
});

// Добавить позицию в вишлист
router.post('/:id/items', async (req, res) => {
  try {
    const wishlist = await prisma.wishlist.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!wishlist) {
      return res.status(404).json({ error: 'Список не найден' });
    }

    const {
      title,
      url,
      imageUrl,
      price,
      currency = 'RUB',
      notes,
      allowGroupFunding = false,
      targetAmount,
      minContribution,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Название подарка обязательно' });
    }

    const item = await prisma.wishlistItem.create({
      data: {
        title,
        url,
        imageUrl,
        price: price ?? null,
        currency,
        notes,
        allowGroupFunding,
        targetAmount: targetAmount ?? price ?? null,
        minContribution: minContribution ?? null,
        wishlistId: wishlist.id,
      },
    });

    const io = getIO();
    io.to(`wishlist:${wishlist.shareSlug}`).emit('wishlist_item_added', {
      wishlistSlug: wishlist.shareSlug,
      itemId: item.id,
    });

    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Не удалось добавить подарок' });
  }
});

module.exports = router;

