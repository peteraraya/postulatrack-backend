import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  UpdateNotesDto,
  CreateManualApplicationDto,
  UpdateInterviewDateDto,
} from './dto/application.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new application',
    description:
      'Creates a new application for a job offer for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Application successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@CurrentUser() user: AuthUser, @Body() data: CreateApplicationDto) {
    return this.applicationsService.create(user.userId, data);
  }

  @Get('upcoming-interviews')
  @ApiOperation({
    summary: 'Get upcoming interviews',
    description: 'Retrieves all applications with future interview dates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming interviews retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getUpcomingInterviews(@CurrentUser() user: AuthUser) {
    return this.applicationsService.getUpcomingInterviews(user.userId);
  }

  @Post('extract-url')
  @ApiOperation({
    summary: 'Extract data from URL',
    description:
      'Scrapes basic job offer info (title, company, location) from a given URL.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://linkedin.com/...' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Data extracted successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  extractUrl(@Body('url') url: string) {
    return this.applicationsService.extractUrl(url);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get application statistics',
    description:
      'Retrieves statistics about the user applications grouped by status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application statistics retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.applicationsService.getStats(user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user applications',
    description:
      'Retrieves all job applications submitted by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of applications retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.applicationsService.findAll(user.userId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update application status',
    description:
      'Updates the status (and optionally adds notes) for a specific application.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the application',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Application status successfully updated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() data: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, user.userId, data);
  }

  @Patch(':id/notes')
  @ApiOperation({
    summary: 'Update application notes',
    description: 'Updates the personal notes for a specific application.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the application',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Application notes successfully updated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  updateNotes(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() data: UpdateNotesDto,
  ) {
    return this.applicationsService.updateNotes(id, user.userId, data);
  }

  @Patch(':id/interview')
  @ApiOperation({
    summary: 'Update application interview date',
    description: 'Updates the interview date for a specific application.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the application',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Application interview date successfully updated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  updateInterviewDate(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() data: UpdateInterviewDateDto,
  ) {
    return this.applicationsService.updateInterviewDate(
      id,
      user.userId,
      data.interviewDate,
    );
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Create manual application',
    description:
      'Creates an application for a job offer found outside the platform.',
  })
  @ApiResponse({
    status: 201,
    description: 'Manual application successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createManual(
    @CurrentUser() user: AuthUser,
    @Body() data: CreateManualApplicationDto,
  ) {
    return this.applicationsService.createManual(user.userId, data);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete application',
    description: 'Permanently deletes an application from the user dashboard.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the application',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Application successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.applicationsService.remove(id, user.userId);
  }
}
