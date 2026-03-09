import multer from "multer";

// dùng diskStorage tạm thời, Cloudinary sẽ upload từ file này
const storage = multer.diskStorage({});
const upload = multer({ storage });

export default upload;