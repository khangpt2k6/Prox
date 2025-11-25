export interface DealData {
  retailer: string;
  product: string;
  size: string;
  price: number;
  start: string;
  end: string;
  category: string;
}

export interface User {
  name: string;
  email: string;
  preferred_retailers: string[];
}

export interface Deal {
  id: string;
  retailer_id: string;
  product_id: string;
  price: number;
  start_date: string;
  end_date: string;
  retailer_name: string;
  product_name: string;
  product_size: string;
  category: string;
}

