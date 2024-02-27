const express = require("express");
const cors = require("cors");
const app = express();
const server = require("http").createServer(app);
const socketIO = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");
const bycrypt = require("bcryptjs");
const port = 4000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
const io = socketIO(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("a user connected :D", socket.id);

  socket.on("secret_id", (name) => {
    console.log(name);
    socket.broadcast.emit(name, { name, secr_id: socket.id });
  });

  socket.on("privateRequest", (data, callback) => {
    // Send the message to the specified socket ID
    console.log(data.id, data.message);
    io.to(data.id).timeout(5000).emit("privateRequestCatch", {
      fromSocketId: data.id,
      message: data.message,
    });
  });
  socket.on("disconnect", () => {
    socket.disconnect();
    console.log("🔥: A user disconnected");
  });
  socket.on("error", (data) => {
    console.log("socket error");
  });
});

// socket.on("send_message", (data, callback) => {
//   console.log("socket message", data);
//   callback(data);
// });

instrument(io, {
  auth: true,
  mode: "development",
  auth: {
    type: "basic",
    username: "smit",
    password: bycrypt.hashSync("2311", 10), // "changeit" encrypted with bcrypt
  },
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// const express = require("express");
// const app = express();
// const server = require("http").createServer(app);
// const io = require("socket.io")(server);
// const port = 4000;

// io.on("connection", (socket) => {
//   console.log("a user connected successfully", socket.id);
// });

// server.listen(port, () => console.log(`${port} is actively running`));
