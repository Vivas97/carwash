import { v2 as cloudinary } from "cloudinary"

const url = process.env.CLOUDINARY_URL
if (url && url.length > 0) {
  cloudinary.config({ secure: true })
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export default cloudinary
