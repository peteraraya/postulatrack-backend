import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JobAlertsService } from './job-alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Job Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-alerts')
export class JobAlertsController {
  constructor(private readonly jobAlertsService: JobAlertsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create job alert',
    description: 'Creates a job alert based on current filters.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filters: {
          type: 'string',
          example: 'title=Frontend&experience=Senior',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Job alert created successfully.' })
  createAlert(@CurrentUser() user: AuthUser, @Body('filters') filters: string) {
    return this.jobAlertsService.createAlert(user.userId, filters);
  }
}
