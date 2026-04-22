import { google } from 'googleapis';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import sharp from 'sharp';
dotenv.config();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });
/**
 * Gets or creates a folder under a parent
 */
async function getOrCreateFolder(parentID, folderName) {
    const searchResponse = await drive.files.list({
        q: `name = '${folderName}' and '${parentID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        return searchResponse.data.files[0].id;
    }
    const createResponse = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentID],
        },
        fields: 'id',
        supportsAllDrives: true,
    });
    return createResponse.data.id;
}
/**
 * Compresses an image if it exceeds a certain size or is a common image format
 */
async function processFile(file) {
    const isImage = file.mimetype.startsWith('image/') && !file.mimetype.includes('svg');
    if (isImage) {
        try {
            // Resize and compress to JPEG if it's an image
            const compressedBuffer = await sharp(file.buffer)
                .resize({ width: 2000, withoutEnlargement: true }) // Max width 2000px
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer();
            return { data: compressedBuffer, mimetype: 'image/jpeg' };
        }
        catch (err) {
            console.error('Sharp compression failed, using original:', err);
        }
    }
    // Default: return as stream
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);
    return { data: stream, mimetype: file.mimetype };
}
/**
 * Uploads multiple files individually to Drive with professional naming
 */
export async function uploadMerchantDocs(params) {
    const { requestId, branchName, merchantName, files, docTypes } = params;
    try {
        const branchFolderId = await getOrCreateFolder(ROOT_FOLDER_ID, branchName);
        const folderName = `${requestId} - ${merchantName}`;
        const requestFolderId = await getOrCreateFolder(branchFolderId, folderName);
        const results = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const docType = docTypes[i] || 'Document';
            const { data, mimetype } = await processFile(file);
            // Clean merchant name for filename
            const cleanMerchantName = merchantName.replace(/[^a-z0-9\u0600-\u06FF_-]/gi, '_');
            const cleanDocType = docType.replace(/[^a-z0-9\u0600-\u06FF_-]/gi, '_');
            const fileName = `${cleanDocType}_${cleanMerchantName}${mimetype === 'image/jpeg' && !file.originalname.toLowerCase().endsWith('.jpg') ? '.jpg' : ''}`;
            const uploadResponse = await drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [requestFolderId],
                },
                media: {
                    mimeType: mimetype,
                    body: data instanceof Buffer ? Readable.from(data) : data,
                },
                fields: 'id, webViewLink, name',
                supportsAllDrives: true,
            });
            results.push({
                fileId: uploadResponse.data.id,
                link: uploadResponse.data.webViewLink,
                name: uploadResponse.data.name
            });
        }
        return {
            files: results,
            folderId: requestFolderId,
            folderLink: `https://drive.google.com/drive/folders/${requestFolderId}`
        };
    }
    catch (error) {
        console.error('Drive Upload Error [Details]:', {
            message: error.message,
            requestId,
            merchantName,
            stack: error.stack,
            code: error.code,
            errors: error.errors
        });
        throw error;
    }
}
/**
 * Lists files in a request folder
 */
export async function listRequestFiles(requestId, branchName) {
    try {
        const branchFolderId = await getOrCreateFolder(ROOT_FOLDER_ID, branchName);
        const folderSearch = await drive.files.list({
            q: `name contains '${requestId}' and '${branchFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        if (!folderSearch.data.files || folderSearch.data.files.length === 0) {
            return [];
        }
        const folderId = folderSearch.data.files[0].id;
        const filesResponse = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, iconLink)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        return (filesResponse.data.files || []).map(f => ({ ...f, folderId }));
    }
    catch (error) {
        console.error('List Files Error:', error);
        throw error;
    }
}
