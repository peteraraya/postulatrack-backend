import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('/api/docs', 302)
  @ApiOperation({
    summary: 'Redirects to API Docs',
    description: 'Redirects the root URL to the Swagger API documentation.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to /api/docs' })
  getRoot() {
    // Redirige al Swagger al acceder a la raíz para evitar 404 si no hay frontend
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check API status',
    description:
      'Returns a simple greeting message to verify that the API is up and running.',
  })
  @ApiResponse({
    status: 200,
    description: 'API is running successfully.',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
