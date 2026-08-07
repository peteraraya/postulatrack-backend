import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CvIngestionDto } from './dto/cv-ingestion.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiProduces,
  ApiBody,
} from '@nestjs/swagger';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { cloudinaryStorage } from '../../config/cloudinary.config';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieves the complete profile of the currently authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.profileService.getProfile(user.userId);
  }

  @Get('export/pdf')
  @ApiOperation({
    summary: 'Export profile as ATS-friendly PDF',
    description: 'Generates and downloads a professional, ATS-optimized PDF of the user profile.',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ 
    status: 200, 
    description: 'PDF successfully generated.',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async exportPdf(@CurrentUser() user: AuthUser, @Res() res: any) {
    const pdfBuffer = await this.profileService.exportPdf(user.userId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=resume.pdf',
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }

  @Post('cv')
  @UseInterceptors(
    FileInterceptor('cvDocument', {
      storage: cloudinaryStorage,
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only PDF and Word documents are allowed'),
            false,
          );
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'JSON string of CvIngestionDto',
        },
        cvDocument: {
          type: 'string',
          format: 'binary',
          description: 'CV Document (PDF or Word)',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload CV and update profile',
    description:
      'Updates the user profile via multipart/form-data containing JSON string in "profile" and optional CV file in "cvDocument".',
  })
  @ApiResponse({ status: 201, description: 'Profile successfully updated.' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid data or file.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async ingestCv(
    @CurrentUser() user: AuthUser,
    @Body('profile') profileString: string,
    @UploadedFile() cvDocument?: Express.Multer.File,
  ) {
    let profileData: CvIngestionDto;
    try {
      // Si el frontend envía JSON stringificado en el campo profile
      profileData =
        typeof profileString === 'string'
          ? JSON.parse(profileString)
          : profileString;
    } catch (e) {
      throw new BadRequestException('El campo profile debe ser un JSON válido');
    }

    // Si se subió un archivo, Cloudinary nos devuelve la URL en la propiedad path
    const fileUrl = cvDocument ? cvDocument.path : undefined;

    return this.profileService.ingestCv(user.userId, profileData, fileUrl);
  }
}
