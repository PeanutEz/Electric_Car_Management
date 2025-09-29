export interface Payment {
	id: string;
	amount: number;
	orderId: string;
	description: string;
	status: string;
	returnUrl: string;
	cancelUrl: string;
	customerEmail?: string;
	customerPhone?: string;
}
