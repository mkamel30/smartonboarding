import express from 'express';

const app = express();
const port = 3003;

app.get('/', (req, res) => {
    res.send('Test server is running on 3003');
});

app.listen(port, () => {
    console.log(`TEST SERVER RUNNING ON http://localhost:${port}`);
});
