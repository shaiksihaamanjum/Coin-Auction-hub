// Sample auction data
let auctions = [
    {
        id: 1,
        title: "1909-S VDB Lincoln Penny",
        description: "Rare Lincoln cent in excellent condition",
        category: "modern",
        currentBid: 50,
        numberOfBids: 15,
        endTime: new Date(Date.now() + 3600000 * 24),
        image: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400",
        sellerId: 0,
        sellerName: "Admin",
        winner: null
    },
    {
        id: 2,
        title: "Ancient Roman Denarius",
        description: "Silver denarius from Emperor Augustus era",
        category: "ancient",
        currentBid: 85,
        numberOfBids: 8,
        endTime: new Date(Date.now() + 3600000 * 12),
        image: "https://images.unsplash.com/photo-1621532876605-88f87f8f5a5e?w=400",
        sellerId: 0,
        sellerName: "Admin",
        winner: null
    },
    {
        id: 3,
        title: "1964 Kennedy Half Dollar",
        description: "Silver commemorative coin, uncirculated",
        category: "commemorative",
        currentBid: 42,
        numberOfBids: 22,
        endTime: new Date(Date.now() + 3600000 * 6),
        image: "https://images.unsplash.com/photo-1621532876605-88f87f8f5a5e?w=400",
        sellerId: 0,
        sellerName: "Admin",
        winner: null
    },
    {
        id: 4,
        title: "American Gold Eagle",
        description: "1 oz gold bullion coin, 2023",
        category: "bullion",
        currentBid: 210,
        numberOfBids: 31,
        endTime: new Date(Date.now() + 3600000 * 48),
        image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400",
        sellerId: 0,
        sellerName: "Admin",
        winner: null
    }
];

let currentAuction = null;
let currentUser = null;
let nextAuctionId = 5;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadAuctions();
    renderAuctions(auctions);
    setupEventListeners();
    startTimerUpdates();
    checkExpiredAuctions();
    setInterval(checkExpiredAuctions, 60000); // Check every minute
});

// Check authentication status
function checkAuthStatus() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        updateAuthUI();
    } else {
        updateAuthUI();
    }
}

// Update authentication UI
function updateAuthUI() {
    const navAuth = document.getElementById('navAuth');
    const addItemBtn = document.getElementById('addItemBtn');
    
    if (currentUser) {
        navAuth.innerHTML = `
            <div class="user-info">
                <span class="user-welcome">Welcome, ${currentUser.name}!</span>
                <div class="coin-balance" onclick="openBuyCoinsModal()">
                    <span class="coin-icon">🪙</span>
                    <span>${currentUser.coins} coins</span>
                </div>
                <button class="btn btn-danger" onclick="logout()">Logout</button>
            </div>
        `;
        if (addItemBtn) addItemBtn.style.display = 'block';
    } else {
        navAuth.innerHTML = `
            <button class="btn btn-outline" onclick="openLoginModal()">Login</button>
            <button class="btn btn-primary" onclick="openRegisterModal()">Register</button>
        `;
        if (addItemBtn) addItemBtn.style.display = 'none';
    }
    
    updateMyItems();
}

// Save/Load auctions from localStorage
function saveAuctions() {
    localStorage.setItem('auctions', JSON.stringify(auctions));
}

function loadAuctions() {
    const saved = localStorage.getItem('auctions');
    if (saved) {
        auctions = JSON.parse(saved).map(a => ({
            ...a,
            endTime: new Date(a.endTime)
        }));
    }
}

