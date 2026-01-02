// routes/searchHistory.routes.js
const router = require("express").Router();
const SearchHistory = require("../../models/searchHistory");
const SavedSearch = require("../../models/savedSearch")

// GET search history
router.get("/history/:userId", async (req, res) => {
    const history = await SearchHistory
        .find({ userId: req.params.userId })
        .sort({ timestamp: -1 })
        .limit(20);

    res.json(history);
});

// ADD search history
router.post("/history", async (req, res) => {
    const { userId, query, filters } = req.body;

    if (!query?.trim()) return res.json({ success: true });

    // Remove duplicate
    await SearchHistory.deleteMany({ userId, query });

    const item = await SearchHistory.create({
        userId,
        query,
        filters,
    });

    res.json(item);
});

// CLEAR history
router.delete("/history/:userId", async (req, res) => {
    await SearchHistory.deleteMany({ userId: req.params.userId });
    res.json({ success: true });
});

// REMOVE single search
router.delete("/history/:userId/:query", async (req, res) => {
    await SearchHistory.deleteOne({
        userId: req.params.userId,
        query: req.params.query,
    });
    res.json({ success: true });
});






// GET saved searches
router.get("/saved/:userId", async (req, res) => {
    const items = await SavedSearch.find({ userId: req.params.userId })
        .sort({ createdAt: -1 });
    res.json(items);
});

// ADD saved search
router.post("/saved", async (req, res) => {
    const saved = await SavedSearch.create(req.body);
    res.json(saved);
});

// UPDATE saved search
router.put("/saved/:id", async (req, res) => {
    const updated = await SavedSearch.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );
    res.json(updated);
});

// DELETE saved search
router.delete("/saved/:id", async (req, res) => {
    await SavedSearch.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

module.exports = router;
