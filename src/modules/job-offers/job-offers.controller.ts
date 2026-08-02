import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JobOffersService } from './job-offers.service';
import {
  ApiTags,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Job Offers')
@Controller('job-offers')
export class JobOffersController {
  constructor(private readonly jobOffersService: JobOffersService) {}

  @Get()
  @ApiOperation({
    summary: 'List job offers',
    description:
      'Retrieves a paginated list of job offers with optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of job offers retrieved successfully.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'title',
    required: false,
    type: String,
    description: 'Filter by job title',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'Filter by job location',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    type: String,
    description: 'Filter by country',
  })
  @ApiQuery({
    name: 'company',
    required: false,
    type: String,
    description: 'Filter by company',
  })
  @ApiQuery({
    name: 'workModel',
    required: false,
    type: String,
    description: 'Filter by work model (REMOTE, HYBRID, ON_SITE)',
  })
  @ApiQuery({
    name: 'isRemote',
    required: false,
    type: Boolean,
    description: 'Filter by remote availability (legacy)',
  })
  @ApiQuery({
    name: 'skills',
    required: false,
    type: [String],
    description: 'Filter by required skills',
  })
  @ApiQuery({
    name: 'experience',
    required: false,
    type: String,
    description: 'Filter by seniority or experience level',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'salaryMin',
    required: false,
    type: Number,
    description: 'Minimum salary expectation',
  })
  @ApiQuery({
    name: 'favorites',
    required: false,
    type: Boolean,
    description: 'Filter only saved/favorite jobs',
  })
  async getOffers(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('title') title?: string,
    @Query('company') company?: string,
    @Query('location') location?: string,
    @Query('country') country?: string,
    @Query('workModel') workModel?: string,
    @Query('isRemote') isRemote?: boolean,
    @Query('skills') skills?: string | string[],
    @Query('experience') experience?: string,
    @Query('salaryMin') salaryMin?: number,
    @Query('favorites') favorites?: boolean,
  ) {
    return this.jobOffersService.getJobOffers(
      {
        title,
        company,
        location,
        country,
        workModel,
        isRemote,
        skills,
        experience,
        salaryMin,
        favorites,
      },
      page,
      limit,
      user.userId,
    );
  }

  @Post(':id/favorite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Save job offer',
    description: 'Saves a job offer to the user favorites list.',
  })
  @ApiParam({ name: 'id', description: 'ID of the job offer', type: String })
  @ApiResponse({ status: 201, description: 'Job offer saved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async saveFavorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.jobOffersService.saveFavorite(user.userId, id);
  }

  @Delete(':id/favorite')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Remove saved job offer',
    description: 'Removes a job offer from the user favorites list.',
  })
  @ApiParam({ name: 'id', description: 'ID of the job offer', type: String })
  @ApiResponse({
    status: 200,
    description: 'Job offer removed from favorites.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async removeFavorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.jobOffersService.removeFavorite(user.userId, id);
  }
}