// Check for expired auctions
function checkExpiredAuctions() {
    const now = new Date();
    let updated = false;
    
    auctions.forEach(auction => {
        if (!auction.winner && new Date(auction.endTime) < now && auction.numberOfBids > 0) {
            // Auction ended, declare winner
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const highestBid = auction.currentBid;
            const lastBidder = auction.lastBidder;
            
            if (lastBidder) {
                auction.winner = lastBidder;
                
                // Add coins to seller
                if (auction.sellerId !== 0) {
                    const seller = users.find(u => u.id === auction.sellerId);
                    if (seller) {
                        seller.coins += highestBid;
                        localStorage.setItem('users', JSON.stringify(users));
                        
                        // Update if seller is current user
                        if (currentUser && currentUser.id === auction.sellerId) {
                            currentUser.coins = seller.coins;
                            localStorage.setItem('currentUser', JSON.stringify(currentUser));
                            updateAuthUI();
                        }
                    }
                }
                
                updated = true;
            }
        }
    });
    
    if (updated) {
        saveAuctions();
        renderAuctions(auctions);
        updateMyItems();
    }
}

// Render auction cards
function renderAuctions(auctionsToRender) {
    const grid = document.getElementById('auctionGrid');
    grid.innerHTML = '';

    if (auctionsToRender.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No auctions found.</p>';
        return;
    }

    auctionsToRender.forEach(auction => {
        const card = createAuctionCard(auction);
        grid.appendChild(card);
    });
}

// Create auction card element
function createAuctionCard(auction) {
    const card = document.createElement('div');
    card.className = 'auction-card';
    
    const timeRemaining = getTimeRemaining(auction.endTime);
    const isEnded = new Date(auction.endTime) < new Date();
    const isWinner = currentUser && auction.winner && auction.winner.userId === currentUser.id;
    
    card.innerHTML = `
        ${isWinner ? '<div class="won-badge">🏆 You Won!</div>' : ''}
        <img src="${auction.image}" alt="${auction.title}" class="auction-image">
        <div class="auction-content">
            <h3 class="auction-title">${auction.title}</h3>
            <p class="auction-description">${auction.description}</p>
            <p class="auction-seller">Seller: ${auction.sellerName}</p>
            <div class="auction-timer" data-end="${auction.endTime.toISOString()}">
                ${timeRemaining}
            </div>
            <div class="auction-meta">
                <div>
                    <div class="auction-price">🪙 ${auction.currentBid}</div>
                    <div class="auction-bids">${auction.numberOfBids} bids</div>
                </div>
            </div>
            ${isEnded ? 
                (auction.winner ? 
                    `<button class="btn btn-primary bid-btn" disabled>Won by ${auction.winner.userName}</button>` :
                    `<button class="btn btn-primary bid-btn" disabled>Auction Ended</button>`) :
                `<button class="btn btn-primary bid-btn" onclick="openBidModal(${auction.id})">Place Bid</button>`
            }
        </div>
    `;
    
    return card;
}

// Get time remaining string
function getTimeRemaining(endTime) {
    const now = new Date();
    const diff = endTime - now;
    
    if (diff <= 0) {
        return 'Auction Ended';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else {
        return `${minutes}m ${seconds}s`;
    }
}

// Update all timers
function updateTimers() {
    const timers = document.querySelectorAll('.auction-timer');
    timers.forEach(timer => {
        const endTime = new Date(timer.dataset.end);
        timer.textContent = getTimeRemaining(endTime);
    });
}

// Start timer updates
function startTimerUpdates() {
    setInterval(updateTimers, 1000);
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('categoryFilter').addEventListener('change', filterAuctions);
    document.getElementById('searchInput').addEventListener('input', filterAuctions);
    document.getElementById('contactForm').addEventListener('submit', handleContactForm);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('bidForm').addEventListener('submit', handleBidSubmission);
    document.getElementById('addItemForm').addEventListener('submit', handleAddItem);
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Filter auctions
function filterAuctions() {
    const category = document.getElementById('categoryFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = auctions;
    
    if (category !== 'all') {
        filtered = filtered.filter(a => a.category === category);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(a => 
            a.title.toLowerCase().includes(searchTerm) ||
            a.description.toLowerCase().includes(searchTerm)
        );
    }
    
    renderAuctions(filtered);
}

// Modal Functions
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('loginError').classList.remove('show');
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.remove('show');
}

function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('registerError').classList.remove('show');
}

function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('registerForm').reset();
    document.getElementById('registerError').classList.remove('show');
}

