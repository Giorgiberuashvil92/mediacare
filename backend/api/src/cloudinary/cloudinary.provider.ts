import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY = 'CLOUDINARY';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  useFactory: () => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dauu18uk1',
      api_key: process.env.CLOUDINARY_API_KEY || '788671615293794',
      api_secret:
        process.env.CLOUDINARY_API_SECRET || 'QgEfRaUd5LVsEby40jcMghGg-F4',
      secure: true,
    });
    return cloudinary;
  },
};
