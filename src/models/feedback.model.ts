export interface Feedback {
   id: string;
   userId: string;
   carId: string;
   rating: number;
   comment: string;
   createdAt: Date;
   updatedAt: Date;
}