import express from 'express';
import dotenv from 'dotenv';
const cors = require('cors');
import bodyParser from 'body-parser';
import { testConnection } from './config/db';
import routes from './routes/index.route';
import { setupSwagger } from "./utils/swagger";

dotenv.config();

const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 3006;

app.use(express.json());


app.use(routes);

app.use(cors());

setupSwagger(app); 

app.listen(PORT, async () => {
  await testConnection();

  console.log(`🚀 Server pham gia lac running on http://localhost:${PORT}`);
  console.log(`📄 Swagger UI available at http://localhost:${PORT}/api-docs`);
});