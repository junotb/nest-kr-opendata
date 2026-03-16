import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { KmaVilageFcstRequestDto } from './dtos/kma-vilage-fcst-request.dto';
import { KmaVilageFcstResponseDto } from './dtos/kma-vilage-fcst-response.dto';
import { KmaVilageFcstApiClient } from './providers/kma-vilage-fcst-api-client';
import {
  KMA_DEFAULT_DATA_TYPE,
  KMA_DEFAULT_NUM_OF_ROWS,
  KMA_DEFAULT_NX,
  KMA_DEFAULT_NY,
  KMA_DEFAULT_PAGE_NO,
  KMA_PROVIDER,
  KMA_VILAGE_FCST_RETENTION_DAYS,
} from './constants/kma-vilage-fcst.constants';
import {
  convertLatLonToKmaGrid,
  type KmaBaseDateTime,
  type KmaGridPoint,
  getLatestVilageFcstBaseDateTime,
} from './utils/kma-vilage-fcst.util';
import {
  API_RAW_EVENT_REPOSITORY,
  type ApiRawEventRepository,
} from './repositories/api-raw-event.repository';
import {
  createRequestSignature,
  stringifyRawPayload,
} from './utils/api-raw-event.util';
import type { ApiRawResponseContentType } from './entities/api-raw-event.entity';

/**
 * 단기예보 요청을 정규화하고 외부 API 호출/원문 저장을 오케스트레이션하는 서비스.
 */
@Injectable()
export class KmaVilageFcstService {
  private readonly logger = new Logger(KmaVilageFcstService.name);

  constructor(
    private readonly apiClient: KmaVilageFcstApiClient,
    @Inject(API_RAW_EVENT_REPOSITORY)
    private readonly rawEventRepository: ApiRawEventRepository,
  ) {}

  /** 현재 시각 기준 가장 최신의 baseDate/baseTime을 계산한다. */
  calculateBaseDateTime(now: Date = new Date()): KmaBaseDateTime {
    return getLatestVilageFcstBaseDateTime(now);
  }

  /** 위경도를 기상청 격자 좌표(nx, ny)로 변환한다. */
  convertToGrid(lat: number, lon: number): KmaGridPoint {
    return convertLatLonToKmaGrid(lat, lon);
  }

  /**
   * 단기예보를 조회하고 성공/실패 여부와 무관하게 원문 이벤트를 저장한다.
   *
   * @throws BadRequestException 운영 환경에서 필수 파라미터가 누락된 경우
   */
  async getForecast(
    request: KmaVilageFcstRequestDto,
  ): Promise<KmaVilageFcstResponseDto> {
    const normalizedRequest = this.normalizeRequest(request);
    const requestedAt = new Date();
    await this.rawEventRepository.deleteExpired(requestedAt);

    try {
      const response = await this.apiClient.getVilageFcst(normalizedRequest);
      await this.persistRawEvent({
        request: normalizedRequest,
        requestedAt,
        statusCode: this.getStatusCodeFromResponse(response),
        isSuccess: true,
        responseRawValue: response.raw ?? response,
      });
      return response;
    } catch (error) {
      await this.persistRawEvent({
        request: normalizedRequest,
        requestedAt,
        statusCode: this.getStatusCodeFromError(error),
        isSuccess: false,
        responseRawValue: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  /** 환경별 기본값 정책을 반영해 조회 요청 파라미터를 정규화한다. */
  private normalizeRequest(
    request: KmaVilageFcstRequestDto,
  ): KmaVilageFcstRequestDto {
    const hasBaseDate = typeof request.baseDate === 'string';
    const hasBaseTime = typeof request.baseTime === 'string';
    const hasNx = Number.isInteger(request.nx);
    const hasNy = Number.isInteger(request.ny);

    if (this.isProductionEnv()) {
      const missingParams = [
        !hasBaseDate ? 'baseDate' : null,
        !hasBaseTime ? 'baseTime' : null,
        !hasNx ? 'nx' : null,
        !hasNy ? 'ny' : null,
      ].filter((param): param is string => param !== null);

      if (missingParams.length > 0) {
        throw new BadRequestException(
          `운영 환경에서는 ${missingParams.join(', ')} 파라미터가 필수입니다.`,
        );
      }
    }

    const calculatedBaseDateTime =
      hasBaseDate && hasBaseTime ? null : this.calculateBaseDateTime();
    const shouldUseDefaultGrid = !hasNx || !hasNy;

    return {
      ...request,
      baseDate: calculatedBaseDateTime?.baseDate ?? request.baseDate,
      baseTime: calculatedBaseDateTime?.baseTime ?? request.baseTime,
      nx: shouldUseDefaultGrid ? KMA_DEFAULT_NX : request.nx,
      ny: shouldUseDefaultGrid ? KMA_DEFAULT_NY : request.ny,
      pageNo: request.pageNo ?? KMA_DEFAULT_PAGE_NO,
      numOfRows: request.numOfRows ?? KMA_DEFAULT_NUM_OF_ROWS,
      dataType: request.dataType ?? KMA_DEFAULT_DATA_TYPE,
    };
  }

  /** 운영 환경 여부를 반환한다. */
  private isProductionEnv(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * 요청/응답 원문을 영속 저장소에 upsert한다.
   * 저장 실패는 비즈니스 실패로 간주하지 않고 경고 로그만 남긴다.
   */
  private async persistRawEvent(options: {
    request: KmaVilageFcstRequestDto;
    requestedAt: Date;
    statusCode: number | null;
    isSuccess: boolean;
    responseRawValue: unknown;
  }): Promise<void> {
    const { request, requestedAt, statusCode, isSuccess, responseRawValue } =
      options;
    const now = new Date();
    const expiresAt = new Date(
      requestedAt.getTime() +
        KMA_VILAGE_FCST_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    try {
      await this.rawEventRepository.upsert({
        provider: KMA_PROVIDER,
        endpoint: 'vilage-fcst',
        requestSignature: createRequestSignature(request),
        requestedAt,
        statusCode,
        isSuccess,
        requestRaw: stringifyRawPayload(request),
        responseRaw: stringifyRawPayload(responseRawValue),
        responseContentType: this.getResponseContentType(request.dataType),
        baseDate: request.baseDate ?? '',
        baseTime: request.baseTime ?? '',
        nx: request.nx ?? KMA_DEFAULT_NX,
        ny: request.ny ?? KMA_DEFAULT_NY,
        expiresAt,
      });
    } catch (error) {
      this.logger.warn(
        `원문 저장 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.debug(
        JSON.stringify({
          requestedAt: now.toISOString(),
          provider: KMA_PROVIDER,
          endpoint: 'vilage-fcst',
        }),
      );
    }
  }

  /** 요청한 dataType에 대응하는 MIME type을 반환한다. */
  private getResponseContentType(dataType?: string): ApiRawResponseContentType {
    return dataType === 'XML' ? 'application/xml' : 'application/json';
  }

  /** 외부 API 비즈니스 resultCode를 저장용 statusCode로 변환한다. */
  private getStatusCodeFromResponse(
    response: KmaVilageFcstResponseDto,
  ): number {
    const resultCode = Number(response.header.resultCode);
    return Number.isNaN(resultCode) ? 200 : resultCode;
  }

  /** Nest HttpException인 경우 HTTP status를 추출한다. */
  private getStatusCodeFromError(error: unknown): number | null {
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    return null;
  }
}
