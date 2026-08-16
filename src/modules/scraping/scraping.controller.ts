import { Controller, Post, UseGuards } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Scraping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('trigger')
  @ApiOperation({
    summary: 'Trigger manual scrape',
    description: 'Queues a scraping job to fetch jobs immediately.',
  })
  @ApiResponse({
    status: 201,
    description: 'Scraping job queued successfully.',
  })
  triggerManualScrape() {
    return this.scrapingService.triggerManualScrape();
  }
}
