import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KMA_DATA_TYPES } from '../constants/kma-vilage-fcst.constants';
import type { KmaDataType } from '../types/kma-vilage-fcst.types';

/** KMA API 응답 헤더 DTO */
export class KmaVilageFcstResponseHeaderDto {
  /** 처리 결과 코드 */
  @ApiProperty({ description: '응답 결과 코드', example: '00' })
  resultCode: string;

  /** 처리 결과 메시지 */
  @ApiProperty({ description: '응답 결과 메시지', example: 'NORMAL_SERVICE' })
  resultMsg: string;
}

/** 단기예보 항목 DTO */
export class KmaVilageFcstItemDto {
  /** 발표일(YYYYMMDD) */
  @ApiProperty({ example: '20260316' })
  baseDate: string;
  /** 발표시각(HHMM) */
  @ApiProperty({ example: '0200' })
  baseTime: string;
  /** 예보 카테고리(예: TMP, POP) */
  @ApiProperty({ example: 'TMP' })
  category: string;
  /** 예보일(YYYYMMDD) */
  @ApiProperty({ example: '20260316' })
  fcstDate: string;
  /** 예보시각(HHMM) */
  @ApiProperty({ example: '0300' })
  fcstTime: string;
  /** 예보값(문자열 원문 유지) */
  @ApiProperty({ example: '5' })
  fcstValue: string;
  /** 기상청 격자 X */
  @ApiProperty({ example: 60 })
  nx: number;
  /** 기상청 격자 Y */
  @ApiProperty({ example: 127 })
  ny: number;
}

/** KMA API 응답 본문 DTO */
export class KmaVilageFcstBodyDto {
  /** 응답 데이터 형식 */
  @ApiProperty({
    description: '응답 데이터 형식',
    enum: KMA_DATA_TYPES,
    example: 'JSON',
  })
  dataType: KmaDataType;
  /** 페이지 번호 */
  @ApiProperty({ example: 1 })
  pageNo: number;
  /** 페이지당 건수 */
  @ApiProperty({ example: 1000 })
  numOfRows: number;
  /** 전체 건수 */
  @ApiProperty({ example: 1 })
  totalCount: number;
  /** 예보 아이템 목록 */
  @ApiProperty({
    type: () => KmaVilageFcstItemDto,
    isArray: true,
    description: '단기예보 목록',
  })
  items: KmaVilageFcstItemDto[];
}

/** 단기예보 조회 응답 DTO */
export class KmaVilageFcstResponseDto {
  /** API 응답 헤더 */
  @ApiProperty({ type: () => KmaVilageFcstResponseHeaderDto })
  header: KmaVilageFcstResponseHeaderDto;

  /** API 응답 바디 */
  @ApiProperty({ type: () => KmaVilageFcstBodyDto })
  body: KmaVilageFcstBodyDto;

  @ApiPropertyOptional({
    description: '원본 외부 API 응답(payload)입니다.',
    type: 'object',
    additionalProperties: true,
  })
  raw?: unknown;
}
