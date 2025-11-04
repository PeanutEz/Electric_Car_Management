export interface Report {
	id: number;
	auction_id: number; // ID của auction bị lỗi
	user_id: number; // Người bị lỗi (seller hoặc winner)
	reported_by?: number; // Người báo cáo (admin)
	reason: string; // Lý do báo cáo
	fault_type: 'seller' | 'winner'; // Ai có lỗi
	created_at: Date;
}

export interface CreateReportDTO {
	auction_id: number;
	user_id: number; // Người có lỗi
	reported_by?: number;
	reason: string;
	fault_type: 'seller' | 'winner';
}
