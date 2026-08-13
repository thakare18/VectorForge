const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");

// UPDATED
const nodemailer = require("nodemailer");

// UPDATED
const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
);

// UPDATED
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            provider: "local"
        });

        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(201).json({
            success: true,
            message: "Registration successful.",
            token,
            user: {
    id: user._id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    avatar: user.avatar,
    createdAt: user.createdAt
}
        });
    } catch (error) {
        console.error("Register error:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (user.provider !== "local" || !user.password) {
            return res.status(400).json({
                success: false,
                message: `Please continue with ${user.provider} login.`
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
           user: {
    id: user._id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    avatar: user.avatar,
    createdAt: user.createdAt
}
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
};

const getMe = async (req, res) => {
    res.status(200).json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            provider: req.user.provider,
            avatar: req.user.avatar,
            createdAt: req.user.createdAt
        }
    });
};

// UPDATED
const googleLogin = (req, res) => {
    const authUrl = googleClient.generateAuthUrl({
        access_type: "offline",
        scope: [
            "openid",
            "email",
            "profile"
        ],
        prompt: "select_account"
    });

    res.redirect(authUrl);
};

// UPDATED
const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Google authorization code is missing."
            });
        }

        const { tokens } = await googleClient.getToken(code);

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const googleId = payload.sub;
        const email = payload.email?.toLowerCase().trim();
        const name = payload.name || "Google User";
        const avatar = payload.picture || null;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Google account email was not provided."
            });
        }

        let user = await User.findOne({
            provider: "google",
            providerId: googleId
        });

        if (!user) {
            const existingEmailUser = await User.findOne({
                email
            });

            if (existingEmailUser) {
                return res.status(409).json({
                    success: false,
                    message: `This email is already registered with ${existingEmailUser.provider} login.`
                });
            }

            user = await User.create({
                name,
                email,
                password: null,
                provider: "google",
                providerId: googleId,
                avatar
            });
        }

        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // UPDATED
// UPDATED
const frontendUrl =
    `${process.env.FRONTEND_URL}/oauth/callback?token=${encodeURIComponent(token)}&provider=google`;

res.redirect(frontendUrl);
    } catch (error) {
        console.error("Google OAuth error:", error);

        res.status(500).json({
            success: false,
            message: "Google authentication failed."
        });
    }
};

// UPDATED
const githubLogin = (req, res) => {
    const githubUrl =
        "https://github.com/login/oauth/authorize" +
        `?client_id=${process.env.GITHUB_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL)}` +
        `&scope=user:email`;

    res.redirect(githubUrl);
};

// UPDATED
const githubCallback = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "GitHub authorization code is missing."
            });
        }

        // UPDATED
        const tokenResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: process.env.GITHUB_CALLBACK_URL
                })
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            return res.status(401).json({
                success: false,
                message: "Unable to get GitHub access token."
            });
        }

        // UPDATED
        const githubUserResponse = await fetch(
            "https://api.github.com/user",
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    Accept: "application/vnd.github+json",
                    "User-Agent": "VectorForge"
                }
            }
        );

        const githubUser = await githubUserResponse.json();

        // UPDATED
        const emailResponse = await fetch(
            "https://api.github.com/user/emails",
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    Accept: "application/vnd.github+json",
                    "User-Agent": "VectorForge"
                }
            }
        );

        const emails = await emailResponse.json();

        const primaryEmail = emails.find(
            (email) => email.primary && email.verified
        );

        const email = primaryEmail?.email?.toLowerCase().trim();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Unable to get a verified GitHub email."
            });
        }

        const githubId = String(githubUser.id);
        const name = githubUser.name || githubUser.login || "GitHub User";
        const avatar = githubUser.avatar_url || null;

        // UPDATED
        let user = await User.findOne({
            provider: "github",
            providerId: githubId
        });

        if (!user) {
            const existingEmailUser = await User.findOne({
                email
            });

            if (existingEmailUser) {
                return res.status(409).json({
                    success: false,
                    message: `This email is already registered with ${existingEmailUser.provider} login.`
                });
            }

            user = await User.create({
                name,
                email,
                password: null,
                provider: "github",
                providerId: githubId,
                avatar
            });
        }

        // UPDATED
        const jwtToken = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // UPDATED
// UPDATED
const frontendUrl =
    `${process.env.FRONTEND_URL}/oauth/callback?token=${encodeURIComponent(jwtToken)}&provider=github`;

res.redirect(frontendUrl);

    } catch (error) {
        console.error("GitHub OAuth error:", error);

        res.status(500).json({
            success: false,
            message: "GitHub authentication failed."
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account exists, a reset link has been generated."
            });
        }

        if (user.provider !== "local" || !user.password) {
            return res.status(400).json({
                success: false,
                message: `Please continue with ${user.provider} login.`
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        const resetUrl =
            `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        console.log("Sending reset email to:", user.email);

        await transporter.sendMail({
            from: `"VectorForge" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "VectorForge - Password Reset",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                    <h2>VectorForge Password Reset</h2>

                    <p>Hello ${user.name || "User"},</p>

                    <p>
                        We received a request to reset your VectorForge password.
                    </p>

                    <p>
                        Click the button below to create a new password:
                    </p>

                    <a
                        href="${resetUrl}"
                        style="
                            display: inline-block;
                            padding: 12px 20px;
                            background: #ccff00;
                            color: #000000;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: bold;
                        "
                    >
                        Reset Password
                    </a>

                    <p style="margin-top: 20px;">
                        This reset link will expire in 15 minutes.
                    </p>

                    <p>
                        If you did not request this password reset,
                        you can safely ignore this email.
                    </p>

                    <p>
                        Regards,<br>
                        VectorForge Team
                    </p>
                </div>
            `
        });

        console.log("Reset email sent successfully");

        res.status(200).json({
            success: true,
            message: "Password reset link sent to your email."
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to process password reset request."
        });
    }
};

// UPDATED
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.provider = "local";

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successful."
        });
    } catch (error) {
        console.error("Reset password error:", error);

        res.status(500).json({
            success: false,
            message: "Password reset failed."
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword,
    googleLogin, 
    googleCallback,
    githubLogin,
    githubCallback
};