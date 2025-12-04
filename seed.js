// seed.js - Script to populate database with initial data
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Auction = require('./models/Auction');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coin-auction-hub', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Auction.deleteMany({});
    
    // Create admin user
    console.log('Creating admin user...');
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@coinauctionhub.com',
      password: 'admin123',
      coins: 10000
    });

    // Create demo user
    console.log('Creating demo user...');
    const demoUser = await User.create({
      name: 'Demo User',
      email: 'demo@example.com',
      password: 'demo123',
      coins: 1000
    });

    // Create sample auctions
    console.log('Creating sample auctions...');
    
    const auctions = [
      {
        title: '1909-S VDB Lincoln Penny',
        description: 'Rare Lincoln cent in excellent condition. One of the most sought-after coins by collectors. Features the designer\'s initials VDB on the reverse.',
        category: 'modern',
        currentBid: 50,
        numberOfBids: 15,
        endTime: new Date(Date.now() + 3600000 * 24), // 24 hours
        image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400',
        sellerId: adminUser._id,
        sellerName: adminUser.name,
        status: 'active'
      },
      {
        title: 'Ancient Roman Denarius',
        description: 'Silver denarius from Emperor Augustus era (27 BC - 14 AD). Beautiful patina and clear portrait. Authenticated by experts.',
        category: 'ancient',
        currentBid: 85,
        numberOfBids: 8,
        endTime: new Date(Date.now() + 3600000 * 12), // 12 hours
        image: 'https://images.unsplash.com/photo-1621532876605-88f87f8f5a5e?w=400',
        sellerId: adminUser._id,
        sellerName: adminUser.name,
        status: 'active'
      },
      {
        title: '1964 Kennedy Half Dollar',
        description: 'Silver commemorative coin, uncirculated condition. Last year of 90% silver content. Brilliant luster with no wear.',
        category: 'commemorative',
        currentBid: 42,
        numberOfBids: 22,
        endTime: new Date(Date.now() + 3600000 * 6), // 6 hours
        image: 'https://images.unsplash.com/photo-1621532876605-88f87f8f5a5e?w=400',
        sellerId: adminUser._id,
        sellerName: adminUser.name,
        status: 'active'
      },
      {
        title: 'American Gold Eagle',
        description: '1 oz gold bullion coin, 2023 edition. 22-karat gold with iconic walking liberty design. Perfect investment piece.',
        category: 'bullion',
        currentBid: 210,
        numberOfBids: 31,
        endTime: new Date(Date.now() + 3600000 * 48), // 48 hours
        image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400',
        sellerId: adminUser._id,
        sellerName: adminUser.name,
        status: 'active'
      },
      {
        title: 'Morgan Silver Dollar 1921',
        description: 'Classic American silver dollar in very fine condition. Clear details on Liberty\'s hair and eagle\'s feathers. Great starter coin.',
        category: 'modern',
        currentBid: 65,
        numberOfBids: 18,
        endTime: new Date(Date.now() + 3600000 * 18), // 18 hours
        image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400',
        sellerId: demoUser._id,
        sellerName: demoUser.name,
        status: 'active'
      },
      {
        title: 'Greek Tetradrachm',
        description: 'Ancient Greek silver coin from Athens, circa 450 BC. Features Athena and her owl. Museum quality piece.',
        category: 'ancient',
        currentBid: 150,
        numberOfBids: 5,
        endTime: new Date(Date.now() + 3600000 * 36), // 36 hours
        image: 'https://images.unsplash.com/photo-1621532876605-88f87f8f5a5e?w=400',
        sellerId: demoUser._id,
        sellerName: demoUser.name,
        status: 'active'
      },
      {
        title: 'Canadian Silver Maple Leaf',
        description: '1 oz .9999 fine silver bullion coin. Iconic maple leaf design with Queen Elizabeth II portrait. Pristine condition.',
        category: 'bullion',
        currentBid: 35,
        numberOfBids: 12,
        endTime: new Date(Date.now() + 3600000 * 8), // 8 hours
        image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400',
        sellerId: adminUser._id,
        sellerName: adminUser.name,
        status: 'active'
      },
      {
        title: 'State Quarter Collection',
        description: 'Complete set of 50 state quarters from 1999-2008. All in uncirculated condition with original mint luster.',
        category: 'commemorative',
        currentBid: 25,
        numberOfBids: 9,
        endTime: new Date(Date.now() + 3600000 * 4), // 4 hours
        image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400',
        sellerId: adminUser._id,
        sellerName: adminUser.name,
        status: 'active'
      }
    ];

    await Auction.insertMany(auctions);

    console.log('✓ Database seeded successfully!');
    console.log('\nCreated:');
    console.log(`  - ${await User.countDocuments()} users`);
    console.log(`  - ${await Auction.countDocuments()} auctions`);
    console.log('\nLogin credentials:');
    console.log('  Admin: admin@coinauctionhub.com / admin123');
    console.log('  Demo:  demo@example.com / demo123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
};

// Run the seed
connectDB().then(seedDatabase);