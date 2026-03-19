const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "YOUR_SUPER_SECRET_KEY"; // bunu Render ortam değişkenine taşı
const MONGO_URI = process.env.MONGO_URI;

/* ========================
   MongoDB Bağlantısı
======================== */
mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch((err) => console.log(err));

/* ========================
   User Modeli
======================== */
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});
const User = mongoose.model("User", userSchema);

/* ========================
   Product Modeli
======================== */
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  owner: String
});
const Product = mongoose.model("Product", productSchema);

/* ========================
   Auth Routes
======================== */
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Enter both" });
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ message: "User registered" });
  } catch (err) {
    res.status(400).json({ message: "Username taken" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: "User not found" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Wrong password" });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

/* ========================
   Middleware (JWT Verify)
======================== */
const verifyToken = (req, res, next) => {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(401).json({ message: "No token" });
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* ========================
   Product Routes
======================== */
app.get("/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post("/products", verifyToken, async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) return res.status(400).json({ message: "Enter all fields" });
  const product = new Product({ name, price, owner: req.user.username });
  await product.save();
  res.json(product);
});

app.delete("/products/:id", verifyToken, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Not found" });
  if (product.owner !== req.user.username) return res.status(403).json({ message: "Not allowed" });
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
