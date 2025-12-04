// server.js (Updated with MongoDB)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import models
const User = require('./models/User');
const Auction = require('./models/Auction');
const Transaction = require('./models/Transaction');
const Contact = require('./models/Contact');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============= UTILITY FUNCTIONS =============

// Check and update expired auctions
async function checkExpiredAuctions() {
  try {
    const now = new Date();
    
    // Find all active auctions that have expired
    const expiredAuctions = await Auction.find({
      endTime: { $lt: now },
      status: 'active',
      numberOfBids: { $gt: 0 },
      winner: { $exists: false }
    });

    for (const auction of expiredAuctions) {
      if (auction.lastBidder) {
        // Set winner
        auction.winner = auction.lastBidder;
        auction.status = 'ended';
        
        // Transfer coins to seller
        const seller = await User.findById(auction.sellerId);
        if (seller) {
          seller.coins += auction.currentBid;
          await seller.save();
          
          // Create transaction record
          await Transaction.create({
            type: 'auction_win',
            userId: seller._id,
            sellerId: seller._id,
            buyerId: auction.lastBidder.userId,
            auctionId: auction._id,
            amount: auction.currentBid,
            description: `Sold: ${auction.title}`
          });
        }
        
        await auction.save();
      } else {
        auction.status = 'ended';
        await auction.save();
      }
    }
  } catch (error) {
    console.error('Error checking expired auctions:', error);
  }
}

// Run auction check every minute
setInterval(checkExpiredAuctions, 60000);

// ============= AUTHENTICATION ROUTES =============

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already registered' 
      });
    }

    // Create new user with 1000 free coins
    const newUser = await User.create({
      name,
      email,
      password,
      coins: 1000
    });

    // Create welcome transaction
    await Transaction.create({
      type: 'coin_purchase',
      userId: newUser._id,
      amount: 1000,
      description: 'Welcome bonus'
    });

    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      coins: newUser.coins,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful! You received 1000 free coins!',
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed' 
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      coins: user.coins,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed' 
    });
  }
});

// Get current user
app.get('/api/auth/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        coins: user.coins,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user' 
    });
  }
});

// ============= AUCTION ROUTES =============

// Get all auctions
app.get('/api/auctions', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const auctions = await Auction.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      auctions
    });
  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch auctions' 
    });
  }
});

// Get single auction
app.get('/api/auctions/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ 
        success: false,
        error: 'Auction not found' 
      });
    }

    res.json({
      success: true,
      auction
    });
  } catch (error) {
    console.error('Get auction error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch auction' 
    });
  }
});

// Create new auction
app.post('/api/auctions', async (req, res) => {
  try {
    const { title, description, category, startingBid, duration, image, userId, userName } = req.body;

    if (!title || !description || !category || !startingBid || !duration || !userId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const endTime = new Date(Date.now() + parseInt(duration) * 3600000);

    const newAuction = await Auction.create({
      title,
      description,
      category,
      currentBid: parseInt(startingBid),
      endTime,
      image: image || undefined,
      sellerId: user._id,
      sellerName: user.name
    });

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      auction: newAuction
    });
  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create auction' 
    });
  }
});

// Place a bid
app.post('/api/auctions/:id/bid', async (req, res) => {
  try {
    const { amount, userId, userName, userEmail } = req.body;

    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ 
        success: false,
        error: 'Auction not found' 
      });
    }

    // Check if auction has ended
    if (new Date() > auction.endTime) {
      return res.status(400).json({ 
        success: false,
        error: 'Auction has ended' 
      });
    }

    // Check if user is bidding on their own item
    if (auction.sellerId.toString() === userId) {
      return res.status(400).json({ 
        success: false,
        error: 'You cannot bid on your own item' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const minBid = auction.currentBid + 1;
    if (amount < minBid) {
      return res.status(400).json({ 
        success: false,
        error: `Bid must be at least ${minBid} coins` 
      });
    }

    if (user.coins < amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Insufficient coins' 
      });
    }

    // Deduct coins from user
    user.coins -= amount;
    await user.save();

    // Create bid record
    const bid = {
      amount: parseInt(amount),
      userId: user._id,
      bidderName: userName,
      bidderEmail: userEmail,
      timestamp: new Date()
    };

    // Update auction
    auction.bids.push(bid);
    auction.currentBid = parseInt(amount);
    auction.numberOfBids = auction.bids.length;
    auction.lastBidder = {
      userId: user._id,
      userName: userName,
      userEmail: userEmail
    };
    await auction.save();

    // Create transaction
    await Transaction.create({
      type: 'bid_placed',
      userId: user._id,
      auctionId: auction._id,
      amount: parseInt(amount),
      description: `Bid on: ${auction.title}`
    });

    res.json({
      success: true,
      message: 'Bid placed successfully',
      auction: {
        id: auction._id,
        currentBid: auction.currentBid,
        numberOfBids: auction.numberOfBids
      },
      user: {
        id: user._id,
        coins: user.coins
      },
      bid
    });
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to place bid' 
    });
  }
});