function openBidModal(auctionId) {
    if (!currentUser) {
        showToast('Please login to place a bid', 'error');
        openLoginModal();
        return;
    }

    currentAuction = auctions.find(a => a.id === auctionId);
    if (!currentAuction) return;
    
    // Check if auction ended
    if (new Date(currentAuction.endTime) < new Date()) {
        showToast('This auction has ended', 'error');
        return;
    }
    
    // Check if user is the seller
    if (currentAuction.sellerId === currentUser.id) {
        showToast('You cannot bid on your own item', 'error');
        return;
    }
    
    const modal = document.getElementById('bidModal');
    const coinInfo = document.getElementById('modalCoinInfo');
    const minBidEl = document.getElementById('minBid');
    const userBalanceEl = document.getElementById('userBalance');
    const bidAmountInput = document.getElementById('bidAmount');
    
    const minBid = currentAuction.currentBid + 1;
    
    coinInfo.innerHTML = `
        <h3>${currentAuction.title}</h3>
        <p>Current Bid: 🪙 ${currentAuction.currentBid} coins</p>
        <p>Number of Bids: ${currentAuction.numberOfBids}</p>
        <p>Seller: ${currentAuction.sellerName}</p>
    `;
    
    minBidEl.textContent = minBid;
    userBalanceEl.textContent = currentUser.coins;
    bidAmountInput.min = minBid;
    bidAmountInput.value = minBid;
    
    document.getElementById('bidError').classList.remove('show');
    modal.style.display = 'block';
}

function closeBidModal() {
    document.getElementById('bidModal').style.display = 'none';
    document.getElementById('bidForm').reset();
    document.getElementById('bidError').classList.remove('show');
    currentAuction = null;
}

function openAddItemModal() {
    if (!currentUser) {
        showToast('Please login to add items', 'error');
        openLoginModal();
        return;
    }
    document.getElementById('addItemModal').style.display = 'block';
    document.getElementById('addItemError').classList.remove('show');
}

function closeAddItemModal() {
    document.getElementById('addItemModal').style.display = 'none';
    document.getElementById('addItemForm').reset();
    document.getElementById('addItemError').classList.remove('show');
}

function openBuyCoinsModal() {
    document.getElementById('buyCoinsModal').style.display = 'block';
}

function closeBuyCoinsModal() {
    document.getElementById('buyCoinsModal').style.display = 'none';
}

function switchToRegister() {
    closeLoginModal();
    openRegisterModal();
}

function switchToLogin() {
    closeRegisterModal();
    openLoginModal();
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        const { password, ...userWithoutPassword } = user;
        currentUser = userWithoutPassword;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showToast('Login successful! You have ' + currentUser.coins + ' coins');
        closeLoginModal();
        updateAuthUI();
    } else {
        errorDiv.textContent = 'Invalid email or password';
        errorDiv.classList.add('show');
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorDiv = document.getElementById('registerError');
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.classList.add('show');
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.classList.add('show');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.some(u => u.email === email)) {
        errorDiv.textContent = 'Email already registered';
        errorDiv.classList.add('show');
        return;
    }
    
    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        coins: 1000, // Start with 1000 coins
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    const { password: _, ...userWithoutPassword } = newUser;
    currentUser = userWithoutPassword;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showToast('🎉 Registration successful! You received 1000 FREE coins!');
    closeRegisterModal();
    updateAuthUI();
}

// Handle Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showToast('Logged out successfully');
}

