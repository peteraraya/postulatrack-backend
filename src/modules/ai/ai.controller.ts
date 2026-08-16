import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-message')
  @ApiOperation({
    summary: 'Generate message for recruiter',
    description:
      'Generates a cover letter / intro message for a specific application using AI.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { applicationId: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Message generated successfully.' })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  generateMessage(
    @Body('applicationId') applicationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiService.generateMessage(applicationId, user.userId);
  }

  @Post('analyze-offer')
  @ApiOperation({
    summary: 'Analyze offer match with user profile',
    description:
      'Analyzes a job offer against the user profile to provide interview tips and insights.',
  })
  @ApiBody({
    schema: { type: 'object', properties: { offerId: { type: 'string' } } },
  })
  @ApiResponse({ status: 201, description: 'Analysis generated successfully.' })
  @ApiResponse({ status: 404, description: 'Offer not found.' })
  analyzeOffer(
    @Body('offerId') offerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiService.analyzeOffer(offerId, user.userId);
  }

  @Post('translate')
  @ApiOperation({
    summary: 'Translate message',
    description: 'Translates a given text to a target language using AI.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        targetLanguage: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Text translated successfully.' })
  translateMessage(
    @Body('text') text: string,
    @Body('targetLanguage') targetLanguage: string,
  ) {
    return this.aiService.translateMessage(text, targetLanguage);
  }

  @Post('interview-prep')
  @ApiOperation({
    summary: 'Generate interview preparation questions',
    description:
      'Generates customized interview questions based on user profile and job offer.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { applicationId: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Interview questions generated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  generateInterviewPrep(
    @Body('applicationId') applicationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.aiService.generateInterviewPrep(applicationId, user.userId);
  }

  @Get('general-interview-prep')
  @ApiOperation({
    summary: 'Generate general interview preparation',
    description:
      'Generates interview questions based on the general user profile without being tied to a specific job offer.',
  })
  @ApiResponse({
    status: 200,
    description: 'General interview questions generated successfully.',
  })
  generateGeneralInterviewPrep(@CurrentUser() user: AuthUser) {
    return this.aiService.generateGeneralInterviewPrep(user.userId);
  }

  @Post('chat/groq')
  @ApiOperation({
    summary: 'Proxy endpoint to chat with Groq AI (Llama)',
    description:
      'Sends a prompt to Groq API securely from the backend to hide the API key.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        systemPrompt: { type: 'string', nullable: true },
      },
      required: ['prompt'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'AI response successfully generated.',
  })
  async chatGroq(
    @Body('prompt') prompt: string,
    @Body('systemPrompt') systemPrompt?: string,
  ) {
    const response = await this.aiService.callGroq(prompt, systemPrompt);
    return { response };
  }

  @Post('chat/gemini')
  @ApiOperation({
    summary: 'Proxy endpoint to chat with Google Gemini',
    description:
      'Sends a prompt to Gemini API securely from the backend. Supports file uploads (like PDF) in base64 format.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        systemPrompt: { type: 'string', nullable: true },
        fileBase64: {
          type: 'string',
          nullable: true,
          description: 'Base64 string of the file (e.g. PDF)',
        },
        fileMimeType: {
          type: 'string',
          nullable: true,
          description: 'MIME type of the file (e.g. application/pdf)',
        },
      },
      required: ['prompt'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'AI response successfully generated.',
  })
  async chatGemini(
    @Body('prompt') prompt: string,
    @Body('systemPrompt') systemPrompt?: string,
    @Body('fileBase64') fileBase64?: string,
    @Body('fileMimeType') fileMimeType?: string,
  ) {
    const response = await this.aiService.callGemini(
      prompt,
      systemPrompt,
      fileBase64,
      fileMimeType,
    );
    return { response };
  }

  @Post('chat/openrouter')
  @ApiOperation({
    summary: 'Proxy endpoint to chat with OpenRouter',
    description:
      'Sends a prompt to OpenRouter API securely. OpenRouter provides access to dozens of free open-source models like Llama, Gemma, and Zephyr.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        systemPrompt: { type: 'string', nullable: true },
        model: {
          type: 'string',
          nullable: true,
          description: 'Optional. Defaults to google/gemma-2-9b-it:free',
        },
      },
      required: ['prompt'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'AI response successfully generated.',
  })
  async chatOpenRouter(
    @Body('prompt') prompt: string,
    @Body('systemPrompt') systemPrompt?: string,
    @Body('model') model?: string,
  ) {
    const response = await this.aiService.callOpenRouter(
      prompt,
      systemPrompt,
      model,
    );
    return { response };
  }
}
