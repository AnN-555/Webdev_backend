import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.GAMES_DB_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

export default connectDB;