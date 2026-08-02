import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health Check',
    description: 'Returns API status.',
  })
  @ApiResponse({ status: 200, description: 'API is running.' })
  getRoot() {
    return {
      status: 'OK',
      message: 'Welcome to PostulaTrack API',
      docs: '/api/docs',
    };
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
