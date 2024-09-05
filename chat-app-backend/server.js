const express = require('express');
const cors = require('cors')
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors())
const server = http.createServer(app);
const io = socketIo(server);


// Middleware
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chat-app', { useNewUrlParser: true, useUnifiedTopology: true });

// Define User model
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
}));

// Define Message model

const Message = mongoose.model('Message', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    content: String,
    sender: String, 
    edited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }));
  

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.sendStatus(401);

  jwt.verify(token, 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ username });
      
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(400).send({ error: 'Invalid credentials' });
      }
  
      const token = jwt.sign({ id: user._id }, 'secret', { expiresIn: '1h' }); 
      
      console.log("okdecode", user._id , user.username , token)
      res.json({
        user_id: user._id,
        user_name: user.username,
        token
      });
    } catch (err) {
      res.status(500).send({ error: 'Server error' });
    }
  });

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();
  res.sendStatus(201);
});

app.get('/messages', async (req, res) => {
    try {
      const messages = await Message.find().sort({ createdAt: -1 }).limit(50); 
      console.log("gett", messages)
      res.json(messages);
    } catch (err) {
      res.status(500).send('Error fetching messages');
    }
  });

  app.put('/message/:id', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
  
    try {
      const message = await Message.findById(id);
      if (!message) return res.status(404).send('Message not found');
  
      message.content = content;
      message.edited = true;
      await message.save();
  
      // Emit an update event if using socket.io
      // io.emit('message updated', message);
  
      res.json(message);
    } catch (err) {
      res.status(500).send('Server error');
    }
  });

  app.delete('/message/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
        console.log("message id", id);
      const message = await Message.findById(id);
      if (!message) return res.status(404).send('Message not found');
      
      console.log("MESS", message)
      await message.deleteOne({_id : id});
      res.send('Message deleted');
    } catch (err) {
      res.status(500).send('Server error');
    }
  });

// Socket.IO setup

io.on('connection', (socket) => {
    console.log('New client connected');
  
    socket.on('chat message', async (msg) => {
      try {
        const user = await User.findById(msg.userId); // Retrieve user details by ID
        if (!user) return;
  
        const message = new Message({ 
          userId: msg.userId, 
          content: msg.content, 
          sender: msg.sender 
        });
        console.log("sss", message)
        await message.save();
        io.emit('chat message', message); 
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });
  
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
  

server.listen(5000, () => console.log('Server running on port 5000'));
