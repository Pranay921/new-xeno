// Force nodemon restart
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { Customer, Campaign, CommunicationLog } from './models.js';
import { parseSegmentPrompt, generateCampaignTemplate } from './ai.js';

const envParsed = dotenv.config().parsed;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = (envParsed && envParsed.MONGODB_URI) || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/xenocrm';
const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:5001';

async function seedMockCustomers() {
  const names = [
    "Aarav Sharma", "Priya Patel", "John Doe", "Jane Smith", "Kabir Singh", 
    "Sarah Connor", "Rohan Verma", "Emily Watson", "Arjun Mehta", "Ananya Reddy",
    "Michael Brown", "David Miller", "Sophia Davis", "Daniel Wilson", "Olivia Taylor",
    "Emma Thomas", "Liam Martinez", "Noah Anderson", "Lucas Garcia", "Mia Robinson",
    "Aditya Joshi", "Ishaan Kapoor", "Diya Sen", "Sneha Nair", "Vikram Malhotra",
    "Neha Gupta", "Rahul Bose", "Siddharth Roy", "Kiara Advani", "Varun Dhawan"
  ];
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "example.com", "hotmail.com"];

  const customers = [];
  for (let i = 1; i <= 120; i++) {
    const name = names[i % names.length] + " " + String.fromCharCode(65 + (i % 26)) + ".";
    const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}${i}@${domains[i % domains.length]}`;
    const phone = `+${i % 2 === 0 ? '91' : '1'}${Math.floor(6000000000 + Math.random() * 4000000000)}`;
    
    // Generate random orders
    const orderCount = Math.floor(Math.random() * 6); // 0 to 5 orders
    const orders = [];
    for (let o = 1; o <= orderCount; o++) {
      orders.push({
        orderId: `ORD-${i}-${o}`,
        amount: Math.floor(15 + Math.random() * 250), // $15 to $265
        date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
      });
    }

    const totalSpend = orders.reduce((sum, o) => sum + o.amount, 0);
    const visits = orders.length;
    const lastVisitDate = orders.length > 0 
      ? new Date(Math.max(...orders.map(o => new Date(o.date).getTime())))
      : new Date();

    customers.push({
      name,
      email,
      phone,
      totalSpend,
      visits,
      lastVisitDate,
      orders
    });
  }

  await Customer.insertMany(customers);
  console.log(`🌱 Successfully seeded ${customers.length} mock customers.`);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully.');
    try {
      const count = await Customer.countDocuments({});
      if (count === 0) {
        console.log('🌱 Database is empty. Seeding mock customer data...');
        await seedMockCustomers();
      }
    } catch (err) {
      console.error('Error during auto-seeding:', err);
    }
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- API Endpoints ---

// 1. Data Ingestion (Customers & Orders)
app.post('/api/customers/ingest', async (req, res) => {
  try {
    const customersData = req.body;
    if (!Array.isArray(customersData)) {
      return res.status(400).json({ error: "Payload must be an array of customer objects." });
    }

    const insertedCount = [];
    for (const c of customersData) {
      // Calculate derived attributes
      const totalSpend = c.orders ? c.orders.reduce((sum, o) => sum + o.amount, 0) : 0;
      const visits = c.orders ? c.orders.length : 0;
      const lastVisitDate = c.orders && c.orders.length > 0 
        ? new Date(Math.max(...c.orders.map(o => o.date ? new Date(o.date).getTime() : Date.now())))
        : new Date();

      // Upsert based on email
      const doc = await Customer.findOneAndUpdate(
        { email: c.email },
        {
          name: c.name,
          phone: c.phone,
          totalSpend,
          visits,
          lastVisitDate,
          orders: c.orders || []
        },
        { upsert: true, new: true }
      );
      insertedCount.push(doc);
    }

    res.status(200).json({ 
      message: `Successfully ingested/updated ${insertedCount.length} customers.`,
      count: insertedCount.length 
    });
  } catch (error) {
    console.error("Ingestion failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Fetch Customers
app.get('/api/customers', async (req, res) => {
  try {
    const { filter, campaignId } = req.query;
    let queryObj = {};
    if (filter) {
      queryObj = JSON.parse(filter);
    }

    if (campaignId) {
      const logs = await CommunicationLog.find({ campaignId }).select('customerId');
      const customerIds = logs.map(log => log.customerId);
      queryObj._id = { $in: customerIds };
    }

    const customers = await Customer.find(queryObj).limit(100);
    res.json(customers);
  } catch (error) {
    res.status(400).json({ error: "Invalid query filter: " + error.message });
  }
});

// 3. AI segment translation
app.post('/api/segments/ai-query', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }
    const result = await parseSegmentPrompt(prompt);
    // Let's count matching customers to verify the size of the segment
    const count = await Customer.countDocuments(result.query);
    res.json({ ...result, matchedCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. AI Message copy suggestion
app.post('/api/campaigns/ai-draft', async (req, res) => {
  try {
    const { prompt, channel } = req.body;
    if (!prompt || !channel) {
      return res.status(400).json({ error: "Prompt and channel are required." });
    }
    const template = await generateCampaignTemplate(prompt, channel);
    res.json({ template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Create and Launch Campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, filterDescription, mongoQuery, messageTemplate, channel } = req.body;

    if (!name || !messageTemplate || !channel) {
      return res.status(400).json({ error: "name, messageTemplate, and channel are required." });
    }

    // Find the segmented customers
    const query = mongoQuery || {};
    const recipients = await Customer.find(query);

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No customers match the segment criteria." });
    }

    // Create the campaign document
    const campaign = new Campaign({
      name,
      filterDescription,
      mongoQuery: query,
      messageTemplate,
      channel,
      status: 'sending',
      stats: { sent: recipients.length }
    });
    await campaign.save();

    // Prepare notifications to go out via the Channel service
    const dispatchPromises = recipients.map(async (customer) => {
      // Personalize message
      let message = messageTemplate
        .replace(/\[Name\]/gi, customer.name)
        .replace(/\[TotalSpend\]/gi, `$${customer.totalSpend.toFixed(2)}`)
        .replace(/\[Visits\]/gi, customer.visits);

      // Create communication log
      const log = new CommunicationLog({
        campaignId: campaign._id,
        customerId: customer._id,
        recipient: channel === 'Email' ? customer.email : customer.phone,
        channel,
        message,
        status: 'sent',
        history: [{ status: 'sent', timestamp: new Date() }]
      });
      await log.save();
// 
      // Trigger Dispatch to Channel Service Stub
      try {
        await axios.post(`${CHANNEL_SERVICE_URL}/api/send`, {
          logId: log._id,
          recipient: log.recipient,
          message: log.message,
          channel: log.channel
        });
      } catch (err) {
        console.error(`Failed to dispatch message for log ${log._id}:`, err.message);
        // Update to failed
        log.status = 'failed';
        log.history.push({ status: 'failed', timestamp: new Date() });
        await log.save();
      }
    });

    await Promise.all(dispatchPromises);

    // Update campaign status
    campaign.status = 'completed';
    await campaign.save();

    res.status(201).json({
      message: "Campaign launched successfully.",
      campaign
    });
  } catch (error) {
    console.error("Launch campaign error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Channel Service Callback endpoint
app.post('/api/campaigns/callback', async (req, res) => {
  try {
    const { logId, status, timestamp } = req.body;
    if (!logId || !status) {
      return res.status(400).json({ error: "logId and status are required." });
    }

    const log = await CommunicationLog.findById(logId);
    if (!log) {
      return res.status(404).json({ error: "Communication log not found." });
    }

    // Keep track of old status to calculate campaign counters correctly
    const oldStatus = log.status;

    // Update log status
    log.status = status;
    log.history.push({ status, timestamp: timestamp ? new Date(timestamp) : new Date() });
    await log.save();

    // Update Campaign Stats
    const campaign = await Campaign.findById(log.campaignId);
    if (campaign) {
      // Initialize if fields are not present
      if (!campaign.stats) campaign.stats = {};

      // Calculate state changes
      if (status === 'delivered' && oldStatus !== 'delivered') {
        campaign.stats.delivered = (campaign.stats.delivered || 0) + 1;
      } else if (status === 'failed' && oldStatus !== 'failed') {
        campaign.stats.failed = (campaign.stats.failed || 0) + 1;
      } else if (status === 'opened' && oldStatus !== 'opened') {
        campaign.stats.opened = (campaign.stats.opened || 0) + 1;
      } else if (status === 'clicked' && oldStatus !== 'clicked') {
        campaign.stats.clicked = (campaign.stats.clicked || 0) + 1;
      } else if (status === 'conversion' && oldStatus !== 'conversion') {
        campaign.stats.conversion = (campaign.stats.conversion || 0) + 1;
      }

      await campaign.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Callback handler error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Get Campaigns and Stats
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Fetch detailed log statistics for a campaign
app.get('/api/campaigns/:id/logs', async (req, res) => {
  try {
    const logs = await CommunicationLog.find({ campaignId: req.params.id })
      .populate('customerId', 'name email')
      .sort({ updatedAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Dashboard overview aggregate stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments({});
    const totalSpendRes = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: "$totalSpend" } } }
    ]);
    const totalRevenue = totalSpendRes.length > 0 ? totalSpendRes[0].total : 0;

    const totalCampaigns = await Campaign.countDocuments({});
    const logsStats = await CommunicationLog.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const statusMap = {
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0,
      conversion: 0
    };

    logsStats.forEach(item => {
      if (item._id in statusMap) {
        statusMap[item._id] = item.count;
      }
    });

    res.json({
      totalCustomers,
      totalRevenue,
      totalCampaigns,
      statusMap
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend running on port ${PORT}`);
});
