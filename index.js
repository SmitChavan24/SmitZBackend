require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const server = require("http").createServer(app);
const socketIO = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");
const bycrypt = require("bcryptjs");
const port = process.env.PORT || 4000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const io = socketIO(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 1 * 60 * 1000,
    skipMiddlewares: true,
  },
});

io.on("connection", (socket) => {
  console.log("a user connected :D", socket.id);

  socket.on("secret_id", (id) => {
    console.log("secret_id", id);
    socket.broadcast.emit(id, { id, secr_id: socket.id });
  });
  socket.on("getSocketID", (data, callback) => {
    console.log("socket message", data);

    callback(socket.id);
  });
  socket.on("sendmessageinroom", (message, cb) => {
    message.socketid = socket.id;

    io.to(message.room).emit("userjoined", message);
  });

  socket.on("sendChoiceSps", (message, cb) => {
    message.socketid = socket.id;
    let updatedGameData = message.data.map((item) => {
      if (item.socketid == socket.id) {
        return { ...item, move: message.move };
      }
      return item;
    });

    io.to(message.room).emit("sendChoiceSps", updatedGameData);
  });

  socket.on("sendmove", (data) => {
    console.log(data.players.socketid);
    let socket = data.players.socketid;
    io.to(socket).emit("sendmove", data);
  });

  socket.on("setWinner", (data) => {
    io.to(data.room).emit("setWinner", data);
  });
  socket.on("setCurrentPlayer", (data) => {
    if (data[0].socketid) {
      let socket = data[0].socketid;
      let currentPlayerData = { ...data[0], modal: false };
      io.to(socket).emit("setCurrentPlayer", { currentPlayerData });
    }
  });

  socket.on("setSecondCurrentPlayer", (data) => {
    if (data[1].socketid) {
      let socket = data[1].socketid;
      let currentPlayerData = { ...data[1], modal: false };
      io.to(socket).emit("setSecondCurrentPlayer", { currentPlayerData });
    }
  });

  socket.on("joinroom", async (room, cb) => {
    console.log("joinroom", room.room, socket.id);
    const Room = room.room;
    const roomUsers = await io.in(Room).allSockets();
    if (roomUsers.size < 2) {
      let data = { Room, socketid: socket.id, room };
      socket.join(Room);
      io.to(Room).emit("userjoined", data);
    }
  });

  socket.on("leaveroom", (room, cb) => {
    console.log("leaveroom", room, socket.id);
    socket.leave(room);
    socket.to(room).emit("user_left", socket.id);
  });

  socket.on("leaveAll", (room) => {
    console.log("all users leave ", room);
    io.in(room).socketsLeave(room);
  });

  socket.on("privateRequest", (data, callback) => {
    console.log("privateRequest", data.id, data.message, data.room);

    socket.join(data.room);
    io.to(data.id).timeout(5000).emit("privateRequest", data);
  });

  socket.on("userReject", (data, callback) => {
    console.log("user rejected request", data);
    socket.broadcast.emit("userReject", data);
  });

  socket.on("disconnect", (data) => {
    socket.broadcast.emit("userLeft", { secr_id: socket.id });
    socket.disconnect();
    // console.log("🔥: A user disconnected", socket.adapter.rooms);
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
    password: bycrypt.hashSync("2311", 10),
  },
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
