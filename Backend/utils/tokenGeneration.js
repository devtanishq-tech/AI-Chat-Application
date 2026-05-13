import jwt from "jsonwebtoken";
const Tokengeneration = (userID) => {
  return jwt.sign({ id: userID }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
export default Tokengeneration;
