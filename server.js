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

/* ========================
   🔥 GITHUB AUTO DEPLOY (index.html)
======================== */
app.post("/update-site", async (req, res) => {
  try {
    const content = req.body.content;

    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/index.html`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Auto update from Nexora 🚀",
          content: Buffer.from(content).toString("base64"),
          branch: process.env.GITHUB_BRANCH || "main"
        }),
      }
    );

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Deploy failed" });
  }
});

/* ========================
   ✅ YENİ: GENEL DOSYA GÜNCELLEME (GITHUB API ile)
   → Her türlü dosyayı overwrite eder: index.html, style.css, script.js, server.js vs.
======================== */
app.post("/update-file", async (req, res) => {
  try {
    const { filename, content, branch } = req.body;

    // 1. Zorunlu alanları kontrol et
    if (!filename || !content) {
      return res.status(400).json({ error: "filename ve content zorunlu" });
    }

    // 2. GitHub API URL’i (örneğin /index.html, /style.css vs)
    const GH_URL = `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/${filename}`;

    // 3. Önce dosyanın hash/sha'sını almak için GET istek (varsa üstüne yaz,
    // yoksa yeni dosya yarat)
    const getRes = await fetch(GH_URL, {
      method: "GET",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    let sha = null;
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    // 4. PUT ile dosyayı güncelle (overwrite)
    const putRes = await fetch(GH_URL, {
      method: "PUT",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Auto update file: ${filename} 🚀`,
        content: Buffer.from(content).toString("base64"),
        branch: branch || process.env.GITHUB_BRANCH || "main",
        sha, // varsa eski versiyon hash'i, yoksa yeni dosya yaratılır
      }),
    });

    const data = await putRes.json();

    if (putRes.ok) {
      return res.json({
        message: "Dosya GitHub'a güncellendi",
        data,
      });
    } else {
      return res.status(putRes.status).json({
        error: "GitHub API hatası",
        data,
      });
    }
  } catch (err) {
    console.log("update-file error:", err);
    return res.status(500).json({ error: "Güncelleme başarısız: " + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
