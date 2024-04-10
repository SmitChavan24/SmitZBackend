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
  pingInterval: 1500,
  pingTimeout: 1500,
  // connectionStateRecovery: {
  //   maxDisconnectionDuration: 1 * 60 * 1000,
  //   skipMiddlewares: true,
  // },
});

const OnlineNameSpace = io.of("/Online");

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

  socket.on("chat", (message, cb) => {
    message.socketid = socket.id;

    io.to(message.room).emit("chat", message);
  });

  socket.on("sendChoiceSps", (message, cb) => {
    message.socketid = socket.id;
    console.log(message, "senChoiceSps");
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

  socket.on("leaveAll", (room) => {
    console.log("all users leave ", room);
    io.in(room).socketsLeave(room);
    socket.disconnect(true);
  });

  socket.on("kick", async (id) => {
    console.log(" user kick ", id);
    const sockets = await io.in(id).fetchSockets();
    for (const socket of sockets) {
      console.log("socket id kick", socket.id);
      socket.disconnect(true);
    }
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
////////////////////////////=========================================

var queue = [];

var findPeerForLoneSocket = function (socket) {
  if (queue.length > 0) {
    var peer = queue.pop();
    var room = socket.id + "#" + peer.id;
    console.log(room, "roomsada");
    var RandomIndex = Math.floor(Math.random() * 4);
    peer.join(room);
    socket.join(room);
    peer.emit("gamestart", {
      room: room,
      gameIndex: RandomIndex,
    });
    socket.emit("gamestart", {
      room: room,
      gameIndex: RandomIndex,
    });
  } else {
    queue.push(socket);
  }
};

OnlineNameSpace.on("connection", (socket) => {
  // socket.join("room1");
  // orderNamespace.to("room1").emit("hello");

  console.log(socket.id + " connected");
  findPeerForLoneSocket(socket);

  socket.on("getCount", (data, callback) => {
    const count2 = io.of("/Online").sockets.size;
    callback(count2);
  });

  socket.on("getSocketIDOnline", (data, callback) => {
    console.log("socket message", data);

    callback(socket.id);
  });

  socket.on("setCurrentPlayerOnline", (data) => {
    // console.log(data);
    if (data[0].socketid) {
      let socket = data[0].socketid;
      let currentPlayerData = { ...data[0], modal: false };
      OnlineNameSpace.to(socket).emit("setCurrentPlayerOnline", {
        currentPlayerData,
      });
    }
  });

  socket.on("setSecondCurrentPlayerOnline", (data) => {
    if (data[1].socketid) {
      let socket = data[1].socketid;
      let currentPlayerData = { ...data[1], modal: false };
      OnlineNameSpace.to(socket).emit("setSecondCurrentPlayerOnline", {
        currentPlayerData,
      });
    }
  });

  socket.on("sendmoveOnline", (data) => {
    // console.log(data.players.socketid);
    let socket = data.players.socketid;
    OnlineNameSpace.to(socket).emit("sendmoveOnline", data);
  });

  socket.on("getplayersinroom", (message, cb) => {
    message.socketid = socket.id;
    OnlineNameSpace.to(message.room).emit("Setplayersinroom", message);
  });
  socket.on("checkAnswers", (message, cb) => {
    OnlineNameSpace.to(message.RoomData.room).emit("checkAnswers", message);
  });
  socket.on("setWinnerOnline", (data) => {
    OnlineNameSpace.to(data.room).emit("setWinnerOnline", data);
  });
  socket.on("leaveroomOnline", (room) => {
    OnlineNameSpace.in(room.room).socketsLeave(room.room);
    socket.disconnect(true);
  });
  socket.on("disconnectroomUser", (room) => {
    queue.pop();
    socket.disconnect(true);
  });

  socket.on("sendOnlineChoiceSps", (message, cb) => {
    let updatedGameData = message.data.map((item) => {
      if (item.socketid == socket.id) {
        return { ...item, move: message.move };
      }
      return item;
    });

    OnlineNameSpace.to(message.room).emit(
      "sendOnlineChoiceSps",
      updatedGameData
    );
  });

  socket.on("disconnect", (data) => {
    let index = queue.indexOf(socket);
    if (index !== -1) {
      queue.splice(index, 1);
    }
    socket.broadcast.emit("userLeft", { secr_id: socket.id });
    socket.disconnect();
    // console.log("🔥: A user disconnected", socket.adapter.rooms);
  });

  socket.on("error", (data) => {
    console.log("socket error");
  });
});

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
