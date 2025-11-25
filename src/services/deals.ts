import { supabase } from '../config/database';
import { Deal } from '../types/deal';

export class DealsService {

  async getTopDeals(limit: number = 6): Promise<Deal[]> {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        id,
        retailer_id,
        product_id,
        price,
        start_date,
        end_date,
        retailers:retailer_id (
          name
        ),
        products:product_id (
          name,
          size,
          category
        )
      `)
      .order('price', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map((deal: any) => ({
      id: deal.id,
      retailer_id: deal.retailer_id,
      product_id: deal.product_id,
      price: parseFloat(deal.price),
      start_date: deal.start_date,
      end_date: deal.end_date,
      retailer_name: deal.retailers?.name || 'Unknown',
      product_name: deal.products?.name || 'Unknown',
      product_size: deal.products?.size || '',
      category: deal.products?.category || '',
    }));
  }
  async getDealsForUser(preferredRetailers: string[], limit: number = 6): Promise<Deal[]> {
    const { data: retailers, error: retailerError } = await supabase
      .from('retailers')
      .select('id, name')
      .in('name', preferredRetailers);

    if (retailerError) {
      throw new Error(`Failed to fetch retailers: ${retailerError.message}`);
    }

    if (!retailers || retailers.length === 0) {
      return [];
    }

    const retailerIds = retailers.map((r: { id: string }) => r.id);

    const { data, error } = await supabase
      .from('deals')
      .select(`
        id,
        retailer_id,
        product_id,
        price,
        start_date,
        end_date,
        retailers:retailer_id (
          name
        ),
        products:product_id (
          name,
          size,
          category
        )
      `)
      .in('retailer_id', retailerIds)
      .order('price', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch deals: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data.map((deal: any) => ({
      id: deal.id,
      retailer_id: deal.retailer_id,
      product_id: deal.product_id,
      price: parseFloat(deal.price),
      start_date: deal.start_date,
      end_date: deal.end_date,
      retailer_name: deal.retailers?.name || 'Unknown',
      product_name: deal.products?.name || 'Unknown',
      product_size: deal.products?.size || '',
      category: deal.products?.category || '',
    }));
  }

  async getAllUsers(): Promise<Array<{ id: string; name: string; email: string; preferred_retailers: string[] }>> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, preferred_retailers');

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  }
}

