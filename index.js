const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const Document = mongoose.model("Document", new mongoose.Schema({
  _id: String,
  data: Object,
}));

const defaultData = { content: "" };

io.on("connection", (socket) => {
  socket.on("get-document", async (docId) => {
    const document = await Document.findById(docId) || await Document.create({ _id: docId, data: defaultData });
    socket.join(docId);
    socket.emit("load-document", document.data);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(docId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(docId, { data });
    });
  });
});

server.listen(5000, () => console.log("Server running at http://localhost:5000"));
