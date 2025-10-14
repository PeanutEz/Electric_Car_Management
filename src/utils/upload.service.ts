import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

// ✅ Single file
export const uploadImage = async (
	fileBuffer: Buffer,
): Promise<UploadApiResponse> => {
	return new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream({ folder: 'demo-node-ts' }, (error, result) => {
				if (error || !result) {
					reject(error);
				} else {
					resolve(result);
				}
			})
			.end(fileBuffer);
	});
};

// ✅ Multiple files
export const uploadImages = async (
	fileBuffers: Buffer[],
): Promise<UploadApiResponse[]> => {
	return Promise.all(fileBuffers.map((buffer) => uploadImage(buffer)));
};
