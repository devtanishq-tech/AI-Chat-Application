import jwt from "jsonwebtoken";
const authMiddleware = async (req, res, next) => {
  try {
    let { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ message: "unauthorised Access" });
    }
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decode;
    next();
  } catch (err) {
    console.log(err);
    res.status(401).json({ message: "INVALID TOKEN" });
  }
};
export default authMiddleware;
