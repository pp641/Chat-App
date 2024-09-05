import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Button, TextField, Typography, IconButton, List, ListItem, ListItemText, Menu, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
});

interface Message {
  _id: string;
  content: string;
  sender: string;
  edited: boolean;
}



const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');



  const fetchMessages = async () => {
    try {
      const response = await axios.get('http://localhost:5000/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };


  useEffect(() => {
    fetchMessages();

    socket.on('chat message', (msg: Message) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    socket.on('message updated', (msg: Message) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) => (message._id === msg._id ? msg : message))
      );
    });

    socket.on('message deleted', (id: string) => {
        console.log("id got", id)
      setMessages((prevMessages) => prevMessages.filter((message) => message._id !== id));
    });

    return () => {
      socket.off('chat message');
      socket.off('message updated');
      socket.off('message deleted');
    };
  }, []);

  const handleSend = () => {
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('user_name');
    socket.emit('chat message', { content: message,  userId : userId , sender : userName  });
    setMessage('');
  };

  const handleEdit = async () => {
    if (selectedMessage) {
      try {
        const response = await axios.put(`http://localhost:5000/message/${selectedMessage._id}`, {
          content: editContent,
        });
        setSelectedMessage(null);
        setEditContent('');
        fetchMessages();

      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/message/${id}`)
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const getCurrentUserCheck = (msg : object | any)  => {
    console.log("ok"  , localStorage.getItem('user_id'))
    return msg.userId  === localStorage.getItem('user_id');
  }

  return (
    <div>
      <List>
        {messages.map((msg) => (   
          <ListItem sx={{backgroundColor : getCurrentUserCheck(msg) ? "lightblue" : "lightyellow"  , margin : "0.5em"}}    key={msg._id}>
            <ListItemText
              primary={
                <Typography variant="body2">
                  <strong>{msg.sender.toLowerCase()}:</strong> {msg.content} {msg.edited && <em>(edited)</em>}
                </Typography>
              }
            />
            <IconButton
              aria-label="more"
              onClick={(e) => {
                setAnchorEl(e.currentTarget);
                setSelectedMessage(msg);
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => {
                setEditContent(msg.content);
                setAnchorEl(null);
              }}>
                <EditIcon /> Edit
              </MenuItem>
              <MenuItem onClick={() => handleDelete(msg._id)}>
                <DeleteIcon /> Delete
              </MenuItem>
            </Menu>
          </ListItem>
        ))}
      </List>
      {selectedMessage  && (
        <div>
          <TextField
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            label="Edit Message"
            fullWidth
          />
          <Button onClick={handleEdit}>Save</Button>
        </div>
      )}
      <TextField
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
      />
      <Button onClick={handleSend}>Send</Button>
    </div>
  );
};

export default Chat;
