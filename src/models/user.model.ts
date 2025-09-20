export interface User {
  Id?: number;
  Status: string;
  First_Name?: string;
  Middle_Name?: string;
  Last_Name?: string;
  Date_Of_Birth?: Date;
  Email: string;
  Phone: string;
  Address?: string;
  CCCD?: string;
  Reputation?: number;
  Total_Credit?: number;
  Password: string;
  Is_New?: number;
  Role_Id: number;
  Created_At?: Date;
}