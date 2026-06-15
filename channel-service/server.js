import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;
const CRM_CALLBACK_URL = process.env.CRM_CALLBACK_URL || 'http://localhost:5000/api/campaigns/callback';

/**
 * Helper to safely post status updates back to CRM.
 */
async function sendCallback(logId, status) {
  try {
    await axios.post(CRM_CALLBACK_URL, {
      logId,
      status,
      timestamp: new Date().toISOString()
    });
    console.log(`[CALLBACK SUCCESS] Sent status: ${status} for log ID: ${logId}`);
  } catch (error) {
    console.error(`[CALLBACK FAILED] Error sending status: ${status} for log ID: ${logId}:`, error.message);
  }
}

// 1. Receive dispatch command from CRM
app.post('/api/send', (req, res) => {
  const { logId, recipient, message, channel } = req.body;

  if (!logId) {
    return res.status(400).json({ error: "logId is required." });
  }

  console.log(`[DISPATCH RECEIVED] Channel: ${channel} | Recipient: ${recipient} | Msg length: ${message?.length}`);

  // 202 Accepted: The request has been accepted for processing, but processing has not been completed.
  res.status(202).json({ status: "Accepted", logId });

  // Asynchronously trigger simulated events
  simulateMessageLifecycle(logId, channel);
});

/**
 * Simulates real-world delivery and user action events over time.
 */
function simulateMessageLifecycle(logId, channel) {
  // Step 1: Delivered or Failed (after 1 second)
  setTimeout(async () => {
    // 92% success rate
    const isDelivered = Math.random() < 0.92;
    const finalStatus = isDelivered ? 'delivered' : 'failed';
    
    await sendCallback(logId, finalStatus);

    if (isDelivered) {
      // Step 2: Opened / Read (after 2.5 seconds)
      setTimeout(async () => {
        // High open rates on WhatsApp/RCS (70%), medium on SMS (50%), lower on Email (30%)
        let openChance = 0.50;
        if (channel === 'WhatsApp' || channel === 'RCS') openChance = 0.75;
        if (channel === 'Email') openChance = 0.35;

        const isOpened = Math.random() < openChance;
        if (isOpened) {
          await sendCallback(logId, 'opened');

          // Step 3: Clicked / Interacted (after 3.5 seconds)
          setTimeout(async () => {
            const clickChance = 0.30; // 30% click rate for those who opened
            const isClicked = Math.random() < clickChance;
            
            if (isClicked) {
              await sendCallback(logId, 'clicked');

              // Step 4: Purchase/Conversion (after 4 seconds)
              setTimeout(async () => {
                const conversionChance = 0.25; // 25% purchase rate for those who clicked
                const isConverted = Math.random() < conversionChance;
                
                if (isConverted) {
                  await sendCallback(logId, 'conversion');
                }
              }, 4000);
            }
          }, 3500);
        }
      }, 2500);
    }
  }, 1000);
}

app.listen(PORT, () => {
  console.log(`📡 Simulated Channel Service listening on port ${PORT}`);
});
