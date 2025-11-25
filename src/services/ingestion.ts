import { supabase } from '../config/database';
import { DealData } from '../types/deal';

export class IngestionService {
  async ingestDeals(deals: DealData[]): Promise<void> {
    console.log(`Starting ingestion of ${deals.length} deals...`);

    for (const deal of deals) {
      try {
        let retailerId = await this.getOrCreateRetailer(deal.retailer);

        let productId = await this.getOrCreateProduct(
          deal.product,
          deal.size,
          deal.category
        );

        const { data: existingDeal } = await supabase
          .from('deals')
          .select('id')
          .eq('retailer_id', retailerId)
          .eq('product_id', productId)
          .eq('start_date', deal.start)
          .single();

        if (existingDeal) {
          console.log(`Deal already exists: ${deal.retailer} - ${deal.product} (${deal.start})`);
          continue;
        }

        const { error: dealError } = await supabase
          .from('deals')
          .insert({
            retailer_id: retailerId,
            product_id: productId,
            price: deal.price,
            start_date: deal.start,
            end_date: deal.end,
          });

        if (dealError) {
          throw new Error(`Failed to insert deal: ${dealError.message}`);
        }

        console.log(`✓ Ingested: ${deal.retailer} - ${deal.product} - $${deal.price}`);
      } catch (error) {
        console.error(`Error ingesting deal ${deal.retailer} - ${deal.product}:`, error);
        throw error;
      }
    }

    console.log('✓ Ingestion complete!');
  }

  private async getOrCreateRetailer(retailerName: string): Promise<string> {
    const { data: existing } = await supabase
      .from('retailers')
      .select('id')
      .eq('name', retailerName)
      .single();

    if (existing) {
      return existing.id;
    }

    const { data: newRetailer, error } = await supabase
      .from('retailers')
      .insert({ name: retailerName })
      .select('id')
      .single();

    if (error) {
      if (error.message.includes('does not exist') || 
          error.message.includes('schema cache') ||
          error.code === '42P01') {
        throw new Error(
          `Database table 'retailers' does not exist. ` +
          `Please run the schema.sql file in Supabase SQL Editor first. ` +
          `See SETUP.md for instructions. Original error: ${error.message}`
        );
      }
      throw new Error(`Failed to create retailer: ${error.message}`);
    }

    if (!newRetailer) {
      throw new Error('Failed to create retailer: No data returned');
    }

    return newRetailer.id;
  }

  private async getOrCreateProduct(
    productName: string,
    size: string,
    category: string
  ): Promise<string> {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', productName)
      .eq('size', size)
      .eq('category', category)
      .single();

    if (existing) {
      return existing.id;
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        name: productName,
        size: size,
        category: category,
      })
      .select('id')
      .single();

    if (error) {
      if (error.message.includes('does not exist') || 
          error.message.includes('schema cache') ||
          error.code === '42P01') {
        throw new Error(
          `Database table 'products' does not exist. ` +
          `Please run the schema.sql file in Supabase SQL Editor first. ` +
          `See SETUP.md for instructions. Original error: ${error.message}`
        );
      }
      throw new Error(`Failed to create product: ${error.message}`);
    }

    if (!newProduct) {
      throw new Error('Failed to create product: No data returned');
    }

    return newProduct.id;
  }

  async seedUsers(users: Array<{ name: string; email: string; preferred_retailers: string[] }>): Promise<void> {
    console.log(`Seeding ${users.length} test users...`);

    for (const user of users) {
      const { data: existingByName } = await supabase
        .from('users')
        .select('id, email')
        .eq('name', user.name)
        .maybeSingle();

      const { data: existingByEmail } = await supabase
        .from('users')
        .select('id, name')
        .eq('email', user.email)
        .maybeSingle();

      if (existingByName) {
        if (existingByEmail && existingByEmail.id !== existingByName.id) {
          console.log(`  Removing conflicting user: ${existingByEmail.name} (email: ${user.email})`);
          await supabase.from('users').delete().eq('id', existingByEmail.id);
        }

        const { error } = await supabase
          .from('users')
          .update({
            email: user.email,
            preferred_retailers: user.preferred_retailers,
          })
          .eq('id', existingByName.id);

        if (error) {
          console.error(`Error updating user ${user.name}:`, error.message);
        } else {
          const emailChanged = existingByName.email !== user.email;
          console.log(`✓ ${emailChanged ? 'Updated' : 'Seeded'} user: ${user.name} (${user.email})`);
        }
      } else if (existingByEmail) {
        const { error } = await supabase
          .from('users')
          .update({
            name: user.name,
            preferred_retailers: user.preferred_retailers,
          })
          .eq('id', existingByEmail.id);

        if (error) {
          console.error(`Error updating user ${existingByEmail.name}:`, error.message);
        } else {
          console.log(`✓ Updated user: ${existingByEmail.name} → ${user.name} (${user.email})`);
        }
      } else {
        const { error } = await supabase
          .from('users')
          .insert({
            email: user.email,
            name: user.name,
            preferred_retailers: user.preferred_retailers,
          });

        if (error) {
          console.error(`Error seeding user ${user.name}:`, error.message);
        } else {
          console.log(`✓ Seeded user: ${user.name} (${user.email})`);
        }
      }
    }

    console.log('✓ User seeding complete!');
  }
}