// Handle bid submission
async function handleBidSubmission(e) {
    e.preventDefault();
    
    const bidAmount = parseInt(document.getElementById('bidAmount').value);
    const errorDiv = document.getElementById('bidError');
    
    if (!currentAuction || !currentUser) return;
    
    const minBid = currentAuction.currentBid + 1;
    
    if (bidAmount < minBid) {
        errorDiv.textContent = `Bid must be at least ${minBid} coins`;
        errorDiv.classList.add('show');
        return;
    }
    
    if (bidAmount > currentUser.coins) {
        errorDiv.textContent = 'Insufficient coins! Purchase more coins to continue.';
        errorDiv.classList.add('show');
        return;
    }
    
    // Deduct coins from user
    currentUser.coins -= bidAmount;
    
    // Update user in localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].coins = currentUser.coins;
        localStorage.setItem('users', JSON.stringify(users));
    }
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update auction
    currentAuction.currentBid = bidAmount;
    currentAuction.numberOfBids += 1;
    currentAuction.lastBidder = {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email
    };
    
    saveAuctions();
    
    showToast('Bid placed successfully! 🎉');
    closeBidModal();
    renderAuctions(auctions);
    updateAuthUI();
}

// Handle add item
async function handleAddItem(e) {
    e.preventDefault();
    
    const title = document.getElementById('itemTitle').value;
    const description = document.getElementById('itemDescription').value;
    const category = document.getElementById('itemCategory').value;
    const startingBid = parseInt(document.getElementById('itemStartingBid').value);
    const duration = parseInt(document.getElementById('itemDuration').value);
    const image = document.getElementById('itemImage').value || 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=400';
    
    const newAuction = {
        id: nextAuctionId++,
        title,
        description,
        category,
        currentBid: startingBid,
        numberOfBids: 0,
        endTime: new Date(Date.now() + duration * 3600000),
        image,
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        winner: null
    };
    
    auctions.push(newAuction);
    saveAuctions();
    
    showToast('Item listed successfully! 🎉');
    closeAddItemModal();
    renderAuctions(auctions);
    updateMyItems();
}

// Handle contact form
async function handleContactForm(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;
    
    showToast('Message sent successfully!');
    document.getElementById('contactForm').reset();
}

// Update My Items section
function updateMyItems() {
    const winningsList = document.getElementById('winningsList');
    const listingsList = document.getElementById('listingsList');
    
    if (!currentUser) {
        winningsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><p>Please login to view your winnings</p></div>';
        listingsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><p>Please login to view your listings</p></div>';
        return;
    }
    
    // Winnings
    const winnings = auctions.filter(a => a.winner && a.winner.userId === currentUser.id);
    if (winnings.length === 0) {
        winningsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>You haven\'t won any auctions yet</p></div>';
    } else {
        winningsList.innerHTML = '';
        winnings.forEach(auction => {
            winningsList.appendChild(createAuctionCard(auction));
        });
    }
    
    // Listings
    const listings = auctions.filter(a => a.sellerId === currentUser.id);
    if (listings.length === 0) {
        listingsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>You haven\'t listed any items yet</p></div>';
    } else {
        listingsList.innerHTML = '';
        listings.forEach(auction => {
            listingsList.appendChild(createAuctionCard(auction));
        });
    }
}

// Show tab
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'winnings') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('winningsTab').classList.add('active');
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('listingsTab').classList.add('active');
    }
}

// Buy coins
function selectCoinPackage(coins, price) {
    if (!currentUser) {
        showToast('Please login first', 'error');
        closeBuyCoinsModal();
        openLoginModal();
        return;
    }
    
    // Simulate purchase
    currentUser.coins += coins;
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].coins = currentUser.coins;
        localStorage.setItem('users', JSON.stringify(users));
    }
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showToast(`🎉 Successfully purchased ${coins} coins for $${price}!`);
    closeBuyCoinsModal();
    updateAuthUI();
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Close modals on outside click
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const bidModal = document.getElementById('bidModal');
    const addItemModal = document.getElementById('addItemModal');
    const buyCoinsModal = document.getElementById('buyCoinsModal');
    
    if (event.target === loginModal) closeLoginModal();
    else if (event.target === registerModal) closeRegisterModal();
    else if (event.target === bidModal) closeBidModal();
    else if (event.target === addItemModal) closeAddItemModal();
    else if (event.target === buyCoinsModal) closeBuyCoinsModal();
}