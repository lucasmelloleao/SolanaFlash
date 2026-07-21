const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env.local' });
dotenv.config({ path: '../solana-flash-bot/.env' });

async function run() {
  const uri = process.env.MONGODB_URI;
  console.log("URI:", uri);
  if (!uri) return;
  await mongoose.connect(uri);
  
  const PortfolioSnapshot = mongoose.model('PortfolioSnapshot', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const users = await User.find({});
  console.log("Users:", users.map(u => ({ id: u._id, email: u.email })));
  
  const count = await PortfolioSnapshot.countDocuments();
  console.log("Total PortfolioSnapshots:", count);
  
  if (count > 0) {
    const sample = await PortfolioSnapshot.findOne();
    console.log("Sample Snapshot:", sample);
  }
  
  await mongoose.disconnect();
}
run();
