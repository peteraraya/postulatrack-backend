import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get matched job offers',
    description:
      'Returns job offers matched with the user profile, ordered by match percentage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Matched job offers returned successfully.',
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
    description: 'Filter by company name',
  })
  @ApiQuery({
    name: 'workModel',
    required: false,
    type: String,
    description: 'Work modality (REMOTE, HYBRID, ON_SITE)',
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
  @ApiQuery({
    name: 'salaryMin',
    required: false,
    type: Number,
    description: 'Minimum salary expectation',
  })
  async getMatches(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('title') title?: string,
    @Query('location') location?: string,
    @Query('country') country?: string,
    @Query('company') company?: string,
    @Query('workModel') workModel?: string,
    @Query('skills') skills?: string | string[],
    @Query('experience') experience?: string,
    @Query('salaryMin') salaryMin?: number,
  ) {
    return this.recommendationService.getUserMatches(
      user.userId,
      {
        title,
        location,
        country,
        company,
        workModel,
        skills,
        experience,
        salaryMin,
      },
      page,
      limit,
    );
  }
}
