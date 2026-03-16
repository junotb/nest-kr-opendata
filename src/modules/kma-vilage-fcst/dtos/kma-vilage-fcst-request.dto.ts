import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  KMA_DATA_TYPES,
  KMA_DEFAULT_DATA_TYPE,
  KMA_DEFAULT_NUM_OF_ROWS,
  KMA_DEFAULT_PAGE_NO,
} from '../constants/kma-vilage-fcst.constants';
import type { KmaDataType } from '../types/kma-vilage-fcst.types';

/** 단기예보 조회 요청 Query DTO */
export class KmaVilageFcstRequestDto {
  /** 발표일(YYYYMMDD) */
  @ApiPropertyOptional({
    description:
      '발표일(YYYYMMDD). 운영 환경에서는 필수이며, 비운영 환경에서는 자동 보정될 수 있습니다.',
    example: '20260316',
    pattern: '^\\d{8}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'baseDate는 YYYYMMDD 형식이어야 합니다.' })
  baseDate?: string;

  /** 발표시각(HHMM) */
  @ApiPropertyOptional({
    description:
      '발표시각(HHMM). 운영 환경에서는 필수이며, 비운영 환경에서는 자동 보정될 수 있습니다.',
    example: '0200',
    pattern: '^\\d{4}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'baseTime은 HHMM 형식이어야 합니다.' })
  baseTime?: string;

  /** 기상청 격자 X */
  @ApiPropertyOptional({
    description:
      '기상청 격자 X 좌표. 운영 환경에서는 필수이며, 비운영 환경에서는 기본값이 사용됩니다.',
    example: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  nx?: number;

  /** 기상청 격자 Y */
  @ApiPropertyOptional({
    description:
      '기상청 격자 Y 좌표. 운영 환경에서는 필수이며, 비운영 환경에서는 기본값이 사용됩니다.',
    example: 127,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ny?: number;

  /** 페이지 번호 */
  @ApiPropertyOptional({
    description: '페이지 번호',
    example: KMA_DEFAULT_PAGE_NO,
    minimum: 1,
    default: KMA_DEFAULT_PAGE_NO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo: number = KMA_DEFAULT_PAGE_NO;

  /** 조회 건수 */
  @ApiPropertyOptional({
    description: '한 번에 조회할 건수(최대 1000)',
    example: KMA_DEFAULT_NUM_OF_ROWS,
    minimum: 1,
    maximum: 1000,
    default: KMA_DEFAULT_NUM_OF_ROWS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  numOfRows: number = KMA_DEFAULT_NUM_OF_ROWS;

  /** 응답 데이터 형식 */
  @ApiPropertyOptional({
    description: '응답 데이터 형식',
    enum: KMA_DATA_TYPES,
    example: KMA_DEFAULT_DATA_TYPE,
    default: KMA_DEFAULT_DATA_TYPE,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn([...KMA_DATA_TYPES])
  dataType: KmaDataType = KMA_DEFAULT_DATA_TYPE;
}
