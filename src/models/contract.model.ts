export interface Contract {
    id?: number;
    contract_code: string;
    seller_id: number;
    buyer_id: number;
    product_id: number;
    deposit_amount: number;
    vehicle_price: number;
    commission_percent: number;
    dispute_city: string;
    status: string;
    url: string;
    created_at: Date;
    updated_at: Date;
}
