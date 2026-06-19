import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import dns from 'dns';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import capsuleRoutes from './routes/capsuleRoutes';
import { notFound, errorHandler } from './middlewares/errorMiddleware';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'CapsuleX API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/capsules', capsuleRoutes);

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
