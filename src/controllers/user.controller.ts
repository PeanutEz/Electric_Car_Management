import { Request, Response } from "express";
import { registerUser, loginUser, getAllUsers, getUserById } from "../services/user.service";
import { get } from "http";

export async function userDetail(req: Request, res: Response) {
    try{
        const id = parseInt(req.params.id, 10);
        
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid user id"});
        }

        const user = await getUserById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found"});
        }

        return res.status(200).json(user);
    } catch {
        return res.status(500).json({ message: "Internal Server Error"});
    }
}

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