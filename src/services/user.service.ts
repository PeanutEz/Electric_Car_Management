import pool from "../config/db";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";

export async function getAllUsers(){
    const [rows] = await pool.query('SELECT * FROM Users');
    return rows;
}

export async function registerUser(userData: User) {
    const { Email, Password, Status, Role_Id, First_Name, Middle_Name, Last_Name, Phone } = userData;

    const hashedPassword = await bcrypt.hash(Password, 10);

    const [result]: any = await pool.query(
        `INSERT INTO Users (Status, First_Name, Middle_Name, Last_Name, Email, Phone, Password, Role_Id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [Status, First_Name, Middle_Name, Last_Name, Email, Phone, hashedPassword, Role_Id]
    );

    return {
        id: result.insertId,
        email: Email,
        role: Role_Id,
    };
}

export async function loginUser(email: string, password: string) {
    const [rows]: any = await pool.query('select * from Users where email = ?', [email]);

    if (rows.length === 0) { 
      throw new Error("Email or password incorrect!");
    }

    const user = rows[0];
    
    console.log(rows);
    console.log(user);
    

    // console.log(password);
    console.log(user.Password);
    const isPasswordValid = await bcrypt.compare(password, user.Password);

    // const isPasswordValid = await bcrypt.compare('12345', '$2b$10$1V8aumGRyfe2qMITbxutku7gIXT/VTbfk.F.8CfqAjfbqsQNqsmSC');
    
    console.log(isPasswordValid);

    // if (!isPasswordValid) {
    //   throw new Error("Email or password incorrect!");
    // }

    return {
      id: user.id,       // sửa lại theo đúng tên cột trong DB
      email: user.email,
      role: user.role_id,
    };
}