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
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'Development server',
			},
			{
				url: 'https://electriccarmanagement-swp.up.railway.app',
				description: 'Production server',
			}
		],
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
	app.use(
		'/api-docs',
		swaggerUi.serve,
		swaggerUi.setup(specs, {
			explorer: true, // Cho phép bật explorer mode
			swaggerOptions: {
				filter: true, // ✅ Hiển thị ô search API
				displayRequestDuration: true, // Hiển thị thời gian thực thi
				// docExpansion: 'none', // Collapse tất cả API khi load
				persistAuthorization: true, // Giữ lại token JWT khi reload trang
			},
			customSiteTitle: 'Electric Car Management API Docs',
		}),
	);
}
