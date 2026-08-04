import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkExperienceDto {
  @ApiProperty()
  @IsString()
  company!: string;

  @ApiProperty()
  @IsString()
  role!: string;

  @ApiProperty()
  @IsString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class EducationDto {
  @ApiProperty()
  @IsString()
  institution!: string;

  @ApiProperty()
  @IsString()
  degree!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fieldOfStudy?: string;

  @ApiProperty()
  @IsString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;
}

export class CvIngestionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  headline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  availability?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  portfolioUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  githubUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  languages?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hobbies?: string;

  @ApiPropertyOptional({ type: [WorkExperienceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  @IsOptional()
  workExperiences?: WorkExperienceDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  @IsOptional()
  educations?: EducationDto[];
}
