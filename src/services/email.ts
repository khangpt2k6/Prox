import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import { Deal } from '../types/deal';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'noreply@prox.com';

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

const resend = new Resend(resendApiKey);

export class EmailService {

  private generateEmailHTML(deals: Deal[], userName: string): string {
    const dealsByRetailer = new Map<string, Deal[]>();
    for (const deal of deals) {
      if (!dealsByRetailer.has(deal.retailer_name)) {
        dealsByRetailer.set(deal.retailer_name, []);
      }
      dealsByRetailer.get(deal.retailer_name)!.push(deal);
    }

    let retailerSections = '';
    for (const [retailer, retailerDeals] of dealsByRetailer.entries()) {
      retailerSections += `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #0A4D3C; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #0FB872; padding-bottom: 5px;">
            ${retailer}
          </h2>
          ${retailerDeals.map(deal => `
            <div style="background: #F4FBF8; padding: 15px; margin-bottom: 10px; border-radius: 5px; border-left: 4px solid #0FB872;">
              <div style="font-size: 18px; font-weight: bold; color: #0A4D3C; margin-bottom: 5px;">
                ${deal.product_name}
              </div>
              <div style="color: #666; margin-bottom: 5px;">
                Size: ${deal.product_size} | Category: ${deal.category}
              </div>
              <div style="font-size: 24px; color: #0FB872; font-weight: bold;">
                $${deal.price.toFixed(2)}
              </div>
              <div style="color: #666; font-size: 14px; margin-top: 5px;">
                Valid: ${new Date(deal.start_date).toLocaleDateString()} - ${new Date(deal.end_date).toLocaleDateString()}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #0FB872 0%, #0A4D3C 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
                Prox
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                Weekly Deals
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px;">
              <p style="color: #333; font-size: 16px; margin-top: 0;">
                Hi ${userName},
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                Here are your top deals this week, curated just for you!
              </p>
              
              ${retailerSections}
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  Happy shopping! 🛒
                </p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #F4FBF8; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; margin: 5px 0;">
                <a href="https://prox.com/preferences" style="color: #0FB872; text-decoration: none;">Manage Preferences</a>
              </p>
              <p style="color: #999; font-size: 11px; margin: 5px 0;">
                © ${new Date().getFullYear()} Prox. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }


  private generateEmailText(deals: Deal[], userName: string): string {
    const dealsByRetailer = new Map<string, Deal[]>();
    for (const deal of deals) {
      if (!dealsByRetailer.has(deal.retailer_name)) {
        dealsByRetailer.set(deal.retailer_name, []);
      }
      dealsByRetailer.get(deal.retailer_name)!.push(deal);
    }

    let text = `Hi ${userName},\n\n`;
    text += `Here are your top deals this week, curated just for you!\n\n`;

    for (const [retailer, retailerDeals] of dealsByRetailer.entries()) {
      text += `${retailer}\n`;
      text += `${'='.repeat(retailer.length)}\n\n`;
      for (const deal of retailerDeals) {
        text += `${deal.product_name}\n`;
        text += `Size: ${deal.product_size} | Category: ${deal.category}\n`;
        text += `Price: $${deal.price.toFixed(2)}\n`;
        text += `Valid: ${new Date(deal.start_date).toLocaleDateString()} - ${new Date(deal.end_date).toLocaleDateString()}\n\n`;
      }
    }

    text += `\nManage Preferences: https://prox.com/preferences\n`;
    text += `\n© ${new Date().getFullYear()} Prox. All rights reserved.\n`;

    return text;
  }


  async sendWeeklyDealsEmail(
    userEmail: string,
    userName: string,
    deals: Deal[]
  ): Promise<void> {
    if (deals.length === 0) {
      console.log(`Skipping email to ${userEmail} - no deals available`);
      return;
    }

    const html = this.generateEmailHTML(deals, userName);
    const text = this.generateEmailText(deals, userName);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: `Your Weekly Deals - ${deals.length} Great Offers!`,
        html: html,
        text: text,
      });

      if (error) {
        const errorMsg = error.message || 'Unknown error';
        throw new Error(`Resend API error: ${errorMsg}`);
      }

      console.log(`✓ Email sent to ${userEmail} (ID: ${data?.id})`);
    } catch (error) {
      console.error(`Failed to send email to ${userEmail}:`, error);
      throw error;
    }
  }
}

