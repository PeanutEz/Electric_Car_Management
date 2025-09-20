import { Request, Response } from "express";
import { registerUser, loginUser, getAllUsers } from "../services/user.service";

export async function listUsers(req: Request, res: Response) {
    try {
    const users = await getAllUsers();
    res.status(200).json({
        success: true,
        users,
    });
} catch (error: any) {
    res.status(500).json({
        success: false,
        message: error.message,
    });
}
   
}

export async function register(req: Request, res: Response) {
    try {
        const userData = req.body; // dữ liệu từ client gửi lên
        const newUser = await registerUser(userData);
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: newUser,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const user = await loginUser(email, password);
        res.status(200).json({
            success: true,
            message: "Login successful",
            user,
        });
    } catch (error: any) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
}