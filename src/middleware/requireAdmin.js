
import jwt from "jsonwebtoken";

export default function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ message: "Admin login required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
}
