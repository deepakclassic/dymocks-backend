import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

dotenv.config();

// eslint-disable-next-line import/first
import routes from './src/routes';

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// passing request to route
app.use('/api', routes);

/** Creating Server */

const PORT: string | number = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
