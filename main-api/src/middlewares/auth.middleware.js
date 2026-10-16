import jwt from 'jsonwebtoken';

// Guard 1: Check if user is logged in
export const authenticate = (req, res, next) => {
    try {
        // Postman automatically req.cookies.token bhejega agar login successful tha
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ success: false, error: 'Access denied. Please login first.' });
        }

        // Decode token using our secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Ab req.user me userId aur role available hai

        next(); // Security check pass, aage jane do
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token. Please login again.' });
    }
};

// Guard 2: Check if user is an ADMIN
export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Access denied. Admin rights required.' });
    }
    next();
};

// Guard 3: Check if student is APPROVED (Un-approved students cannot see dashboard)
export const requireApproved = (req, res, next) => {
    // Check if role is USER and status is APPROVED
    if (req.user.role === 'USER' && req.user.status !== 'APPROVED') {
        return res.status(403).json({
            success: false,
            error: 'Your account is still pending approval from the Admin.'
        });
    }
    next();
};