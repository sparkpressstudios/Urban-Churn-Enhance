import * as crypto from "node:crypto";

export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString("hex");
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            resolve(`${salt}:${key.toString("hex")}`);
        });
    });
}

export async function verifyPassword(
    password: string,
    stored: string,
): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const [salt, hash] = stored.split(":");
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            resolve(key.toString("hex") === hash);
        });
    });
}
