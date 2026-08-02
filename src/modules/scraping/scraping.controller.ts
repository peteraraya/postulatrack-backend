import { Controller, Post } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Scraping')
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
