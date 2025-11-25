# Prox Deals → Email Automation

Automated system that ingests weekly deal data, stores it in a Supabase database, and sends branded "Weekly Deals" emails to users based on their preferred retailers.

## Overview

This project implements Track A of the Prox Software Engineering Intern technical assessment. It provides:

- **Data Ingestion**: Loads deal data into a normalized database schema with deduplication
- **Email Generation**: Creates branded HTML emails using Prox colors and design
- **Preference Filtering**: Sends personalized deals based on user's preferred retailers
- **CLI Automation**: Single command to run the entire pipeline

### Key Features

- **Deduplication**: Prevents duplicate deals based on `retailer_id + product_id + start_date`
- **Normalized Schema**: Separate tables for retailers, products, and deals
- **User Preferences**: Array-based storage for preferred retailers
- **Indexed Queries**: Optimized indexes on price, dates, and categories

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <url of the repo>
npm install
```

### 2. Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 3. Set Up Resend API

1. Create an account at [resend.com](https://resend.com)
2. Generate an API key from the dashboard
3. Verify your sending domain (or use Resend's test domain)

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

**Note**: For testing, you can use Resend's test domain: `onboarding@resend.dev`

### 5. Build the Project

```bash
npm run build
```

## Usage

### Run the Full Pipeline

The main command that ingests data and sends emails:

```bash
npm run send:weekly
```

This command will:
1. ✅ Ingest sample deal data into the database
2. ✅ Seed test users with their preferences
3. ✅ Fetch deals filtered by each user's preferred retailers
4. ✅ Generate and send branded HTML emails

### Standalone Data Ingestion

To only ingest data without sending emails:

```bash
npm run ingest
```

## Email Features

### Branding

- **Primary Color**: `#0FB872` (Prox green)
- **Dark Color**: `#0A4D3C` (Dark green)
- **Background**: `#F4FBF8` (Light green tint)

### Email Content

Each email includes:
- Branded header with Prox logo/text
- Top 6 deals sorted by lowest price
- Deals grouped by retailer
- Product details: name, size, category, price, valid dates
- Footer with "Manage Preferences" link
- Plain-text fallback for email clients

### User Filtering

Users only receive deals from their preferred retailers:
- **Sarah Chen**: Whole Foods, Sprouts
- **Mike Rodriguez**: Walmart, Aldi, Smart & Final
- **Emma Johnson**: Ralphs, Vons, CVS

## Project Structure

```
.
├── src/
│   ├── cli.ts                 # Main CLI command
│   ├── config/
│   │   └── database.ts        # Supabase client configuration
│   ├── data/
│   │   └── sample-data.ts     # Sample deals and test users
│   ├── services/
│   │   ├── deals.ts           # Deal querying logic
│   │   ├── email.ts           # Email generation and sending
│   │   └── ingestion.ts       # Data ingestion with deduplication
│   ├── scripts/
│   │   └── ingest.ts          # Standalone ingestion script
│   └── types/
│       └── deal.ts            # TypeScript type definitions
├── supabase/
│   └── schema.sql             # Database schema
├── package.json
├── tsconfig.json
└── README.md
```

## Edge Cases Handled

- **Deduplication**: Prevents duplicate deals on re-runs
- **Missing Retailers**: Creates retailers/products if they don't exist
- **Empty Results**: Skips email if user has no matching deals
- **Database Errors**: Proper error handling with informative messages
- **Email Failures**: Continues processing other users if one fails

## Troubleshooting

### Database Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check that the schema has been applied in Supabase SQL Editor
- Ensure your Supabase project is active

### Email Sending Issues
- Verify `RESEND_API_KEY` is correct
- Check that `FROM_EMAIL` is verified in Resend dashboard
- **Resend Free Tier Limitation**: The free tier only allows sending emails to your own verified email address. 
  - The test users use example.com emails as specified in the requirements
  - **To actually send emails**: Verify a domain at [resend.com/domains](https://resend.com/domains) and update `FROM_EMAIL` to use your verified domain
  - **For testing**: You can temporarily update test user emails in `src/data/sample-data.ts` to your verified email address
- **Rate Limiting**: Resend allows 2 requests per second. The code includes automatic rate limiting with delays between emails.
- **Note**: The email generation, filtering, and sending logic all work correctly. The limitation is only with Resend's free tier restrictions on recipient addresses.

### No Deals Found
- Ensure data ingestion completed successfully
- Check that user's preferred retailers match retailer names exactly
- Verify deals exist in the database via Supabase dashboard

