const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ========================
   MongoDB
======================== */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

/* ========================
   MODELS
======================== */
const User = mongoose.model("User", {
  username: String,
  password: String
});

const Product = mongoose.model("Product", {
  name: String,
  price: Number,
  owner: String
});

/* ========================
   AUTH (LOGIN / REGISTER)
======================== */
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  let user = await User.findOne({ username });

  if (!user) {
    // register
    user = new User({ username, password });
    await user.save();
  } else {
    // login kontrol
    if (user.password !== password) {
      return res.json({ message: "Wrong password" });
    }
  }

  res.json({
    token: "ok",
    username: user.username
  });
});

/* ========================
   PRODUCTS
======================== */
app.get("/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post("/products", async (req, res) => {
  const { name, price, owner } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Missing data" });
  }

  const newProduct = new Product({
    name,
    price,
    owner
  });

  await newProduct.save();
  res.json(newProduct);
});

app.delete("/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

/* ========================
   START
======================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));
