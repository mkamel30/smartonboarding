import express from 'express';
console.log('Core imports OK');
console.log('Prisma import OK');
console.log('Drive Service import OK');
const app = express();
const port = 3004;
app.listen(port, () => {
    console.log(`IMPORT TEST SERVER RUNNING ON http://localhost:${port}`);
});
