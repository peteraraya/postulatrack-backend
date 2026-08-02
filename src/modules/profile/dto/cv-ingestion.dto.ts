import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ExperienceDto {
  @ApiProperty()
  @IsString()
  company!: string;

  @ApiProperty()
  @IsString()
  position!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

class EducationDto {
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
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class CvIngestionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  headline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  experience?: string;

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
  portfolioUrl?: string;

  @ApiPropertyOptional({ type: [ExperienceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  @IsOptional()
  experiences?: ExperienceDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  @IsOptional()
  educations?: EducationDto[];
}
