import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderId: String,
  amount: Number,
  date: { type: Date, default: Date.now }
});

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  totalSpend: { type: Number, default: 0 },
  visits: { type: Number, default: 0 },
  lastVisitDate: { type: Date, default: Date.now },
  orders: [OrderSchema]
}, { timestamps: true });

const CampaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filterDescription: { type: String },
  mongoQuery: { type: mongoose.Schema.Types.Mixed, default: {} },
  messageTemplate: { type: String, required: true },
  channel: { type: String, enum: ['Email', 'SMS', 'WhatsApp', 'RCS'], required: true },
  status: { type: String, enum: ['draft', 'sending', 'completed'], default: 'draft' },
  stats: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    conversion: { type: Number, default: 0 }
  }
}, { timestamps: true });

const CommunicationLogSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  recipient: { type: String, required: true },
  channel: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'failed', 'opened', 'clicked', 'conversion'], 
    default: 'sent' 
  },
  history: [
    {
      status: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

export const Customer = mongoose.model('Customer', CustomerSchema);
export const Campaign = mongoose.model('Campaign', CampaignSchema);
export const CommunicationLog = mongoose.model('CommunicationLog', CommunicationLogSchema);