// Get bid history for an auction
app.get('/api/auctions/:id/bids', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).select('bids');

    if (!auction) {
      return res.status(404).json({ 
        success: false,
        error: 'Auction not found' 
      });
    }

    res.json({
      success: true,
      bids: auction.bids
    });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch bids' 
    });
  }
});

// Get user's winnings
app.get('/api/users/:id/winnings', async (req, res) => {
  try {
    const winnings = await Auction.find({
      'winner.userId': req.params.id
    }).sort({ endTime: -1 });
    
    res.json({
      success: true,
      winnings
    });
  } catch (error) {
    console.error('Get winnings error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch winnings' 
    });
  }
});

// Get user's listings
app.get('/api/users/:id/listings', async (req, res) => {
  try {
    const listings = await Auction.find({
      sellerId: req.params.id
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      listings
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch listings' 
    });
  }
});

// ============= COIN PURCHASE ROUTES =============

// Purchase coins
app.post('/api/coins/purchase', async (req, res) => {
  try {
    const { userId, amount, price } = req.body;

    if (!userId || !amount || !price) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    user.coins += parseInt(amount);
    await user.save();

    await Transaction.create({
      type: 'coin_purchase',
      userId: user._id,
      amount: parseInt(amount),
      price: parseFloat(price),
      description: `Purchased ${amount} coins for $${price}`
    });

    res.json({
      success: true,
      message: `Successfully purchased ${amount} coins for $${price}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        coins: user.coins
      }
    });
  } catch (error) {
    console.error('Purchase coins error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to purchase coins' 
    });
  }
});

// ============= CONTACT ROUTES =============

// Contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    await Contact.create({
      name,
      email,
      message
    });

    res.json({
      success: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit contact form' 
    });
  }
});

// Get all contacts (admin)
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch contacts' 
    });
  }
});

// ============= STATISTICS ROUTES =============

// Get auction statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalAuctions = await Auction.countDocuments();
    const activeAuctions = await Auction.countDocuments({ 
      endTime: { $gt: new Date() },
      status: 'active'
    });
    
    const bidStats = await Auction.aggregate([
      {
        $group: {
          _id: null,
          totalBids: { $sum: '$numberOfBids' },
          totalValue: { $sum: '$currentBid' }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const coinStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalCoins: { $sum: '$coins' }
        }
      }
    ]);

    const categoryStats = await Auction.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const categories = categoryStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const stats = {
      totalAuctions,
      activeAuctions,
      totalBids: bidStats[0]?.totalBids || 0,
      totalValue: bidStats[0]?.totalValue || 0,
      totalUsers,
      totalCoinsInCirculation: coinStats[0]?.totalCoins || 0,
      categories: {
        ancient: categories.ancient || 0,
        modern: categories.modern || 0,
        commemorative: categories.commemorative || 0,
        bullion: categories.bullion || 0,
        other: categories.other || 0
      }
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics' 
    });
  }
});

// Get all transactions (admin)
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch transactions' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Coin Auction Hub API - Virtual Coin System with MongoDB',
    version: '3.0.0',
    database: 'MongoDB',
    features: [
      'User authentication with 1000 free coins on signup',
      'Virtual coin-based bidding system',
      'Users can list their own items',
      'Automatic winner declaration',
      'Seller receives coins from winning bids',
      'Coin purchase system',
      'Transaction history tracking',
      'MongoDB persistent storage'
    ],
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        getUser: 'GET /api/auth/user/:id'
      },
      auctions: {
        getAll: 'GET /api/auctions',
        getOne: 'GET /api/auctions/:id',
        create: 'POST /api/auctions',
        placeBid: 'POST /api/auctions/:id/bid',
        getBids: 'GET /api/auctions/:id/bids'
      },
      users: {
        getWinnings: 'GET /api/users/:id/winnings',
        getListings: 'GET /api/users/:id/listings'
      },
      coins: {
        purchase: 'POST /api/coins/purchase'
      },
      contact: {
        submit: 'POST /api/contact',
        getAll: 'GET /api/contacts'
      },
      stats: 'GET /api/stats',
      transactions: 'GET /api/transactions',
      health: 'GET /api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║    🪙  COIN AUCTION HUB API SERVER v3.0  🪙          ║
╠═══════════════════════════════════════════════════════╣
║  Status: Running ✓                                    ║
║  Port: ${PORT}                                           ║
║  URL: http://localhost:${PORT}                           ║
║  API: http://localhost:${PORT}/api                       ║
║  Database: MongoDB                                    ║
╠═══════════════════════════════════════════════════════╣
║  💎 VIRTUAL COIN SYSTEM                               ║
║  • 1000 FREE coins on registration                    ║
║  • Coin-based bidding (no real money)                 ║
║  • Users can list items                               ║
║  • Sellers earn coins from winning bids               ║
║  • Persistent MongoDB storage                         ║
╚═══════════════════════════════════════════════════════╝
    `);
});

module.exports = app;