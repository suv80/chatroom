var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');

var roomList = {}; //房间列表，包含房间用户信息
var userList = {}; //用户列表，包含用户信息

app.use(express.static(__dirname + '/public'));

app.all('*', function(req, res) {
    res.sendfile('index.html');
});

io.on('connection', function(socket) {
    var requrl = socket.request.headers.referer; //取出请求地址
    var roomNum = url.parse(requrl).path; //取出请求地址中的pathname
    roomNum = roomNum.replace(/\//ig, ''); //整理pathname，当做房间号
    var userId = socket.id.replace(/\/\#/ig, ''); //获取用户ID

    //如果没有房间，创建房间
    if (!roomList[roomNum]) {
        roomList[roomNum] = {}
    }

    //将用户保存在指定房间内
    roomList[roomNum][userId] = {
        userId: userId,
        userName: userId
    };

    //将用户保存在用户信息中
    userList[userId] = {
        roomNum: roomNum
    }

    console.info('userList', userList);
    console.info('roomList', roomList);

    //用户加入房间
    socket.join(roomNum);

    var msg = {
        userId: 0,
        userName: '系统',
        msg: userId + '进入房间'
    };

    //用户进入后，欢迎语
    io.to(userList[userId].roomNum).emit('chat message', msg);
    //发送新的用户清单
    io.to(userList[userId].roomNum).emit('user list', roomList[roomNum]);

    //消息事件监听
    socket.on('chat message', function(msg) {
        var rn = userList[userId].roomNum;
        var userName = roomList[rn][userId].userName;

        var msg = {
            userId: userId,
            userName: userName,
            msg: msg
        };

        io.to(userList[userId].roomNum).emit('chat message', msg);

        console.info('rn:', rn);
        console.info('roomList[roomNum]:', roomList[roomNum]);

        var rlist = roomList[roomNum];

        io.to(userList[userId].roomNum).emit('user list', rlist);
    });

    //失去连接监听
    socket.on('disconnect', function(socket) {
        /**失去连接后的事件处理：
         **消除用户列表当前用户信息
         **消除房间列表当前用户信息
         */

        //从用户列表数组从取出用户所对应的房间信息
        var roomNum = userList[userId].roomNum

        delete userList[userId];
        delete roomList[roomNum][userId];

        var msg = {
            userId: 0,
            userName: '系统',
            msg: userId + '退出房间'
        };

        io.to(roomNum).emit('chat message', msg);
        io.to(roomNum).emit('user list', roomList[roomNum]);
    });
});



http.listen(3000, function() {
    console.log('listening on *:3000');
});
