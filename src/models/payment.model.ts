export interface Payment {
	id: string;
	userId: number;
	serviceId: number;
	relatedId: number;
	buyerId: number;	
	amount: number;
	orderId: string;
	description: string;
	returnUrl: string;
	cancelUrl: string;
	buyerName: string;
	buyerEmail: string;
	buyerPhone: string;
	buyerAddress?: string;
	items?: Array<{
		name: string;
		quantity: number;
		price: number;
		unit: string;
		taxPercentage: number;
	}>;
	invoice?: {
		buyerNotGetInvoice: boolean;
		taxPercentage: number;
	};
	expiredAt?: number; // in seconds
	signature?: string;
}		  		