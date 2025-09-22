import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Electric Car Management API',
			version: '1.0.0',
			description: 'API documentation for Electric Car Management System',
		},
		// servers: [
		// 	{
		// 		url: 'http://localhost:3000',
		// 		description: 'Development server',
		// 	},
		// ],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
		},
		security: [
			{
				bearerAuth: [],
			},
		],
	},
	apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
