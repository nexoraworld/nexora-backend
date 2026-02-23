const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* ========================
   MongoDB Bağlantısı
======================== */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch((err) => console.log(err));

/* ========================
   Product Modeli
======================== */
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }
});

const Product = mongoose.model("Product", productSchema);

/* ========================
   Test Route
======================== */
app.get("/", (req, res) => {
  res.send("Backend çalışıyor 🚀");
});

/* ========================
   Ürün Listeleme (GET)
======================== */
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ========================
   Ürün Ekleme (POST)
======================== */
app.post("/products", async (req, res) => {
  try {
    const newProduct = new Product({
      name: req.body.name,
      price: req.body.price
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ========================
   Ürün Güncelleme (PUT)
======================== */
app.put("/products/:id", async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ========================
   Ürün Silme (DELETE)
======================== */
app.delete("/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Ürün silindi" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
