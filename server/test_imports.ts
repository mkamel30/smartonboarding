import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
console.log('Core imports OK');

import { PrismaClient } from '@prisma/client';
console.log('Prisma import OK');

import { uploadMerchantDocs, listRequestFiles } from './driveService';
console.log('Drive Service import OK');

const app = express();
const port = 3004;
app.listen(port, () => {
    console.log(`IMPORT TEST SERVER RUNNING ON http://localhost:${port}`);
});
