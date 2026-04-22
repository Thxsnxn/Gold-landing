export interface GoldPriceRaw {
  buy: number;
  sell: number;
  updatedAt: string;
}

export interface GoldApiResponse {
  success: boolean;
  buy: number;
  sell: number;
  ornament: number;
  updatedAt: string;
}
