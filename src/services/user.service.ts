import pool from "../config/db";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { generateAccessToken } from "../middleware/AuthMiddleware";

export async function getAllUsers(){
    const [rows] = await pool.query('SELECT * FROM Users');
    return rows;
}

export async function registerUser(userData: User) {
    const { Email, Password, Status, Role_Id, First_Name, Middle_Name, Last_Name, Phone } = userData;
    const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!reg.test(Email)) {
        throw new Error('Invalid email format');
    }
    if (Password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    // Kiểm tra xem email đã tồn tại chưa
    const [existingUsers]: any = await pool.query('SELECT * FROM Users WHERE Email = ?', [Email]);
    if (existingUsers.length > 0) {
        throw new Error('Email already exists');
    }
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
    const [rows]: any = await pool.query('SELECT * FROM Users WHERE Email = ?', [email]);
    const user = rows[0];
    console.log(user);
    if (!user) {
        throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.Password);
    console.log(password, user.Password);
    if (!isPasswordValid) {
        throw new Error('Invalid password');
    }

    const token = generateAccessToken({ id: user.Id, email: user.Email, role: user.Role_Id });

    return {
        id: user.Id,
        email: user.Email,
        role: user.Role_Id,
        token,
    };
}